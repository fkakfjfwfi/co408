/* 408 计算机组成原理可视化课堂 · 图解渲染
 * 用法：页面放 <figure class="vis" data-vis="名称"><figcaption>…</figcaption></figure>
 * 本文件按名称注入 SVG，不依赖任何外部库。
 */
(function () {
  "use strict";

  function txt(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || "middle") + '" class="' + (cls || "v-label") + '">' + s + '</text>';
  }
  function box(x, y, w, h, title, sub, cls) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" class="v-box ' + (cls || "") + '"/>';
    var lines = sub ? String(sub).split("|") : [];
    var cy = y + h / 2;
    if (title) s += txt(x + w / 2, cy - (lines.length ? 5 : -5), title, "v-title");
    lines.forEach(function (l, i) {
      s += txt(x + w / 2, cy + 14 + i * 14, l, "v-sub");
    });
    return s;
  }
  function arrow(x1, y1, x2, y2, label, dashed) {
    var ang = Math.atan2(y2 - y1, x2 - x1), L = 9, W = 4.5;
    var bx = x2 - L * Math.cos(ang), by = y2 - L * Math.sin(ang);
    var p1 = (bx + W * Math.sin(ang)).toFixed(1) + "," + (by - W * Math.cos(ang)).toFixed(1);
    var p2 = (bx - W * Math.sin(ang)).toFixed(1) + "," + (by + W * Math.cos(ang)).toFixed(1);
    var s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="v-line' + (dashed ? " v-dash" : "") + '"/>';
    s += '<polygon points="' + x2 + "," + y2 + " " + p1 + " " + p2 + '" class="v-arrowhead"/>';
    if (label) {
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      if (Math.abs(y2 - y1) > Math.abs(x2 - x1)) s += txt(mx + 8, my, label, "v-label", "start");
      else s += txt(mx, my - 7, label, "v-label");
    }
    return s;
  }
  function svg(w, h, body, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '" preserveAspectRatio="xMidYMid meet">' + body + '</svg>';
  }
  function flowH(steps, opt) {
    opt = opt || {};
    var w = opt.w || 900, h = opt.h || 210, margin = 20, gap = opt.gap || 16;
    var n = steps.length, bw = (w - margin * 2 - gap * (n - 1)) / n;
    var y = opt.y || 55, bh = opt.bh || 90, s = "";
    steps.forEach(function (st, i) {
      var x = margin + i * (bw + gap);
      s += box(x, y, bw, bh, st[0], st[1], st[2] || "");
      if (i < n - 1) s += arrow(x + bw + 2, y + bh / 2, x + bw + gap - 2, y + bh / 2);
    });
    if (opt.loop) {
      var x1 = margin + bw / 2, x2 = w - margin - bw / 2, y2 = y + bh + 24;
      s += '<path d="M' + x2 + " " + (y + bh) + " L" + x2 + " " + y2 + " L" + x1 + " " + y2 + " L" + x1 + " " + (y + bh + 3) + '" class="v-line v-dash"/>';
      s += arrow(x1, y2 + 2, x1, y + bh + 5);
      s += txt((x1 + x2) / 2, y2 + 16, opt.loop, "v-label");
      h = Math.max(h, y2 + 40);
    }
    return svg(w, h, s, opt.label || "流程图");
  }
  function bitBar(fields, x, y, totalW) {
    var total = 0;
    fields.forEach(function (f) { total += f.bits; });
    var cx = x, s = "";
    fields.forEach(function (f) {
      var fw = totalW * f.bits / total;
      s += '<rect x="' + cx + '" y="' + y + '" width="' + fw + '" height="36" rx="4" class="v-box ' + (f.cls || "") + '"/>';
      s += txt(cx + fw / 2, y - 9, f.label + " · " + f.bits + " 位", "v-label");
      if (f.value) s += txt(cx + fw / 2, y + 23, f.value, f.small ? "v-tiny" : "v-sub");
      cx += fw;
    });
    return s;
  }
  function gantt(rows, total, opt) {
    opt = opt || {};
    var w = opt.w || 860, left = opt.left || 90, top = 48, right = 20;
    var cellW = (w - left - right) / total, rowH = opt.rowH || 34, s = "";
    for (var i = 0; i <= total; i++) {
      var x = left + i * cellW;
      s += '<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + rows.length * rowH) + '" class="v-grid"/>';
      if (i < total) s += txt(x + cellW / 2, top - 10, i + 1, "v-label");
    }
    rows.forEach(function (r, ri) {
      var y = top + ri * rowH;
      s += txt(left - 10, y + 21, r.label, "v-label", "end");
      (r.bars || []).forEach(function (b) {
        var bx = left + b.start * cellW;
        s += '<rect x="' + (bx + 2) + '" y="' + (y + 6) + '" width="' + (b.len * cellW - 4) + '" height="' + (rowH - 12) + '" rx="4" class="v-box ' + (b.cls || "") + '"/>';
        if (b.text) s += txt(bx + b.len * cellW / 2, y + 21, b.text, "v-sub");
      });
    });
    var h = top + rows.length * rowH + 34;
    if (opt.note) s += txt(w / 2, h - 10, opt.note, "v-label");
    return svg(w, h, s, opt.label || "时序图");
  }

  var V = {};

  /* ══════════ 第 1 章 ══════════ */
  V["von-neumann"] = function () {
    var s = "";
    s += '<rect x="600" y="34" width="280" height="230" rx="16" class="v-box gray" style="fill:none;stroke-dasharray:6 5"/>';
    s += txt(740, 24, "CPU", "v-label");
    s += box(30, 70, 150, 60, "输入设备", "键盘 / 磁盘 / 网卡", "alt");
    s += box(30, 220, 150, 60, "输出设备", "显示器 / 打印机", "alt");
    s += box(300, 110, 200, 120, "存储器", "指令 + 数据|按地址访问", "brand");
    s += box(620, 60, 240, 70, "运算器 ALU", "算术 / 逻辑运算", "green");
    s += box(620, 175, 240, 70, "控制器", "取指 / 译码 / 发信号", "purple");
    s += arrow(180, 100, 300, 140, "数据");
    s += arrow(300, 200, 180, 245, "结果");
    s += arrow(500, 145, 620, 95, "地址 / 数据 / 控制");
    s += arrow(620, 205, 500, 200, "读 / 写命令", true);
    s += arrow(740, 175, 740, 130, "控制信号");
    s += txt(450, 290, "存储程序：指令和数据放在同一个存储器里，CPU 按 PC 逐条取指执行", "v-label");
    return svg(900, 315, s, "冯·诺依曼结构");
  };

  V["instruction-cycle"] = function () {
    return flowH([
      ["① 取指", "PC → MAR|主存 → IR", "brand"],
      ["② 译码", "操作码 → 控制信号", "purple"],
      ["③ 取操作数", "按寻址方式|可能访存", "alt"],
      ["④ 执行", "ALU 运算 / 计算地址", "green"],
      ["⑤ 写回", "寄存器 / 主存", "brand"]
    ], { loop: "PC 更新，指向下一条指令", label: "指令执行周期", h: 215 });
  };

  V["hierarchy"] = function () {
    var list = [
      { t: "高级语言级", s: "C / Java / Python", w: 260, cls: "purple" },
      { t: "汇编语言级", s: "助记符 / 伪指令", w: 340, cls: "brand" },
      { t: "操作系统级", s: "系统调用 / 进程 / 文件", w: 420, cls: "green" },
      { t: "传统机器级", s: "机器指令（ISA）", w: 520, cls: "alt" },
      { t: "微程序机器级", s: "微指令 / 微操作", w: 620, cls: "brand" }
    ];
    var s = "", cx = 390, y0 = 40, rowH = 46, gap = 10;
    list.forEach(function (l, i) {
      var y = y0 + i * (rowH + gap);
      s += box(cx - l.w / 2, y, l.w, rowH, l.t, l.s, l.cls);
    });
    s += txt(735, 120, "抽象程度 ↑", "v-label");
    s += txt(735, 240, "实现细节 ↓", "v-label");
    s += arrow(710, 230, 710, 120);
    s += txt(60, 120, "软件", "v-label");
    s += txt(60, 260, "硬件 / 固件", "v-label");
    return svg(800, 340, s, "计算机多级层次结构");
  };

  /* ══════════ 第 2 章 ══════════ */
  V["machine-codes"] = function () {
    var rows = [
      ["原码", "10101101"],
      ["反码", "11010010"],
      ["补码", "11010011"],
      ["移码", "01010011"]
    ];
    var x0 = 200, y0 = 80, cell = 42, rowH = 46, s = "";
    s += txt(100, 56, "编码", "v-label");
    for (var b = 0; b < 8; b++) s += txt(x0 + b * cell + cell / 2, 56, "b" + (7 - b), "v-label");
    rows.forEach(function (r, ri) {
      var y = y0 + ri * rowH;
      s += txt(100, y + 27, r[0], "v-title");
      for (var i = 0; i < 8; i++) {
        var cls = i === 0 ? "alt" : "brand";
        s += '<rect x="' + (x0 + i * cell) + '" y="' + y + '" width="' + cell + '" height="34" rx="3" class="v-box ' + cls + '"/>';
        s += txt(x0 + i * cell + cell / 2, y + 23, r[1][i], "v-sub");
      }
    });
    s += txt(450, 290, "以 −45 为例：符号位 b7：0 为正、1 为负；移码的符号位与补码相反", "v-label");
    return svg(900, 310, s, "原码反码补码移码对比");
  };

  V["twos-circle"] = function () {
    var cx = 450, cy = 160, r = 95, s = "";
    var a0 = -Math.PI / 2, a1 = (-90 + 211 / 256 * 360) * Math.PI / 180;
    var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    function pt(v) {
      var a = (-90 + v / 256 * 360) * Math.PI / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a: a };
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="v-line" fill="none"/>';
    [0, 64, 128, 192].forEach(function (v) {
      var p = pt(v);
      var lx = cx + (r + 26) * Math.cos(p.a), ly = cy + (r + 26) * Math.sin(p.a);
      s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="var(--brand)"/>';
      s += txt(lx, ly + 4, v === 0 ? "0 / 256" : String(v), "v-label");
    });
    s += '<path d="M' + x0 + " " + y0 + " A" + r + " " + r + " 0 1 1 " + x1 + " " + y1 + '" class="v-line v-arc"/>';
    s += '<circle cx="' + x1 + '" cy="' + y1 + '" r="6" fill="var(--accent)"/>';
    s += txt(x1 - 60, y1 + 26, "211 ≡ −45", "v-title");
    s += '<path d="M' + x1 + " " + y1 + " A" + r + " " + r + " 0 0 1 " + x0 + " " + y0 + '" class="v-line v-dash"/>';
    s += txt(cx, cy + 5, "8 位模 256", "v-sub");
    s += txt(cx, cy + 24, "−45 与 211 是同一个位置", "v-label");
    s += txt(450, 300, "补码把减法变成加法：A − 45 = A + 211（丢掉进位）", "v-label");
    return svg(900, 320, s, "补码模运算示意");
  };

  V["ieee754"] = function () {
    var s = "";
    s += bitBar([
      { label: "S 符号", bits: 1, value: "1", cls: "alt" },
      { label: "E 阶码（偏置 127）", bits: 8, value: "10000010", cls: "purple" },
      { label: "M 尾数（隐含 1）", bits: 23, value: "10001100000000000000000", cls: "brand", small: true }
    ], 40, 72, 820);
    s += txt(450, 145, "−12.375 = −1.100011₂ × 2³ → S=1，E=3+127=130，M=100011…", "v-sub");
    s += txt(450, 172, "V = (−1)^S × 1.M × 2^(E−127)", "v-title");
    return svg(900, 195, s, "IEEE 754 单精度字段");
  };

  V["float-add"] = function () {
    return flowH([
      ["① 对阶", "小阶向大阶看齐|尾数右移", "alt"],
      ["② 尾数加减", "阶码已统一", "brand"],
      ["③ 规格化", "左规 / 右规", "purple"],
      ["④ 舍入", "就近到偶数", "green"],
      ["⑤ 溢出判断", "上溢 → ∞|下溢 → 0", "alt"]
    ], { label: "浮点加减五步", h: 200 });
  };

  V["hamming"] = function () {
    var x0 = 100, y = 60, cell = 100, s = "";
    var roles = ["P1", "P2", "D1", "P4", "D2", "D3", "D4"];
    for (var i = 0; i < 7; i++) {
      s += txt(x0 + i * cell + cell / 2, y - 20, "第 " + (i + 1) + " 位", "v-label");
      s += '<rect x="' + (x0 + i * cell) + '" y="' + y + '" width="' + (cell - 6) + '" height="40" rx="5" class="v-box ' + (roles[i][0] === "P" ? "alt" : "brand") + '"/>';
      s += txt(x0 + i * cell + (cell - 6) / 2, y + 25, roles[i], "v-title");
    }
    var checks = [
      ["P1 校验", [0, 2, 4, 6]],
      ["P2 校验", [1, 2, 5, 6]],
      ["P4 校验", [3, 4, 5, 6]]
    ];
    checks.forEach(function (c, ri) {
      var yy = 140 + ri * 44;
      s += txt(50, yy + 22, c[0], "v-label", "start");
      for (var j = 0; j < 7; j++) {
        var on = c[1].indexOf(j) >= 0;
        s += '<rect x="' + (x0 + j * cell) + '" y="' + yy + '" width="' + (cell - 6) + '" height="32" rx="4" class="v-box ' + (on ? "green" : "gray") + '"/>';
        if (on) s += txt(x0 + j * cell + (cell - 6) / 2, yy + 22, "✓", "v-sub");
      }
    });
    s += txt(450, 290, "校验位放在 1、2、4 位；故障字直接指出出错位置（1 位纠错）", "v-label");
    return svg(900, 305, s, "海明码校验分组");
  };

  /* ══════════ 第 3 章 ══════════ */
  V["memory-hierarchy"] = function () {
    var list = [
      { t: "寄存器", s: "最快 / 最小 / 最贵", w: 220, cls: "purple" },
      { t: "Cache（SRAM）", s: "KB~MB / 几 ns", w: 340, cls: "brand" },
      { t: "主存（DRAM）", s: "GB / 几十~上百 ns", w: 460, cls: "green" },
      { t: "辅存（SSD / 磁盘）", s: "TB / μs~ms", w: 600, cls: "alt" }
    ];
    var s = "", cx = 360, y0 = 40, rowH = 55, gap = 12;
    list.forEach(function (l, i) {
      var y = y0 + i * (rowH + gap);
      s += box(cx - l.w / 2, y, l.w, rowH, l.t, l.s, l.cls);
    });
    s += arrow(720, 280, 720, 60);
    s += txt(755, 170, "容量 ↑|速度 ↓|成本 ↓", "v-label");
    s += txt(100, 260, "CPU 近", "v-label");
    s += txt(100, 60, "CPU 远", "v-label");
    return svg(800, 350, s, "存储层次结构");
  };

  V["chip-expansion"] = function () {
    var s = "";
    s += txt(450, 24, "A0~A9：10 位片内地址，所有芯片共用", "v-label");
    s += '<line x1="70" y1="40" x2="70" y2="330" class="v-line"/>';
    var y0 = 70, groupH = 62;
    for (var g = 0; g < 4; g++) {
      var y = y0 + g * groupH;
      s += txt(52, y + 28, "第 " + g + " 组", "v-label", "end");
      s += '<line x1="70" y1="' + (y + 24) + '" x2="150" y2="' + (y + 24) + '" class="v-line"/>';
      s += box(150, y, 140, 48, "1K×4", "D0~D3", "brand");
      s += box(310, y, 140, 48, "1K×4", "D4~D7", "alt");
      s += '<line x1="150" y1="' + (y + 24) + '" x2="290" y2="' + (y + 24) + '" class="v-line"/>';
    }
    s += '<line x1="450" y1="70" x2="450" y2="320" class="v-line"/>';
    s += txt(450, 54, "D0~D7", "v-label");
    s += box(500, 80, 170, 55, "2-4 译码器", "输入 A10、A11|输出 CS0~CS3", "purple");
    s += arrow(500, 108, 452, 108, "", true);
    s += txt(700, 108, "片选决定哪一组工作", "v-label", "start");
    s += txt(450, 355, "8 片 1K×4 → 4K×8：先 2 片位扩展成 1K×8，再 4 组字扩展", "v-label");
    return svg(900, 375, s, "存储芯片字位扩展");
  };

  V["low-order-interleave"] = function () {
    var rows = [
      { label: "M0", bars: [{ start: 0, len: 4, text: "存取 T", cls: "brand" }] },
      { label: "M1", bars: [{ start: 1, len: 4, text: "存取 T", cls: "alt" }] },
      { label: "M2", bars: [{ start: 2, len: 4, text: "存取 T", cls: "green" }] },
      { label: "M3", bars: [{ start: 3, len: 4, text: "存取 T", cls: "purple" }] },
      { label: "总线", bars: [
        { start: 4, len: 1, text: "B0", cls: "alt" },
        { start: 5, len: 1, text: "B1", cls: "alt" },
        { start: 6, len: 1, text: "B2", cls: "alt" },
        { start: 7, len: 1, text: "B3", cls: "alt" }
      ] }
    ];
    var s = gantt(rows, 8, {
      label: "低位交叉时序",
      note: "第一个字等 T=4r，之后每隔 r 出一个字：t = T + (n−1)r"
    });
    return s;
  };

  V["cache-address"] = function () {
    var s = "";
    s += txt(450, 40, "直接映射：tag 16 + index 11 + offset 5", "v-title");
    s += bitBar([
      { label: "tag", bits: 16, value: "主存块号高位", cls: "alt" },
      { label: "index", bits: 11, value: "Cache 行号", cls: "purple" },
      { label: "offset", bits: 5, value: "块内 32 B", cls: "brand" }
    ], 60, 78, 780);
    s += txt(450, 135, "4 路组相联：tag 18 + index 9 + offset 5", "v-title");
    s += bitBar([
      { label: "tag", bits: 18, value: "标记", cls: "alt" },
      { label: "index", bits: 9, value: "组号", cls: "purple" },
      { label: "offset", bits: 5, value: "块内", cls: "brand" }
    ], 60, 173, 780);
    s += txt(450, 230, "全相联：tag 27 + offset 5", "v-title");
    s += bitBar([
      { label: "tag", bits: 27, value: "与所有行并行比较", cls: "alt" },
      { label: "offset", bits: 5, value: "块内", cls: "brand" }
    ], 60, 268, 780);
    return svg(900, 360, s, "Cache 地址划分");
  };

  V["virtual-memory"] = function () {
    var s = "";
    s += box(30, 50, 150, 60, "CPU", "虚拟地址 VA", "brand");
    s += box(220, 50, 170, 60, "拆分", "VPN + offset", "purple");
    s += box(430, 50, 150, 60, "TLB", "页表项缓存", "alt");
    s += box(620, 50, 240, 60, "物理地址", "PFN + offset", "green");
    s += box(430, 170, 150, 60, "页表", "VPN → PFN", "purple");
    s += box(620, 170, 240, 60, "Cache / 主存", "按物理地址访问", "brand");
    s += box(620, 285, 240, 55, "磁盘 / SSD", "缺页时调页", "alt");
    s += arrow(180, 80, 220, 80);
    s += arrow(390, 80, 430, 80);
    s += arrow(580, 80, 620, 80, "命中");
    s += arrow(505, 110, 505, 170, "缺失", true);
    s += arrow(580, 200, 620, 200, "PFN");
    s += arrow(740, 110, 740, 170, "拼地址");
    s += arrow(740, 230, 740, 285, "缺页", true);
    s += arrow(700, 285, 700, 230, "调页", true);
    s += txt(450, 355, "TLB 命中可跳过页表；TLB 缺失 ≠ 缺页，只有页表项有效位为 0 才是缺页", "v-label");
    return svg(900, 370, s, "虚拟地址转换流程");
  };

  /* ══════════ 第 4 章 ══════════ */
  V["instruction-format"] = function () {
    var s = txt(450, 30, "16 位定长指令（二地址）", "v-title");
    s += bitBar([
      { label: "操作码 OP", bits: 6, value: "000011", cls: "alt" },
      { label: "地址码 A1", bits: 5, value: "00001", cls: "brand" },
      { label: "地址码 A2", bits: 5, value: "00010", cls: "purple" }
    ], 80, 82, 740);
    s += txt(450, 165, "6 + 5 + 5 = 16 位；扩展操作码会借用地址码字段", "v-label");
    return svg(900, 190, s, "指令格式位域");
  };

  V["addressing-modes"] = function () {
    var s = "";
    function chain(y, label, items) {
      var out = txt(20, y + 30, label, "v-title", "start");
      var x = 130, w = 145, h = 48, gap = 28;
      items.forEach(function (it, i) {
        out += box(x, y, w, h, it[0], it[1], it[2] || "");
        if (i < items.length - 1) out += arrow(x + w + 2, y + h / 2, x + w + gap - 2, y + h / 2);
        x += w + gap;
      });
      return out;
    }
    s += chain(40, "直接", [["指令 A", "地址字段 = 0x10"], ["主存[0x10]", "直接取数", "brand"], ["操作数", "", "green"]]);
    s += chain(115, "间接", [["指令 A", "地址字段 A"], ["主存[A]", "得到 EA", "alt"], ["主存[EA]", "再取一次", "brand"], ["操作数", "", "green"]]);
    s += chain(190, "寄存器间接", [["寄存器 R", "R 中是 EA"], ["主存[R]", "取操作数", "brand"], ["操作数", "", "green"]]);
    s += chain(265, "相对", [["PC + A", "下一条指令 + 位移"], ["主存[EA]", "取操作数", "brand"], ["操作数", "", "green"]]);
    s += txt(450, 350, "访存次数：立即/寄存器 0 次；直接/寄存器间接/相对 1 次；一次间接 2 次", "v-label");
    return svg(900, 370, s, "常见寻址方式");
  };

  V["stack-frame"] = function () {
    var s = "";
    s += '<rect x="110" y="50" width="300" height="290" rx="10" class="v-box gray" style="fill:none"/>';
    s += txt(260, 36, "栈向低地址增长", "v-label");
    s += txt(60, 75, "高地址", "v-label");
    s += txt(60, 330, "低地址", "v-label");
    var rows = [
      ["调用者的栈帧", 60, "gray"],
      ["参数", 105, "alt"],
      ["返回地址", 150, "purple"],
      ["旧 RBP", 195, "brand"],
      ["局部变量", 240, "green"],
      ["保存的寄存器", 285, "gray"]
    ];
    rows.forEach(function (r) {
      s += box(125, r[1], 270, 38, r[0], "", r[2]);
    });
    s += arrow(85, 214, 123, 214, "RBP");
    s += arrow(85, 325, 123, 325, "RSP");
    s += txt(450, 95, "call 指令压入返回地址", "v-label", "start");
    s += txt(450, 140, "进入函数先保存旧 RBP", "v-label", "start");
    s += txt(450, 185, "局部变量、保存的寄存器在栈上", "v-label", "start");
    s += txt(450, 230, "返回时逆序恢复，ret 弹出返回地址", "v-label", "start");
    return svg(800, 390, s, "过程调用的栈帧");
  };

  V["endian"] = function () {
    var s = "", x = 150, cell = 120;
    s += txt(450, 30, "0x12345678 在内存中的字节顺序", "v-title");
    s += txt(450, 55, "低地址 → 高地址", "v-label");
    ["0x1000", "0x1001", "0x1002", "0x1003"].forEach(function (a, i) {
      s += txt(x + i * cell + cell / 2, 80, a, "v-label");
    });
    var big = ["12", "34", "56", "78"], little = ["78", "56", "34", "12"];
    s += txt(80, 125, "大端", "v-title");
    big.forEach(function (b, i) {
      s += box(x + i * cell, 100, cell - 8, 45, b, i === 0 ? "最高字节" : i === 3 ? "最低字节" : "", i === 0 ? "alt" : "brand");
    });
    s += txt(80, 205, "小端", "v-title");
    little.forEach(function (b, i) {
      s += box(x + i * cell, 180, cell - 8, 45, b, i === 0 ? "最低字节" : i === 3 ? "最高字节" : "", i === 3 ? "alt" : "brand");
    });
    s += txt(450, 255, "小端 = 低地址放低字节：78 56 34 12", "v-label");
    return svg(800, 275, s, "大小端字节序");
  };

  /* ══════════ 第 5 章 ══════════ */
  V["cpu-block"] = function () {
    var s = "";
    s += '<rect x="20" y="20" width="860" height="300" rx="18" class="v-box gray" style="fill:none;stroke-dasharray:6 5"/>';
    s += txt(60, 44, "CPU", "v-title", "start");
    s += box(40, 55, 100, 50, "PC", "下一条地址");
    s += box(170, 55, 100, 50, "MAR", "地址寄存器");
    s += box(300, 55, 100, 50, "MDR", "数据寄存器");
    s += box(430, 55, 100, 50, "IR", "当前指令");
    s += box(590, 50, 220, 65, "控制器", "译码 / 时序 / 控制信号", "purple");
    s += box(40, 160, 150, 55, "寄存器堆", "R0 ~ Rn", "green");
    s += box(230, 160, 120, 55, "ALU", "运算", "green");
    s += box(390, 160, 110, 55, "暂存 A/B", "ALU 输入", "alt");
    s += '<line x1="40" y1="290" x2="840" y2="290" class="v-line"/>';
    s += txt(450, 312, "内部总线（同一时刻只有一个部件能驱动它）", "v-label");
    [
      { x: 90, y: 105 }, { x: 220, y: 105 }, { x: 350, y: 105 }, { x: 480, y: 105 },
      { x: 700, y: 115 }, { x: 115, y: 215 }, { x: 290, y: 215 }, { x: 445, y: 215 }
    ].forEach(function (p) {
      s += '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + p.x + '" y2="290" class="v-line v-dash"/>';
      s += '<circle cx="' + p.x + '" cy="290" r="3" fill="var(--brand)"/>';
    });
    s += box(350, 355, 200, 50, "主存", "MAR / MDR 经总线访问", "alt");
    s += arrow(400, 290, 400, 355);
    return svg(900, 425, s, "CPU 内部结构");
  };

  V["instruction-timing"] = function () {
    var rows = [
      { label: "取指", bars: [{ start: 0, len: 2, text: "取指令", cls: "brand" }] },
      { label: "间址", bars: [{ start: 2, len: 1, text: "取 EA", cls: "alt" }] },
      { label: "执行", bars: [{ start: 3, len: 3, text: "取数 / 运算 / 写回", cls: "green" }] },
      { label: "中断", bars: [{ start: 6, len: 1, text: "响应", cls: "purple" }] }
    ];
    return gantt(rows, 8, {
      label: "指令周期时序",
      note: "指令周期 = 取指 +（间址）+ 执行 +（中断）"
    });
  };

  V["microprogram-flow"] = function () {
    return flowH([
      ["① 取机器指令", "PC → IR", "brand"],
      ["② 操作码映射", "找到微程序入口", "purple"],
      ["③ 取微指令", "从控制存储器", "alt"],
      ["④ 执行微命令", "产生控制信号", "green"],
      ["⑤ 下地址", "顺序 / 断定", "brand"]
    ], { loop: "微程序结束 → 取下一条机器指令", label: "微程序控制器流程", h: 215 });
  };

  V["pipeline-hazards"] = function () {
    var s = "";
    s += txt(30, 30, "结构冒险：争用同一硬件", "v-title", "start");
    s += box(100, 50, 110, 45, "IF 取指", "", "brand");
    s += box(100, 115, 110, 45, "MEM 访存", "", "brand");
    s += box(430, 75, 180, 60, "统一 Cache", "只有一个端口", "alt");
    s += arrow(212, 72, 430, 95, "冲突", true);
    s += arrow(212, 137, 430, 120, "", true);
    s += txt(650, 105, "解决：分离 I-Cache / D-Cache", "v-label", "start");

    s += txt(30, 190, "数据冒险：后一条要用前一条的结果", "v-title", "start");
    s += box(100, 210, 150, 45, "add r1, r2, r3", "", "green");
    s += box(330, 210, 150, 45, "sub r4, r1, r5", "", "alt");
    s += arrow(250, 232, 330, 232, "依赖", true);
    s += txt(530, 237, "解决：转发 / 停顿 / 编译器调度", "v-label", "start");

    s += txt(30, 300, "控制冒险：分支改变 PC", "v-title", "start");
    s += box(100, 320, 150, 45, "beq / jmp", "", "purple");
    s += box(330, 320, 150, 45, "下一条 PC?", "还不确定", "alt");
    s += arrow(250, 342, 330, 342, "?", true);
    s += txt(530, 347, "解决：分支预测 / 延迟槽 / 提前算目标", "v-label", "start");
    return svg(900, 390, s, "三类流水线冒险");
  };

  /* ══════════ 第 6 章 ══════════ */
  V["bus-structure"] = function () {
    var s = "";
    s += box(80, 30, 160, 55, "CPU", "主设备", "brand");
    s += box(370, 30, 160, 55, "主存", "存储", "green");
    s += box(660, 30, 160, 55, "I/O 接口", "外设桥梁", "alt");
    s += '<line x1="70" y1="110" x2="830" y2="110" class="v-line"/>';
    s += '<line x1="70" y1="145" x2="830" y2="145" class="v-line"/>';
    s += '<line x1="70" y1="180" x2="830" y2="180" class="v-line"/>';
    s += txt(845, 114, "数据总线", "v-label", "end");
    s += txt(845, 149, "地址总线", "v-label", "end");
    s += txt(845, 184, "控制总线", "v-label", "end");
    [160, 450, 740].forEach(function (x) {
      s += '<line x1="' + x + '" y1="85" x2="' + x + '" y2="180" class="v-line"/>';
      [110, 145, 180].forEach(function (y) { s += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="var(--brand)"/>'; });
    });
    s += box(660, 240, 160, 50, "外设", "磁盘 / 键盘 / 网卡", "purple");
    s += arrow(740, 240, 740, 205);
    s += txt(450, 305, "所有部件共享同一组总线；同一时刻通常只能有一个主设备控制总线", "v-label");
    return svg(900, 320, s, "系统总线结构");
  };

  V["bus-timing"] = function () {
    var s = "";
    function wave(x, y, w, pattern, cls) {
      var step = w / pattern.length, pts = [];
      pts.push(x + "," + y);
      for (var i = 0; i < pattern.length; i++) {
        var yy = pattern[i] === "1" ? y - 24 : y;
        pts.push((x + i * step) + "," + yy);
        pts.push((x + (i + 1) * step) + "," + yy);
      }
      return '<polyline points="' + pts.join(" ") + '" class="v-line ' + (cls || "") + '"/>';
    }
    s += txt(230, 40, "同步定时：统一时钟", "v-title");
    s += txt(65, 105, "CLK", "v-label");
    s += wave(110, 100, 300, "010101010101");
    s += txt(65, 175, "DATA", "v-label");
    s += wave(110, 170, 300, "001111110000");
    for (var i = 0; i <= 6; i++) s += '<line x1="' + (110 + i * 50) + '" y1="70" x2="' + (110 + i * 50) + '" y2="185" class="v-grid"/>';
    s += txt(230, 225, "所有设备按同一个节拍动作", "v-label");

    s += txt(680, 40, "异步定时：请求 / 应答握手", "v-title");
    s += txt(500, 105, "REQ", "v-label");
    s += wave(540, 100, 300, "0001111100");
    s += txt(500, 175, "ACK", "v-label");
    s += wave(540, 170, 300, "0000011111");
    s += txt(610, 220, "请求", "v-label");
    s += txt(730, 220, "应答", "v-label");
    s += txt(680, 255, "慢设备可以拉长握手时间", "v-label");
    return svg(900, 275, s, "同步与异步总线定时");
  };

  V["arbitration"] = function () {
    var s = "";
    s += txt(30, 30, "链式查询（菊花链）", "v-title", "start");
    s += box(40, 50, 140, 55, "总线仲裁器", "", "brand");
    s += box(240, 55, 110, 45, "设备 0", "近端", "green");
    s += box(400, 55, 110, 45, "设备 1", "", "alt");
    s += box(560, 55, 110, 45, "设备 2", "远端", "purple");
    s += arrow(180, 77, 240, 77, "授权");
    s += arrow(350, 77, 400, 77);
    s += arrow(510, 77, 560, 77);
    s += '<line x1="40" y1="125" x2="670" y2="125" class="v-line v-dash"/>';
    s += txt(355, 142, "共享请求线", "v-label");
    s += txt(700, 77, "优先级：近端高、远端低", "v-label", "start");

    s += txt(30, 195, "独立请求", "v-title", "start");
    s += box(40, 215, 140, 55, "总线仲裁器", "", "brand");
    [["设备 0", 230], ["设备 1", 290], ["设备 2", 350]].forEach(function (d, i) {
      s += box(300, d[1] - 18, 110, 36, d[0], "", ["green", "alt", "purple"][i]);
      s += arrow(300, d[1], 180, 242, "", true);
    });
    s += txt(450, 250, "每个设备独立请求 / 授权线：快，但线多", "v-label", "start");
    return svg(900, 390, s, "总线仲裁方式");
  };

  /* ══════════ 第 7 章 ══════════ */
  V["io-interface"] = function () {
    var s = "";
    s += box(30, 110, 140, 60, "CPU", "数据 / 地址 / 控制", "brand");
    s += '<rect x="250" y="55" width="320" height="180" rx="12" class="v-box gray" style="fill:none;stroke-dasharray:6 5"/>';
    s += txt(410, 45, "I/O 接口", "v-title");
    s += box(275, 75, 270, 38, "数据寄存器", "缓冲数据", "green");
    s += box(275, 123, 270, 38, "状态寄存器", "就绪 / 忙 / 错误", "alt");
    s += box(275, 171, 270, 38, "控制寄存器", "启动 / 命令", "purple");
    s += box(680, 110, 150, 60, "外设", "磁盘 / 键盘 / 网卡", "alt");
    s += arrow(170, 130, 250, 110, "读写");
    s += arrow(570, 130, 680, 130, "数据 / 状态");
    s += txt(450, 275, "接口解决速度、格式、时序、电气差异", "v-label");
    return svg(860, 295, s, "I/O 接口结构");
  };

  V["program-query"] = function () {
    var s = "";
    s += box(300, 25, 160, 48, "启动设备", "写控制寄存器", "brand");
    s += box(300, 105, 160, 48, "读状态寄存器", "", "alt");
    s += '<polygon points="380,185 380,250 300,300 220,250" class="v-box purple"/>';
    s += txt(300, 250, "就绪？", "v-title");
    s += box(300, 330, 160, 48, "传送一个数据", "", "green");
    s += box(300, 405, 160, 42, "结束", "", "gray");
    s += arrow(380, 73, 380, 105);
    s += arrow(380, 153, 380, 185);
    s += arrow(300, 300, 300, 330);
    s += arrow(380, 378, 380, 405);
    s += '<path d="M220 250 L220 129 L298 129" class="v-line v-dash"/>';
    s += arrow(298, 129, 300, 129);
    s += txt(205, 200, "否：CPU 忙等", "v-label", "end");
    s += txt(330, 318, "是", "v-label", "start");
    return svg(760, 460, s, "程序查询流程");
  };

  V["interrupt-flow"] = function () {
    return flowH([
      ["① 设备请求", "发中断请求 IRQ", "alt"],
      ["② CPU 响应", "当前指令执行完", "brand"],
      ["③ 关中断 / 保存", "断点 PC、PSW", "purple"],
      ["④ 识别中断源", "取中断向量", "green"],
      ["⑤ 服务 / 返回", "恢复现场，继续原程序", "brand"]
    ], { label: "中断响应流程", h: 205 });
  };

  V["dma-flow"] = function () {
    return flowH([
      ["① CPU 初始化", "源 / 目的 / 长度", "brand"],
      ["② 设备请求", "DREQ", "alt"],
      ["③ 总线请求", "HRQ / 授权", "purple"],
      ["④ 块传输", "DMA 直接读写主存", "green"],
      ["⑤ 完成中断", "CPU 收尾", "brand"]
    ], { label: "DMA 传送流程", h: 205 });
  };

  /* ══════════ 补充重点例子图解 ══════════ */
  V["crc-division"] = function () {
    var s = txt(450, 28, "CRC：1101000 ÷ 1011（模 2 除，异或不借位）", "v-title");
    var steps = [
      ["①", "1101000", "1011000", "0110000"],
      ["②", "110000", "101100", "011100"],
      ["③", "11100", "10110", "01010"],
      ["④", "1010", "1011", "0001"]
    ];
    steps.forEach(function (st, i) {
      var y = 78 + i * 52;
      s += txt(60, y, st[0], "v-title");
      s += txt(120, y, st[1], "v-code", "start");
      s += txt(330, y, "⊕", "v-title");
      s += txt(370, y, st[2], "v-code", "start");
      s += txt(580, y, "=", "v-title");
      s += txt(620, y, st[3], "v-code", "start");
    });
    s += txt(450, 300, "余数 001 → 发送码字 1101 001", "v-title");
    return svg(900, 330, s, "CRC 模 2 除法");
  };

  V["cache-direct-map"] = function () {
    var s = "";
    s += txt(130, 40, "主存块号", "v-title");
    s += txt(680, 40, "Cache 行号", "v-title");
    for (var i = 0; i < 8; i++) {
      s += box(80, 65 + i * 34, 100, 26, "块 " + i, "", i < 4 ? "brand" : "alt");
    }
    for (var j = 0; j < 4; j++) {
      s += box(620, 82 + j * 62, 100, 32, "行 " + j, "", "green");
    }
    [0, 1, 2, 3].forEach(function (k) {
      s += arrow(182, 78 + k * 34, 618, 98 + k * 62);
      s += arrow(182, 78 + (k + 4) * 34, 618, 98 + k * 62, "冲突", true);
    });
    s += txt(400, 190, "块号 mod 4 = 行号", "v-sub");
    s += txt(450, 345, "块 0 和块 4 抢同一行：直接映射的冲突就来自这里", "v-label");
    return svg(900, 360, s, "直接映射冲突");
  };

  V["extended-opcode"] = function () {
    var s = txt(450, 30, "扩展操作码：短码不能是长码的前缀", "v-title");
    s += bitBar([
      { label: "0000 ~ 1110", bits: 4, value: "15 条三地址", cls: "brand" },
      { label: "1111", bits: 4, value: "扩展", cls: "alt" }
    ], 80, 82, 740);
    s += bitBar([
      { label: "1111 0000 ~ 1111 1110", bits: 8, value: "15 条二地址", cls: "purple" },
      { label: "1111 1111", bits: 8, value: "继续扩展", cls: "alt" }
    ], 80, 172, 740);
    s += bitBar([
      { label: "1111 1111 0000 ~ …", bits: 12, value: "更多一地址 / 零地址", cls: "green" },
      { label: "…", bits: 4, value: "继续", cls: "alt" }
    ], 80, 262, 740);
    s += txt(450, 345, "每层留一个全 1 编码作为“继续扩展”的标志", "v-label");
    return svg(900, 365, s, "扩展操作码");
  };

  function mount() {
    document.querySelectorAll("[data-vis]").forEach(function (el) {
      var name = el.getAttribute("data-vis");
      if (V[name]) el.insertAdjacentHTML("afterbegin", V[name]());
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
