/* 408 计算机组成原理可视化课堂 · 交互实验室
 * 每个 init 先检查页面是否存在对应容器，不存在直接返回。
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }
  function hex(v, width) {
    var s = (v >>> 0).toString(16).toUpperCase();
    while (s.length < width) s = "0" + s;
    return "0x" + s;
  }
  function bin(v, width) {
    var s = (v >>> 0).toString(2);
    while (s.length < width) s = "0" + s;
    return s.slice(-width);
  }
  function card(label, val, sub) {
    return '<div class="res-card"><div class="r-label">' + label + '</div>' +
      '<div class="r-val">' + val + '</div>' +
      (sub ? '<div class="r-sub">' + sub + '</div>' : "") + '</div>';
  }
  function parseAddr(str) {
    var s = (str || "").trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]+$/.test(s)) return NaN;
    return parseInt(s, 16) >>> 0;
  }
  function fmt(x, digits) {
    if (!isFinite(x)) return "—";
    if (Math.abs(x) >= 1e6 || (Math.abs(x) > 0 && Math.abs(x) < 1e-3)) return x.toExponential(2);
    return Number(x.toFixed(digits === undefined ? 4 : digits)).toString();
  }

  /* ══════════ 1. 性能指标换算 ══════════ */
  (function initPerf() {
    var box = $("lab-perf");
    if (!box) return;
    var freq = $("perf-freq"), cpi = $("perf-cpi"), inst = $("perf-inst");
    var out = $("perf-out"), kv = $("perf-kv"), note = $("perf-note");
    function calc() {
      var f = num(freq, 2), c = num(cpi, 4), n = num(inst, 1000); // GHz, CPI, 百万条
      if (f <= 0 || c <= 0 || n <= 0) {
        note.textContent = "主频、CPI、指令数都必须是正数。";
        note.className = "lab-note bad";
        return;
      }
      var clockNs = 1 / f;                    // GHz → ns
      var timeS = (n * 1e6) * c / (f * 1e9);  // 指令数 × CPI / 主频
      var mips = f * 1000 / c;                // GHz → MHz
      out.innerHTML =
        card("时钟周期", fmt(clockNs) + " ns", "1 / 主频") +
        card("CPU 执行时间", fmt(timeS) + " s", "指令数 × CPI / 主频") +
        card("MIPS", fmt(mips) + " 百万条/秒", "主频(MHz) / CPI") +
        card("每秒指令数", fmt(mips * 1e6) + " 条/s", "MIPS × 10⁶");
      kv.innerHTML =
        "<b>代入：</b>T = " + n + "×10⁶ × " + c + " / (" + f + "×10⁹) = " + fmt(timeS) + " s<br>" +
        "<b>注意：</b>主频提高 1 倍，若 CPI 不变，时间减半；但 CPI 常随主频/流水线变化，不能直接外推。";
      note.textContent = "计算完成。试试把 CPI 从 4 改成 2，观察执行时间如何变化。";
      note.className = "lab-note good";
    }
    box.querySelector("#perf-go").addEventListener("click", calc);
    box.querySelector("#perf-reset").addEventListener("click", function () {
      freq.value = "2.0"; cpi.value = "4"; inst.value = "100"; calc();
    });
    calc();
  })();

  /* ══════════ 2. IEEE 754 转换 ══════════ */
  (function initFloat() {
    var box = $("lab-float");
    if (!box) return;
    var dec = $("f32-dec"), type = $("f32-type"), hexIn = $("f32-hex");
    var out = $("f32-out"), note = $("f32-note");

    function bitsRow(sign, exp, frac, expBits, fracBits) {
      var html = '<div class="bit-row">';
      html += '<span class="bit sign">' + sign + '</span>';
      for (var i = 0; i < expBits; i++) html += '<span class="bit exp">' + exp[i] + '</span>';
      for (var j = 0; j < fracBits; j++) html += '<span class="bit frac">' + frac[j] + '</span>';
      html += '</div><div class="bit-label"><span style="width:24px">S</span>' +
        '<span style="width:' + (expBits * 26) + 'px">阶码 E（' + expBits + ' 位）</span>' +
        '<span style="width:' + (fracBits * 26) + 'px">尾数 M（' + fracBits + ' 位）</span></div>';
      return html;
    }

    function render32(value) {
      var buf = new ArrayBuffer(4);
      var dv = new DataView(buf);
      dv.setFloat32(0, value, false);
      var u = dv.getUint32(0, false);
      var s = (u >>> 31) & 1;
      var e = (u >>> 23) & 0xFF;
      var f = u & 0x7FFFFF;
      var expBin = bin(e, 8), fracBin = bin(f, 23);
      var outHtml = bitsRow(s, expBin, fracBin, 8, 23) +
        '<div class="lab-out">' +
        card("十六进制", hex(u, 8), "32 位编码") +
        card("符号 S", s, s ? "负数" : "正数") +
        card("阶码 E", e, "偏置 127，实际指数 " + (e === 0 ? "1−127（非规格化）" : e === 255 ? "特殊" : e - 127)) +
        card("尾数 M", "0x" + f.toString(16).toUpperCase(), "小数部分 " + fracBin.length + " 位") +
        '</div>';
      var formula;
      if (e === 255) formula = f === 0 ? "±∞（无穷大）" : "NaN（非数）";
      else if (e === 0) formula = (s ? "−" : "") + "(0." + fracBin + ")₂ × 2⁻¹²⁶（非规格化数）";
      else formula = (s ? "−" : "") + "(1." + fracBin + ")₂ × 2^(" + e + "−127)";
      outHtml += '<div class="lab-kv"><b>按位权展开：</b>V = ' + formula + '<br>' +
        '<b>十进制：</b>' + (isFinite(value) ? value : String(value)) + '</div>';
      out.innerHTML = outHtml;
      hexIn.value = "0x" + hex(u, 8).slice(2);
    }

    function render64(value) {
      var buf = new ArrayBuffer(8);
      var dv = new DataView(buf);
      dv.setFloat64(0, value, false);
      var u = dv.getBigUint64(0, false);
      var s = Number((u >> 63n) & 1n);
      var e = Number((u >> 52n) & 0x7FFn);
      var f = u & ((1n << 52n) - 1n);
      var expBin = e.toString(2).padStart(11, "0");
      var fracBin = f.toString(2).padStart(52, "0");
      var hexStr = u.toString(16).toUpperCase().padStart(16, "0");
      var outHtml = bitsRow(s, expBin, fracBin, 11, 52) +
        '<div class="lab-out">' +
        card("十六进制", "0x" + hexStr, "64 位编码") +
        card("符号 S", s, s ? "负数" : "正数") +
        card("阶码 E", e, "偏置 1023，实际指数 " + (e === 0 ? "1−1023（非规格化）" : e === 2047 ? "特殊" : e - 1023)) +
        card("尾数 M", "0x" + f.toString(16).toUpperCase(), "小数部分 52 位") +
        '</div>';
      var formula;
      if (e === 2047) formula = f === 0n ? "±∞（无穷大）" : "NaN（非数）";
      else if (e === 0) formula = (s ? "−" : "") + "(0." + fracBin + ")₂ × 2⁻¹⁰²²（非规格化数）";
      else formula = (s ? "−" : "") + "(1." + fracBin + ")₂ × 2^(" + e + "−1023)";
      outHtml += '<div class="lab-kv"><b>按位权展开：</b>V = ' + formula + '<br>' +
        '<b>十进制：</b>' + (isFinite(value) ? value : String(value)) + '</div>';
      out.innerHTML = outHtml;
      hexIn.value = "0x" + hexStr;
    }

    function fromDecimal() {
      var v = parseFloat(dec.value);
      if (!isFinite(v)) { note.textContent = "请输入一个有限十进制数，例如 -12.375。"; note.className = "lab-note bad"; return; }
      if (type.value === "32") render32(v); else render64(v);
      note.textContent = "已按 " + (type.value === "32" ? "单精度" : "双精度") + " 编码。修改十进制数后再点一次转换。";
      note.className = "lab-note good";
    }
    function fromHex() {
      var s = (hexIn.value || "").trim().replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]+$/.test(s)) { note.textContent = "十六进制格式不正确。"; note.className = "lab-note bad"; return; }
      if (type.value === "32") {
        if (s.length > 8) s = s.slice(-8);
        var u = parseInt(s, 16) >>> 0;
        var buf = new ArrayBuffer(4), dv = new DataView(buf);
        dv.setUint32(0, u, false);
        var v = dv.getFloat32(0, false);
        render32(v);
        dec.value = String(v);
        note.textContent = "已从 32 位编码解析出十进制值。";
      } else {
        if (s.length > 16) s = s.slice(-16);
        var u64 = BigInt("0x" + s);
        var buf8 = new ArrayBuffer(8), dv8 = new DataView(buf8);
        dv8.setBigUint64(0, u64, false);
        var v8 = dv8.getFloat64(0, false);
        render64(v8);
        dec.value = String(v8);
        note.textContent = "已从 64 位编码解析出十进制值。";
      }
      note.className = "lab-note good";
    }

    box.querySelector("#f32-go").addEventListener("click", fromDecimal);
    box.querySelector("#f32-rev-go").addEventListener("click", fromHex);
    type.addEventListener("change", fromDecimal);
    fromDecimal();
  })();

  /* ══════════ 3. 补码加法与溢出 ══════════ */
  (function initTwos() {
    var box = $("lab-twos");
    if (!box) return;
    var aIn = $("tc-a"), bIn = $("tc-b"), bitsSel = $("tc-bits");
    var out = $("tc-out"), note = $("tc-note");
    function toBits(v, n) {
      var u = v < 0 ? (v + (1 << n)) : v;
      return (u & ((1 << n) - 1)).toString(2).padStart(n, "0");
    }
    function calc() {
      var n = Number(bitsSel.value);
      var a = Math.trunc(num(aIn, 0)), b = Math.trunc(num(bIn, 0));
      var min = -(1 << (n - 1)), max = (1 << (n - 1)) - 1;
      if (a < min || a > max || b < min || b > max) {
        note.textContent = n + " 位补码的输入范围是 " + min + " ~ " + max + "。";
        note.className = "lab-note bad";
        return;
      }
      var ab = toBits(a, n), bb = toBits(b, n);
      var ae = ab[0] + ab, be = bb[0] + bb;     // 双符号位（n+1 位）
      var sum = (parseInt(ae, 2) + parseInt(be, 2)).toString(2);
      sum = sum.padStart(n + 1, "0").slice(-(n + 1));
      var ds = sum.slice(0, 2);
      var overflow = ds === "01" ? "正溢出" : ds === "10" ? "负溢出" : "无溢出";
      var lower = sum.slice(1);                  // 去掉最高位，得到 n 位结果
      var signed = parseInt(lower, 2);
      if (signed >= (1 << (n - 1))) signed -= (1 << n);
      function colorBits(s) {
        return s.split("").map(function (ch, i) {
          var cls = i < 2 ? "sign" : "frac";
          return '<span class="bit ' + cls + '">' + ch + '</span>';
        }).join("");
      }
      out.innerHTML =
        '<div class="lab-kv"><b>A = </b>' + a + ' → 补码 ' + ab + '<br>' +
        '<b>B = </b>' + b + ' → 补码 ' + bb + '</div>' +
        '<div class="bit-row">' + colorBits(ae) + '</div>' +
        '<div class="bit-row">' + colorBits(be) + '</div>' +
        '<div style="text-align:center;color:var(--ink-3);font-size:12px">— 相加 —</div>' +
        '<div class="bit-row">' + colorBits(sum) + '</div>' +
        '<div class="lab-out">' +
        card("双符号位", ds, ds === "00" ? "正数，无溢出" : ds === "11" ? "负数，无溢出" : "溢出") +
        card("结果（低 " + n + " 位）", signed, overflow === "无溢出" ? "十进制真值" : "溢出，结果无效") +
        card("溢出判断", overflow, "01 正溢 / 10 负溢") +
        '</div>';
      note.textContent = overflow === "无溢出" ? "本次加法未溢出。" : "发生" + overflow + "：两个同号数相加，结果符号与它们相反。";
      note.className = "lab-note " + (overflow === "无溢出" ? "good" : "bad");
    }
    box.querySelector("#tc-go").addEventListener("click", calc);
    bitsSel.addEventListener("change", calc);
    calc();
  })();

  /* ══════════ 4. Cache 映射与命中模拟 ══════════ */
  (function initCache() {
    var box = $("lab-cache");
    if (!box) return;
    var waySel = $("cache-way"), addrIn = $("cache-addr");
    var out = $("cache-out"), note = $("cache-note");
    var CAP = 32 * 1024, BLOCK = 64;
    var lines = CAP / BLOCK;      // 512
    var clock = 0;
    var sets = {};

    function config() {
      var ways = Number(waySel.value);
      var setCount = lines / ways;
      return {
        ways: ways,
        setCount: setCount,
        indexBits: Math.round(Math.log2(setCount)),
        offsetBits: Math.round(Math.log2(BLOCK)),
        tagBits: 32 - Math.round(Math.log2(setCount)) - Math.round(Math.log2(BLOCK))
      };
    }
    function reset() {
      sets = {};
      clock = 0;
      out.innerHTML = "";
      note.textContent = "Cache 已清空（容量 32 KB，块 64 B，共 " + lines + " 行）。输入地址后点“访问”。";
      note.className = "lab-note";
      renderConfig();
    }
    function renderConfig() {
      var c = config();
      var info = $("cache-config");
      if (info) {
        info.innerHTML = "组数 = " + c.setCount + " · 每组 " + c.ways + " 路 · " +
          "offset " + c.offsetBits + " 位 · index " + c.indexBits + " 位 · tag " + c.tagBits + " 位";
      }
    }
    function access() {
      var addr = parseAddr(addrIn.value);
      if (!isFinite(addr)) { note.textContent = "地址格式不正确，请输入十六进制，如 0x00001234。"; note.className = "lab-note bad"; return; }
      var c = config();
      var offset = addr & (BLOCK - 1);
      var index = (addr >>> c.offsetBits) & (c.setCount - 1);
      var tag = addr >>> (c.offsetBits + c.indexBits);
      if (!sets[index]) sets[index] = [];
      var arr = sets[index];
      clock++;
      var hitWay = -1;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].valid && arr[i].tag === tag) { hitWay = i; break; }
      }
      var wasHit = hitWay >= 0;
      var evicted = -1;
      if (wasHit) {
        arr[hitWay].used = clock;
      } else {
        var slot = -1;
        for (var j = 0; j < c.ways; j++) {
          if (!arr[j] || !arr[j].valid) { slot = j; break; }
        }
        if (slot < 0) {
          var oldest = Infinity;
          for (var k = 0; k < c.ways; k++) {
            if (arr[k].used < oldest) { oldest = arr[k].used; slot = k; }
          }
          evicted = slot;
        }
        arr[slot] = { valid: true, tag: tag, used: clock };
        hitWay = slot;
      }
      /* 位域可视化 */
      var binAddr = bin(addr, 32);
      var tagBin = binAddr.slice(0, c.tagBits);
      var idxBin = binAddr.slice(c.tagBits, c.tagBits + c.indexBits);
      var offBin = binAddr.slice(c.tagBits + c.indexBits);
      function bitsOf(s, cls) {
        return s.split("").map(function (ch) { return '<span class="bit ' + cls + '">' + ch + '</span>'; }).join("");
      }
      var html = '<div class="lab-kv"><b>地址：</b>' + hex(addr, 8) + ' = ' + binAddr + '</div>' +
        '<div class="bit-row">' + bitsOf(tagBin, "frac") + bitsOf(idxBin, "exp") + bitsOf(offBin, "sign") + '</div>' +
        '<div class="bit-label"><span style="width:' + (c.tagBits * 26) + 'px">tag（' + c.tagBits + ' 位）</span>' +
        '<span style="width:' + (c.indexBits * 26) + 'px">index（' + c.indexBits + ' 位）</span>' +
        '<span style="width:' + (c.offsetBits * 26) + 'px">offset（' + c.offsetBits + ' 位）</span></div>' +
        '<div class="lab-out">' +
        card("块内地址 offset", offset, "块大小 64 B") +
        card("组号 index", index, "组数 " + c.setCount) +
        card("标记 tag", "0x" + tag.toString(16).toUpperCase(), "与行标记比较") +
        card("本次结果", wasHit ? "命中" : "缺失", wasHit ? "第 " + (hitWay + 1) + " 路" : "需装入") +
        '</div>';
      html += '<table class="cache-table"><thead><tr><th>路</th><th>有效位</th><th>tag</th><th>最近使用</th><th>状态</th></tr></thead><tbody>';
      for (var w = 0; w < c.ways; w++) {
        var line = arr[w];
        var cls = "";
        if (line && line.valid && line.tag === tag) cls = "hit";
        else if (w === evicted) cls = "miss";
        html += '<tr class="' + cls + '"><td>' + (w + 1) + '</td><td>' + (line && line.valid ? "1" : "0") + '</td>' +
          '<td>' + (line && line.valid ? "0x" + line.tag.toString(16).toUpperCase() : "—") + '</td>' +
          '<td>' + (line && line.valid ? line.used : "—") + '</td>' +
          '<td>' + (line && line.valid && line.tag === tag ? "命中" : w === evicted ? "被替换" : "") + '</td></tr>';
      }
      html += '</tbody></table>';
      out.innerHTML = html;
      if (wasHit) {
        note.textContent = "命中：该组第 " + (hitWay + 1) + " 路已有相同 tag，无需访问主存。";
        note.className = "lab-note good";
      } else if (evicted >= 0) {
        note.textContent = "缺失：组内已满，按 LRU 淘汰第 " + (evicted + 1) + " 路，装入 tag=0x" + tag.toString(16).toUpperCase() + "。";
        note.className = "lab-note bad";
      } else {
        note.textContent = "缺失：装入第 " + (hitWay + 1) + " 路的空行，tag=0x" + tag.toString(16).toUpperCase() + "。";
        note.className = "lab-note";
      }
      renderConfig();
    }
    box.querySelector("#cache-go").addEventListener("click", access);
    box.querySelector("#cache-rand").addEventListener("click", function () {
      var v = Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
      addrIn.value = hex(v, 8);
      access();
    });
    box.querySelector("#cache-reset").addEventListener("click", reset);
    waySel.addEventListener("change", function () { reset(); });
    renderConfig();
    note.textContent = "Cache 已就绪（容量 32 KB，块 64 B）。输入地址后点“访问”。";
  })();

  /* ══════════ 5. 寻址方式计算 ══════════ */
  (function initEA() {
    var box = $("lab-ea");
    if (!box) return;
    var mode = $("ea-mode"), aIn = $("ea-a"), pcIn = $("ea-pc"), rIn = $("ea-r1"), mAIn = $("ea-ma");
    var out = $("ea-out"), note = $("ea-note");
    var MODES = {
      imm: { name: "立即寻址", mem: 0, formula: "操作数 = A" },
      direct: { name: "直接寻址", mem: 1, formula: "EA = A" },
      indirect: { name: "一次间接寻址", mem: 2, formula: "EA = M[A]" },
      reg: { name: "寄存器寻址", mem: 0, formula: "操作数 = R" },
      regind: { name: "寄存器间接寻址", mem: 1, formula: "EA = R" },
      rel: { name: "相对寻址", mem: 1, formula: "EA = PC + A（PC 为下一条指令地址）" },
      base: { name: "基址寻址", mem: 1, formula: "EA = BR + A" },
      index: { name: "变址寻址", mem: 1, formula: "EA = IX + A" }
    };
    function calc() {
      var m = MODES[mode.value];
      var A = parseAddr(aIn.value), PC = parseAddr(pcIn.value), R = parseAddr(rIn.value), MA = parseAddr(mAIn.value);
      if (!isFinite(A) || !isFinite(PC) || !isFinite(R)) {
        note.textContent = "A、PC、R 都必须是合法的十六进制数。";
        note.className = "lab-note bad";
        return;
      }
      var ea = "—", detail = "";
      if (mode.value === "imm") {
        ea = A; detail = "操作数就是 A 本身，取指时已进入 CPU。";
      } else if (mode.value === "direct") {
        ea = A; detail = "按 A 访问主存一次得到操作数。";
      } else if (mode.value === "indirect") {
        if (!isFinite(MA)) { note.textContent = "间接寻址需要填写 M[A]（A 单元中存放的有效地址）。"; note.className = "lab-note bad"; return; }
        ea = MA; detail = "先读 A 单元得到 EA，再按 EA 读操作数，共访存 2 次。";
      } else if (mode.value === "reg") {
        ea = R; detail = "操作数就在寄存器 R 中，不需要访存。";
      } else if (mode.value === "regind") {
        ea = R; detail = "R 中存放操作数地址，按 R 访存一次。";
      } else if (mode.value === "rel") {
        ea = (PC + A) >>> 0; detail = "以 PC（下一条指令地址）为基准加位移 A。";
      } else {
        ea = (R + A) >>> 0; detail = (mode.value === "base" ? "基址寄存器 BR" : "变址寄存器 IX") + " 内容加 A。";
      }
      out.innerHTML =
        card("寻址方式", m.name, "取操作数访存 " + m.mem + " 次") +
        card("有效地址 EA", ea === "—" ? "—" : hex(ea, 4), "按字节编址示例") +
        card("访存次数", m.mem, m.mem === 0 ? "操作数在指令/寄存器中" : "取操作数阶段") +
        '<div class="res-card"><div class="r-label">计算式</div><div class="r-sub" style="font-size:13px;line-height:1.7">' +
        m.formula + "<br>A = " + hex(A, 4) + " · PC = " + hex(PC, 4) + " · R = " + hex(R, 4) + "</div></div>";
      note.textContent = detail + " 注意：取指本身还要访存 1 次，题目问“取操作数”时不要把取指算进去。";
      note.className = "lab-note good";
    }
    box.querySelector("#ea-go").addEventListener("click", calc);
    mode.addEventListener("change", calc);
    calc();
  })();

  /* ══════════ 6. 流水线时空图 ══════════ */
  (function initPipe() {
    var box = $("lab-pipe");
    if (!box) return;
    var nIn = $("pipe-n"), cycIn = $("pipe-cycle"), stallIn = $("pipe-stall");
    var out = $("pipe-out"), note = $("pipe-note");
    var STAGES = ["IF", "ID", "EX", "MEM", "WB"];
    function calc() {
      var n = Math.max(1, Math.min(12, Math.round(num(nIn, 8))));
      var dt = num(cycIn, 1);
      var stalls = stallIn.checked ? 2 : 0;
      var total = STAGES.length + n - 1 + stalls;
      var nonPipe = n * STAGES.length;
      var time = total * dt;
      var throughput = n / total;
      var speedup = nonPipe / total;
      var eff = n / total;
      var html = '<div class="pipe-chart" style="grid-template-columns:48px repeat(' + total + ',1fr)">';
      html += '<div class="pipe-label">周期</div>';
      for (var c = 1; c <= total; c++) html += '<div class="pipe-label" style="justify-content:center">' + c + '</div>';
      for (var i = 0; i < n; i++) {
        html += '<div class="pipe-label">I' + (i + 1) + '</div>';
        var start = i + (i >= 2 ? stalls : 0);
        for (var t = 1; t <= total; t++) {
          var stageIdx = t - start;
          if (stageIdx >= 0 && stageIdx < STAGES.length) {
            var s = STAGES[stageIdx];
            html += '<div class="pipe-cell ' + s.toLowerCase() + '">' + s + '</div>';
          } else {
            html += '<div class="pipe-cell empty"></div>';
          }
        }
      }
      if (stalls) {
        html += '<div class="pipe-label" style="color:var(--red)">停顿</div>';
        for (var u = 1; u <= total; u++) {
          html += (u === 3 || u === 4) ? '<div class="pipe-cell stall">STALL</div>' : '<div class="pipe-cell empty"></div>';
        }
      }
      html += '</div>';
      out.innerHTML = html + '<div class="lab-out">' +
        card("总周期", total, stalls ? "含 " + stalls + " 个停顿" : "理想流水线") +
        card("总时间", fmt(time) + " ns", "周期 × " + dt + " ns") +
        card("吞吐率", fmt(throughput, 3) + " 条/周期", "n / 总周期") +
        card("加速比", fmt(speedup, 3), "非流水 " + nonPipe + " / " + total) +
        card("效率", Math.round(eff * 100) + "%", "加速比 / 段数") +
        '</div>';
      note.textContent = stalls
        ? "插入 2 个停顿后，总周期从 " + (STAGES.length + n - 1) + " 增加到 " + total + "，加速比下降。真实 CPU 用转发、分支预测减少停顿。"
        : "理想情况：k + n − 1 = " + STAGES.length + " + " + n + " − 1 = " + total + " 个周期。勾选“插入停顿”看数据冒险的代价。";
      note.className = "lab-note good";
    }
    box.querySelector("#pipe-go").addEventListener("click", calc);
    stallIn.addEventListener("change", calc);
    calc();
  })();

  /* ══════════ 7. 总线带宽 ══════════ */
  (function initBus() {
    var box = $("lab-bus");
    if (!box) return;
    var wIn = $("bus-width"), fIn = $("bus-freq"), tIn = $("bus-trans"), bIn = $("bus-bytes");
    var out = $("bus-out"), note = $("bus-note");
    function calc() {
      var w = num(wIn, 32), f = num(fIn, 100), t = num(tIn, 1), bytes = num(bIn, 1024);
      if (w <= 0 || f <= 0 || t <= 0 || bytes <= 0) {
        note.textContent = "所有输入都必须是正数。";
        note.className = "lab-note bad";
        return;
      }
      var bw = (w / 8) * f * 1e6 * t;          // B/s
      var bwMB = bw / 1e6;                    // MB/s（十进制）
      var timeUs = bytes / bw * 1e6;
      out.innerHTML =
        card("总线宽度", w + " 位", (w / 8) + " B/次") +
        card("传输频率", f + " MHz × " + t, "每周期 " + t + " 次") +
        card("总线带宽", fmt(bwMB) + " MB/s", "宽度(B) × 频率 × 次数") +
        card("传 " + bytes + " B", fmt(timeUs) + " μs", "字节数 / 带宽");
      note.textContent = "公式：带宽 = (总线宽度 / 8) × 总线频率 × 每周期传输次数。DDR 的每周期传输次数为 2。";
      note.className = "lab-note good";
    }
    box.querySelector("#bus-go").addEventListener("click", calc);
    calc();
  })();

  /* ══════════ 8. 中断 / DMA 流程 ══════════ */
  (function initIO() {
    var box = $("lab-io");
    if (!box) return;
    var flow = $("io-flow"), desc = $("io-desc"), modeSel = $("io-mode");
    var prevBtn = $("io-prev"), nextBtn = $("io-next"), autoBtn = $("io-auto"), resetBtn = $("io-reset");
    var STEPS = {
      int: [
        { t: "设备请求", d: "外设准备好数据，向 CPU 发出中断请求（IRQ），置位中断请求触发器。" },
        { t: "CPU 响应", d: "CPU 执行完当前指令后，检查中断请求；若允许响应，进入中断响应周期。" },
        { t: "关中断 / 保存断点", d: "硬件自动关中断，保存 PC（断点）和 PSW，防止现场被破坏。" },
        { t: "识别中断源", d: "通过中断向量表取得服务程序入口地址，跳转到对应服务程序。" },
        { t: "执行服务程序", d: "保存通用寄存器，处理数据；可开中断以允许更高优先级中断嵌套。" },
        { t: "恢复返回", d: "恢复寄存器与 PSW，开中断，返回断点继续执行原程序。" }
      ],
      dma: [
        { t: "CPU 初始化", d: "CPU 设置 DMA 控制器的源地址、目的地址、传送长度和方向。" },
        { t: "设备请求", d: "外设准备好后向 DMA 控制器发 DMA 请求（DREQ）。" },
        { t: "DMA 请求总线", d: "DMA 控制器向 CPU 发出总线请求（HRQ），申请接管总线。" },
        { t: "接管并传输", d: "CPU 让出总线，DMA 控制器直接在主存与设备间成块传送数据。" },
        { t: "传输完成", d: "DMA 控制器发出完成信号/中断，CPU 做校验、切换缓冲区等收尾。" }
      ]
    };
    var steps = STEPS.int, idx = -1, timer = null;
    function render() {
      flow.innerHTML = steps.map(function (s, i) {
        return '<div class="flow-node ' + (i < idx ? "done" : i === idx ? "on" : "") + '">' +
          '<b>' + (i + 1) + '. ' + s.t + '</b>' + s.d + '</div>';
      }).join("");
      desc.innerHTML = idx < 0 ? "点“下一步”开始演示。" : "<b>第 " + (idx + 1) + " 步：</b>" + steps[idx].d;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; autoBtn.textContent = "自动播放"; } }
    nextBtn.addEventListener("click", function () {
      stop();
      if (idx < steps.length - 1) idx++;
      render();
    });
    prevBtn.addEventListener("click", function () {
      stop();
      if (idx > -1) idx--;
      render();
    });
    resetBtn.addEventListener("click", function () { stop(); idx = -1; render(); });
    modeSel.addEventListener("change", function () {
      stop();
      steps = STEPS[modeSel.value];
      idx = -1;
      render();
    });
    autoBtn.addEventListener("click", function () {
      if (timer) { stop(); return; }
      autoBtn.textContent = "暂停";
      timer = setInterval(function () {
        if (idx >= steps.length - 1) { stop(); return; }
        idx++;
        render();
      }, 1800);
    });
    render();
  })();

  /* ══════════ 9. 单总线数据通路步进 ══════════ */
  (function initDatapath() {
    var box = $("lab-datapath");
    if (!box) return;
    var stage = $("dp-stage"), note = $("dp-note");
    var prevBtn = $("dp-prev"), nextBtn = $("dp-next"), autoBtn = $("dp-auto"), resetBtn = $("dp-reset");
    var steps = [
      { a: ["pc", "mar"], d: "① PC → MAR：把下一条指令地址送上总线，存入 MAR。" },
      { a: ["mem", "mdr"], d: "② 主存按 MAR 读出指令，送入 MDR。" },
      { a: ["mdr", "ir"], d: "③ MDR → IR：指令进入指令寄存器，准备译码。" },
      { a: ["pc"], d: "④ PC 更新：指向下一条指令（示例简化为 +1）。" },
      { a: ["r1", "a"], d: "⑤ R1 → A：第一个操作数送到 ALU 的 A 端。" },
      { a: ["r2", "b"], d: "⑥ R2 → B：第二个操作数送到 ALU 的 B 端。" },
      { a: ["alu", "r1"], d: "⑦ ALU 完成加法，结果沿总线写回 R1。" }
    ];
    var idx = -1, timer = null;

    function dpBox(id, x, y, w, h, title, sub) {
      var s = '<g id="dp-' + id + '" class="dp-box">';
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + (sub ? h / 2 - 2 : h / 2 + 5)) + '" class="dp-title">' + title + '</text>';
      if (sub) s += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 16) + '" class="dp-sub">' + sub + '</text>';
      return s + '</g>';
    }
    function conn(x1, y1, x2, y2) {
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="dp-conn"/>';
    }
    var s = '';
    s += '<line id="dp-bus" x1="30" y1="180" x2="870" y2="180" class="dp-bus"/>';
    s += '<text x="450" y="202" class="dp-buslabel">内部总线：同一时刻只允许一个部件驱动</text>';
    s += dpBox("pc", 50, 40, 110, 52, "PC", "下一条地址");
    s += dpBox("mar", 200, 40, 110, 52, "MAR", "地址寄存器");
    s += dpBox("mdr", 350, 40, 110, 52, "MDR", "数据寄存器");
    s += dpBox("ir", 500, 40, 110, 52, "IR", "当前指令");
    s += dpBox("r1", 650, 40, 100, 52, "R1", "操作数 1");
    s += dpBox("r2", 770, 40, 100, 52, "R2", "操作数 2");
    s += dpBox("alu", 300, 260, 120, 55, "ALU", "加法器");
    s += dpBox("a", 450, 260, 80, 48, "A", "ALU 输入");
    s += dpBox("b", 550, 260, 80, 48, "B", "ALU 输入");
    s += dpBox("mem", 660, 260, 180, 55, "主存", "按地址读写");
    [105, 255, 405, 555, 700, 820].forEach(function (x) { s += conn(x, 92, x, 180); });
    [360, 490, 590, 750].forEach(function (x) { s += conn(x, 260, x, 180); });
    stage.innerHTML = '<svg viewBox="0 0 900 350" role="img" aria-label="单总线数据通路">' + s + '</svg>';

    function render() {
      var boxes = stage.querySelectorAll(".dp-box");
      boxes.forEach(function (g) { g.classList.remove("dp-active"); });
      if (idx >= 0) {
        steps[idx].a.forEach(function (id) {
          var g = stage.querySelector("#dp-" + id);
          if (g) g.classList.add("dp-active");
        });
        note.textContent = steps[idx].d;
        note.className = "lab-note good";
      } else {
        note.textContent = "点“下一步”开始：观察每一步是哪两个部件在使用总线。";
        note.className = "lab-note";
      }
      var bus = stage.querySelector("#dp-bus");
      if (bus) bus.classList.toggle("dp-bus-hot", idx >= 0);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; autoBtn.textContent = "自动播放"; } }
    nextBtn.addEventListener("click", function () {
      stop();
      if (idx < steps.length - 1) idx++;
      render();
    });
    prevBtn.addEventListener("click", function () {
      stop();
      if (idx > -1) idx--;
      render();
    });
    resetBtn.addEventListener("click", function () { stop(); idx = -1; render(); });
    autoBtn.addEventListener("click", function () {
      if (timer) { stop(); return; }
      autoBtn.textContent = "暂停";
      timer = setInterval(function () {
        if (idx >= steps.length - 1) { stop(); return; }
        idx++;
        render();
      }, 1700);
    });
    render();
  })();
})();
