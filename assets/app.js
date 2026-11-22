/* 408 计算机组成原理可视化课堂 · 共享逻辑
 * 主题 / 导航 / 打卡 / 题库渲染 / 练习进度 / 错题本 / 收藏 / 筛选
 */
(function () {
  "use strict";

  var PAGE = location.pathname.split("/").pop() || "index.html";
  var THEME_KEY = "co408_theme";
  var CK_KEY = "co408_checklist";
  var QS_KEY = "co408_qstats_v2";
  var FAV_KEY = "co408_fav";

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function storageOK() {
    try {
      var k = "__co408_probe__";
      localStorage.setItem(k, "1");
      var ok = localStorage.getItem(k) === "1";
      localStorage.removeItem(k);
      return ok;
    } catch (e) { return false; }
  }
  var HAS_STORAGE = storageOK();

  /* ── 主题 ── */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var btn = document.querySelector(".theme-btn");
    if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
  }
  applyTheme(loadJSON(THEME_KEY, "light"));
  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".theme-btn");
    if (!btn) return;
    var cur = document.documentElement.getAttribute("data-theme") || "light";
    var next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    saveJSON(THEME_KEY, next);
  });

  /* ── 导航高亮 ── */
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("#")[0];
    if (href === PAGE) a.classList.add("active");
  });

  /* ── 打卡清单 ── */
  var ckState = loadJSON(CK_KEY, {});
  function refreshChecklist() {
    document.querySelectorAll("[data-ck-scope]").forEach(function (scope) {
      var items = scope.querySelectorAll(".check-item");
      var done = 0;
      items.forEach(function (it) {
        if (ckState[it.getAttribute("data-ck")]) done++;
      });
      var pill = scope.querySelector(".progress-pill");
      if (pill) pill.textContent = done + " / " + items.length + " 已打卡";
    });
    document.querySelectorAll("[data-ck-total]").forEach(function (el) {
      var done = 0;
      Object.keys(ckState).forEach(function (k) { if (ckState[k]) done++; });
      el.textContent = "已打卡 " + done + " 项";
    });
  }
  document.addEventListener("change", function (ev) {
    var box = ev.target.closest(".check-item input[type=checkbox]");
    if (!box) return;
    var item = box.closest(".check-item");
    var id = item.getAttribute("data-ck");
    if (!id) return;
    ckState[id] = box.checked;
    saveJSON(CK_KEY, ckState);
    item.classList.toggle("done", box.checked);
    refreshChecklist();
  });
  document.querySelectorAll(".check-item").forEach(function (it) {
    var id = it.getAttribute("data-ck");
    if (id && ckState[id]) {
      it.classList.add("done");
      var box = it.querySelector("input");
      if (box) box.checked = true;
    }
  });
  refreshChecklist();

  /* ══════════ 题库渲染 ══════════ */
  var DATA = window.CO_QUESTIONS || [];
  var CH_NAMES = {
    1: "系统概述", 2: "数据表示", 3: "存储系统", 4: "指令系统",
    5: "CPU", 6: "总线", 7: "I/O 系统"
  };
  var LEVEL_TEXT = { basic: "基础", mid: "提高", real: "真题改编" };
  var LEVEL_CLASS = { basic: "basic", mid: "mid", real: "real" };

  function renderQuiz(q, index, total) {
    var el = document.createElement("div");
    el.className = "quiz";
    el.setAttribute("data-answer", q.answer);
    el.setAttribute("data-diff", q.level);
    el.setAttribute("data-qid", q.id);
    el.setAttribute("data-ch", q.ch);
    var src = q.src ? '<span class="q-src">· ' + q.src + '</span>' : "";
    var html = '<div class="q-head"><div class="q-tag">' +
      '<span class="lvl ' + LEVEL_CLASS[q.level] + '">' + LEVEL_TEXT[q.level] + '</span>' +
      '<span>练习 ' + (index + 1) + ' / ' + total + ' · 考点：' + q.tag + '</span>' + src +
      '</div>' + q.stem + '</div><div class="opts">';
    q.options.forEach(function (opt, i) {
      var letter = String.fromCharCode(65 + i);
      html += '<div class="opt" data-opt="' + letter + '"><b>' + letter + '.</b> ' + opt + '</div>';
    });
    html += '</div><div class="q-foot"><button class="btn-ans" type="button">提交答案</button>' +
      '<span class="q-res"></span></div>' +
      '<div class="q-exp"><b>解析：</b>' + q.exp + '</div>';
    el.innerHTML = html;
    return el;
  }

  var chapterBoxes = document.querySelectorAll("[data-quiz-ch]");
  chapterBoxes.forEach(function (box) {
    var ch = Number(box.getAttribute("data-quiz-ch"));
    var list = DATA.filter(function (q) { return q.ch === ch; });
    list.forEach(function (q, i) {
      box.appendChild(renderQuiz(q, i, list.length));
    });
    var info = box.parentNode.querySelector("[data-quiz-count]");
    if (info) info.textContent = list.length;
  });

  var bankBox = document.querySelector("[data-quiz-bank]");
  if (bankBox) {
    DATA.forEach(function (q, i) {
      bankBox.appendChild(renderQuiz(q, i, DATA.length));
    });
    var info2 = bankBox.parentNode.querySelector("[data-bank-count]");
    if (info2) info2.textContent = DATA.length;
  }

  /* ══════════ 答题逻辑 ══════════ */
  var quizzes = Array.prototype.slice.call(document.querySelectorAll(".quiz"));
  if (!quizzes.length) return;

  var qStats = loadJSON(QS_KEY, {});
  var qFavs = loadJSON(FAV_KEY, {});
  quizzes.forEach(function (q) {
    q.__qid = q.getAttribute("data-qid") || (PAGE + "#" + q.getAttribute("data-answer"));
    q.__rec = qStats[q.__qid] || null;
  });

  var hudBar = null;
  var hudMode = "all";
  var filterCh = 0;
  var filterLevel = "";
  var isBank = !!bankBox;
  var randomCount = isBank ? 20 : 10;

  function recOf(q) { return q.__rec || null; }
  function visibleQuizzes() {
    return quizzes.filter(function (q) { return q.style.display !== "none"; });
  }
  function refreshHud() {
    if (!hudBar) return;
    var answered = 0, correct = 0, wrong = 0, fav = 0;
    quizzes.forEach(function (q) {
      var r = recOf(q);
      if (r && (r.r === 0 || r.r === 1)) {
        answered++;
        if (r.r === 1) correct++; else wrong++;
      }
      if (qFavs[q.__qid]) fav++;
    });
    hudBar.querySelector(".hud-n b").textContent = answered;
    hudBar.querySelector(".hud-acc b").textContent = answered ? Math.round(correct / answered * 100) + "%" : "—";
    hudBar.querySelector(".hud-wrong b").textContent = wrong;
    hudBar.querySelector(".hud-fav b").textContent = fav;
    var warn = hudBar.querySelector(".hud-warn");
    if (warn) {
      if (HAS_STORAGE) {
        warn.textContent = "";
        warn.style.display = "none";
      } else {
        warn.textContent = "⚠️ 当前浏览器禁用了本地存储（可能是无痕模式），答题进度无法保存。请用普通窗口打开。";
        warn.style.display = "block";
      }
    }
    hudBar.querySelectorAll("[data-hud]").forEach(function (b) {
      var m = b.getAttribute("data-hud");
      if (m === "all" || m === "reset") return;
      b.classList.toggle("on", m === hudMode);
    });
  }
  function announce(msg, bad) {
    if (!hudBar) return;
    var el = hudBar.querySelector(".hud-msg");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("bad", !!bad);
    el.classList.add("show");
    clearTimeout(el.__t);
    el.__t = setTimeout(function () { el.classList.remove("show"); }, 3200);
  }
  function persist(silent) {
    var ok = saveJSON(QS_KEY, qStats);
    if (!ok && !silent) announce("⚠️ 保存失败：浏览器禁用了本地存储，刷新后会丢失", true);
    return ok;
  }

  function showList(list) {
    quizzes.forEach(function (q) { q.style.display = list.indexOf(q) >= 0 ? "" : "none"; });
  }
  function applyFilter() {
    var list = quizzes.filter(function (q) {
      var ch = Number(q.getAttribute("data-ch"));
      var lvl = q.getAttribute("data-diff");
      return (!filterCh || ch === filterCh) && (!filterLevel || lvl === filterLevel);
    });
    showList(list);
    var countEl = document.querySelector("[data-filter-count]");
    if (countEl) countEl.textContent = "当前显示 " + list.length + " / " + quizzes.length + " 题";
    var empty = document.querySelector("[data-filter-empty]");
    if (empty) empty.style.display = list.length ? "none" : "";
    refreshHud();
  }
  function applyMode(mode) {
    hudMode = mode;
    if (mode === "wrong") {
      var wrongs = quizzes.filter(function (q) { var r = recOf(q); return r && r.r === 0; });
      showList(wrongs);
      if (!wrongs.length) announce("错题本是空的 —— 继续保持！");
    } else if (mode === "fav") {
      var favs = quizzes.filter(function (q) { return qFavs[q.__qid]; });
      showList(favs);
      if (!favs.length) announce("还没有收藏题 —— 点题卡右上角的 ☆");
    } else if (mode === "random") {
      var arr = quizzes.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      var picked = arr.slice(0, Math.min(randomCount, arr.length));
      showList(picked);
      announce("已随机抽取 " + picked.length + " 题");
    } else {
      applyFilter();
      announce("已按当前筛选显示题目");
    }
    refreshHud();
  }

  function buildHud(anchor, total) {
    var bar = document.createElement("div");
    bar.className = "quiz-hud";
    bar.innerHTML =
      '<div class="hud-stats">' +
        '<span class="hud-n">已答 <b>0</b> / ' + total + '</span>' +
        '<span class="hud-acc">正确率 <b>—</b></span>' +
        '<span class="hud-wrong">错题 <b>0</b></span>' +
        '<span class="hud-fav">收藏 <b>0</b></span>' +
        '<span class="hud-auto">进度自动保存在本机浏览器</span>' +
      '</div>' +
      '<div class="hud-actions">' +
        '<button data-hud="wrong" type="button">只看错题</button>' +
        '<button data-hud="fav" type="button">只看收藏</button>' +
        '<button data-hud="random" type="button">随机 ' + randomCount + ' 题</button>' +
        '<button data-hud="all" type="button">显示全部</button>' +
        '<button data-hud="reset" type="button">重置本页进度</button>' +
      '</div>' +
      '<div class="hud-msg"></div>' +
      '<div class="hud-warn"></div>';
    anchor.parentNode.insertBefore(bar, anchor);
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-hud]");
      if (!b) return;
      var m = b.getAttribute("data-hud");
      if (m === "reset") {
        if (!confirm("确定清空本页的答题进度？收藏不受影响。")) return;
        quizzes.forEach(function (q) { delete qStats[q.__qid]; q.__rec = null; });
        persist(true);
        location.reload();
        return;
      }
      if (m === "all") {
        hudMode = "all";
        applyFilter();
        return;
      }
      applyMode(m === hudMode ? "all" : m);
    });
    hudBar = bar;
    refreshHud();
  }

  function initQuiz(q) {
    var opts = q.querySelectorAll(".opt");
    var answer = q.getAttribute("data-answer");
    var picked = null;
    var btn = q.querySelector(".btn-ans");
    var res = q.querySelector(".q-res");
    var exp = q.querySelector(".q-exp");

    function paintSelected(v) {
      opts.forEach(function (o) { o.classList.toggle("sel", o.getAttribute("data-opt") === v); });
    }
    function saveDraft(v) {
      q.__rec = q.__rec || { r: null, h: null, d: null };
      q.__rec.d = v;
      qStats[q.__qid] = q.__rec;
      persist(true);
    }

    opts.forEach(function (o) {
      o.addEventListener("click", function () {
        if (q.getAttribute("data-done") === "1") return;
        picked = o.getAttribute("data-opt");
        paintSelected(picked);
        saveDraft(picked);
      });
    });

    var rec = recOf(q);
    if (rec && (rec.r === 0 || rec.r === 1)) {
      q.setAttribute("data-done", "1");
      opts.forEach(function (o) {
        var v = o.getAttribute("data-opt");
        if (v === answer) o.classList.add("right");
        else if (rec.d && v === rec.d && rec.r === 0) o.classList.add("wrong");
      });
      if (res) {
        res.textContent = rec.r === 1 ? "✅ 上次答对（已保存）" : "❌ 上次答错（正确答案是 " + answer + "）";
        res.className = "q-res " + (rec.r === 1 ? "good" : "bad");
      }
      if (btn) btn.textContent = "查看解析";
    } else if (rec && rec.d) {
      picked = rec.d;
      paintSelected(picked);
      if (res) { res.textContent = "已恢复上次选择（未提交）"; res.className = "q-res"; }
    }

    /* 收藏 */
    var head = q.querySelector(".q-head");
    if (head) {
      head.style.position = "relative";
      var star = document.createElement("button");
      star.className = "q-fav";
      star.type = "button";
      star.title = "收藏这道题";
      star.textContent = qFavs[q.__qid] ? "★" : "☆";
      if (qFavs[q.__qid]) star.classList.add("on");
      star.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (qFavs[q.__qid]) {
          delete qFavs[q.__qid];
          star.textContent = "☆";
          star.classList.remove("on");
        } else {
          qFavs[q.__qid] = 1;
          star.textContent = "★";
          star.classList.add("on");
        }
        saveJSON(FAV_KEY, qFavs);
        refreshHud();
      });
      head.appendChild(star);
    }

    if (btn) btn.addEventListener("click", function () {
      if (q.getAttribute("data-done") === "1") {
        exp.classList.toggle("show");
        btn.textContent = exp.classList.contains("show") ? "收起解析" : "查看解析";
        return;
      }
      if (!picked) {
        res.textContent = "先选一个答案再提交哦";
        res.className = "q-res";
        return;
      }
      q.setAttribute("data-done", "1");
      var ok = picked === answer;
      res.textContent = ok ? "✅ 答对了！" : "❌ 答错了，正确答案是 " + answer;
      res.className = "q-res " + (ok ? "good" : "bad");
      opts.forEach(function (o) {
        var v = o.getAttribute("data-opt");
        if (v === answer) o.classList.add("right");
        else if (v === picked) o.classList.add("wrong");
      });
      btn.textContent = "查看解析";
      exp.classList.add("show");
      q.__rec = { r: ok ? 1 : 0, d: picked };
      qStats[q.__qid] = q.__rec;
      persist();
      refreshHud();
      announce(ok ? "已保存 ✓" : "已保存 ✓ 并收入错题本，可点「只看错题」重做");
    });
  }

  /* ── 练习场筛选栏 ── */
  function buildFilterBar(bank) {
    var bar = document.createElement("div");
    bar.className = "filter-bar";
    var chapters = [1, 2, 3, 4, 5, 6, 7];
    var html = '<div class="filter-row"><span class="f-label">章节</span>' +
      '<button class="filter-btn on" data-fch="0" type="button">全部</button>';
    chapters.forEach(function (ch) {
      html += '<button class="filter-btn" data-fch="' + ch + '" type="button">' + ch + ' ' + CH_NAMES[ch] + '</button>';
    });
    html += '</div><div class="filter-row"><span class="f-label">难度</span>' +
      '<button class="filter-btn on" data-flv="" type="button">全部</button>' +
      '<button class="filter-btn" data-flv="basic" type="button">基础</button>' +
      '<button class="filter-btn" data-flv="mid" type="button">提高</button>' +
      '<button class="filter-btn" data-flv="real" type="button">真题改编</button>' +
      '<span class="filter-count" data-filter-count></span></div>' +
      '<div class="bank-empty" data-filter-empty style="display:none">当前筛选没有题目，换个条件试试。</div>';
    bar.innerHTML = html;
    bank.parentNode.insertBefore(bar, bank);
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filter-btn");
      if (!b) return;
      if (b.hasAttribute("data-fch")) {
        filterCh = Number(b.getAttribute("data-fch"));
        bar.querySelectorAll("[data-fch]").forEach(function (x) { x.classList.toggle("on", x === b); });
      } else {
        filterLevel = b.getAttribute("data-flv");
        bar.querySelectorAll("[data-flv]").forEach(function (x) { x.classList.toggle("on", x === b); });
      }
      hudMode = "all";
      applyFilter();
    });
    applyFilter();
  }

  /* ── 初始化 ── */
  var anchor = isBank ? bankBox : chapterBoxes[0];
  var total = quizzes.length;
  buildHud(anchor, total);
  quizzes.forEach(initQuiz);
  if (isBank) buildFilterBar(bankBox);
  refreshHud();
})();
