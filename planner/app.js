/* =========================================================
   데일리 4X 플래너 — 앱 로직
   - 날짜별 localStorage 저장
   - 시간표 / 운동 / 습관 / 메모 실시간 계산
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 상수 ---------------- */
  var STORE_KEY = 'daily4x.planner.v1';

  var CATS = [
    { key: 'BOOK',    color: '#7c5cd6', bg: '#f2ecfd', bd: '#d2c4f4', fg: '#6a4bc4' },
    { key: 'ENGLISH', color: '#0f9c96', bg: '#e7f4f3', bd: '#a9d8d5', fg: '#157f7b' },
    { key: 'ACTIVE',  color: '#2f5bb7', bg: '#e9eefb', bd: '#b7c8ef', fg: '#2c56b0' },
    { key: 'PASSIVE', color: '#5f6f86', bg: '#edf0f3', bd: '#c6cdd6', fg: '#566273' },
    { key: 'LIFE',    color: '#e0912f', bg: '#fbf0dc', bd: '#efd5a6', fg: '#b1792a' }
  ];
  var CAT_BY = {};
  CATS.forEach(function (c) { CAT_BY[c.key] = c; });

  var WEEK = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  var SETS = 10;

  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M5 12.5l4.4 4.4L19 7.6" fill="none" stroke="#fff" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------- 유틸 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function uid() { return Math.random().toString(36).slice(2, 9); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isoOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function parseISO(s) {
    var p = String(s).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function addDays(iso, n) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return isoOf(d);
  }

  function readText(el) {
    var t = el.innerText || el.textContent || '';
    t = t.replace(/\u00a0/g, ' ');
    return t.replace(/^\n+/, '').replace(/\s+$/, '');
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '0';
    var r = Math.round(n * 10) / 10;
    return (r % 1 === 0) ? String(r) : r.toFixed(1);
  }

  function blankVals() {
    var a = [];
    for (var i = 0; i < SETS; i++) a.push('');
    return a;
  }

  function parseTimeLabel(t) {
    var m = /^\s*(AM|PM)\s*(\d{1,2}):(\d{2})/i.exec(String(t || ''));
    if (!m) return null;
    var h = parseInt(m[2], 10) % 12;
    if (m[1].toUpperCase() === 'PM') h += 12;
    return { h: h, mi: parseInt(m[3], 10) };
  }
  function fmtTimeLabel(h24, mi) {
    var ap = h24 >= 12 ? 'PM' : 'AM';
    var h = h24 % 12; if (h === 0) h = 12;
    return ap + ' ' + h + ':' + pad2(mi || 0);
  }
  function splitTime(t) {
    var m = /^\s*(AM|PM)\s+(.*)$/i.exec(String(t || ''));
    if (!m) return { ap: '', tv: String(t || '') };
    return { ap: m[1].toUpperCase(), tv: m[2] };
  }

  /* ---------------- 상태 ---------------- */
  var state = loadStore();
  var date = state.lastDate || isoOf(new Date());
  var day = null;

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === 'object' && s.days) {
          if (!s.days || typeof s.days !== 'object') s.days = {};
          return s;
        }
      }
    } catch (e) { /* 저장소를 쓸 수 없으면 빈 상태로 시작 */ }
    return { v: 1, days: {}, lastDate: null };
  }

  var saveTimer = null;
  function save(quiet) {
    state.lastDate = date;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
      if (!quiet) flashSaved();
    }, 160);
  }
  var flagTimer = null;
  function flashSaved() {
    var f = $('#saveFlag');
    if (!f) return;
    f.classList.add('on');
    clearTimeout(flagTimer);
    flagTimer = setTimeout(function () { f.classList.remove('on'); }, 1400);
  }

  /* ---------------- 기본 템플릿 ---------------- */
  function defaultTimes() {
    var out = [];
    for (var i = 0; i < 24; i++) out.push(fmtTimeLabel((21 + i) % 24, 0));
    return out;
  }

  function newRow(time) {
    return { id: uid(), time: time, cat: '', action: '', pr: '', done: false, plan: '', set: '' };
  }

  function newItem(name, unit) {
    return { id: uid(), name: name, unit: unit, vals: blankVals() };
  }

  function blankDay() {
    return {
      rows: defaultTimes().map(function (t) { return newRow(t); }),
      fit: {
        sleep: '',
        weight: '',
        items: [
          newItem('턱걸이', '회'),
          newItem('덤벨프레스', '회'),
          newItem('유산소', '분'),
          newItem('스쿼트', '회'),
          newItem('윗몸일으키기', '회'),
          newItem('스트레칭', '분')
        ]
      },
      habits: [
        '4시 기상', '기상 후 소금물', '회화 30분', '영양제 먹기', '오전 운동 30분', '독서 30분'
      ].map(function (t) { return { id: uid(), text: t, done: false }; }),
      note: { keyword: [], idea: [], etc: [] }
    };
  }

  function normalize(d) {
    if (!d || typeof d !== 'object') return blankDay();
    if (!Array.isArray(d.rows)) d.rows = blankDay().rows;
    d.rows.forEach(function (r) {
      if (!r.id) r.id = uid();
      if (typeof r.time !== 'string') r.time = '';
      if (typeof r.cat !== 'string') r.cat = '';
      if (typeof r.action !== 'string') r.action = '';
      if (typeof r.plan !== 'string') r.plan = '';
      if (typeof r.pr !== 'string') r.pr = r.pr == null ? '' : String(r.pr);
      if (typeof r.set !== 'string') r.set = r.set == null ? '' : String(r.set);
      r.done = !!r.done;
    });
    if (!d.fit || typeof d.fit !== 'object') d.fit = blankDay().fit;
    if (!Array.isArray(d.fit.items)) d.fit.items = [];
    d.fit.items.forEach(function (it) {
      if (!it.id) it.id = uid();
      if (typeof it.name !== 'string') it.name = '';
      if (typeof it.unit !== 'string') it.unit = '';
      if (!Array.isArray(it.vals)) it.vals = blankVals();
      while (it.vals.length < SETS) it.vals.push('');
    });
    if (!Array.isArray(d.habits)) d.habits = [];
    d.habits.forEach(function (h) { if (!h.id) h.id = uid(); if (typeof h.text !== 'string') h.text = ''; h.done = !!h.done; });
    if (!d.note || typeof d.note !== 'object') d.note = { keyword: [], idea: [], etc: [] };
    ['keyword', 'idea', 'etc'].forEach(function (k) { if (!Array.isArray(d.note[k])) d.note[k] = []; });
    return d;
  }

  function getDay(iso) {
    var d = state.days[iso];
    if (!d) { d = blankDay(); state.days[iso] = d; }
    return normalize(d);
  }

  /* ---------------- 렌더: 상단 ---------------- */
  function renderHeader() {
    var d = parseISO(date);
    $('#dateLabel').textContent = d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
    $('#weekdayLabel').textContent = WEEK[d.getDay()];
    var picker = $('#datePicker');
    if (picker.value !== date) picker.value = date;
  }

  /* ---------------- 렌더: 요약 ---------------- */
  function renderSummary() {
    var rows = day.rows;
    var done = 0, total = 0, counts = {}, setVals = {};
    rows.forEach(function (r) {
      var hasText = String(r.action || '').trim() !== '' || String(r.plan || '').trim() !== '';
      if (r.done) done++;
      if (r.done || hasText) total++;
      var c = String(r.cat || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
      var s = String(r.set || '').trim();
      if (s) setVals[s] = true;
    });
    var pct = total ? Math.round((done / total) * 100) : 0;

    $('#gaugeNum').textContent = pct + '%';
    var fill = $('#gaugeFill');
    fill.style.strokeDasharray = pct + ' 100';
    fill.style.opacity = pct ? '1' : '0';
    $('#statDone').textContent = done;
    $('#statTotal').textContent = '/' + total;
    $('#statSet').textContent = Object.keys(setVals).length;

    var html = '';
    CATS.forEach(function (c) {
      var h = counts[c.key] || 0;
      html += '<div class="cat"><div class="cat-v">' + h + '<small>h</small></div>' +
        '<div class="cat-k"><i style="background:' + c.color + '"></i>' + c.key + '</div></div>';
    });
    $('#catSummary').innerHTML = html;
  }

  /* ---------------- 렌더: 시간표 ---------------- */
  function buildRuns(rows, get) {
    var out = [], i = 0;
    while (i < rows.length) {
      var v = get(rows[i]), n = 1;
      if (v !== '') {
        while (i + n < rows.length && get(rows[i + n]) === v) n++;
      }
      out.push({ i: i, n: n, v: v });
      i += n;
    }
    return out;
  }
  function indexRuns(runs) {
    var at = [];
    runs.forEach(function (r) { for (var k = 0; k < r.n; k++) at[r.i + k] = r; });
    return at;
  }
  function runIds(run) {
    var ids = [];
    for (var k = 0; k < run.n; k++) ids.push(day.rows[run.i + k].id);
    return ids.join(',');
  }

  function mkCell(rowIdx, col, span, extra) {
    var d = document.createElement('div');
    d.className = 'cell' + (extra ? ' ' + extra : '');
    d.style.gridRow = (rowIdx + 1) + ' / span ' + span;
    d.style.gridColumn = String(col);
    return d;
  }

  function mkCheck(row, extraCls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'check' + (extraCls ? ' ' + extraCls : '');
    b.setAttribute('data-act', 'toggle');
    b.setAttribute('data-row', row.id);
    b.setAttribute('aria-pressed', row.done ? 'true' : 'false');
    b.setAttribute('aria-label', row.done ? '완료 취소' : '완료로 표시');
    b.innerHTML = CHECK_SVG;
    return b;
  }

  function mkDel(row) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'row-del';
    b.setAttribute('data-act', 'row-del');
    b.setAttribute('data-row', row.id);
    b.setAttribute('aria-label', '이 행 삭제');
    b.title = '이 행 삭제';
    b.textContent = '×';
    return b;
  }

  function hydrateAction(text) {
    var raw = String(text || '');
    if (raw.trim() === '') return '';
    var lines = raw.split('\n');
    if (lines.length === 1) return '<span class="a-main">' + esc(lines[0]) + '</span>';
    return '<span class="a-main">' + esc(lines[0]) + '</span>\n' +
      '<span class="a-sub">' + esc(lines.slice(1).join('\n')) + '</span>';
  }

  function timeNode(text) {
    var parts = splitTime(text);
    var frag = document.createDocumentFragment();
    if (parts.ap) {
      var ap = document.createElement('span');
      ap.className = 'ap';
      ap.textContent = parts.ap;
      frag.appendChild(ap);
    }
    var tv = document.createElement('span');
    tv.className = 'tv';
    tv.textContent = parts.tv;
    frag.appendChild(tv);
    return frag;
  }

  function renderGrid() {
    var host = $('#gridDesktop');
    var rows = day.rows;
    host.innerHTML = '';

    var setAt = indexRuns(buildRuns(rows, function (r) { return String(r.set || '').trim(); }));
    var actAt = indexRuns(buildRuns(rows, function (r) { return String(r.action || '').trim(); }));
    var planAt = indexRuns(buildRuns(rows, function (r) { return String(r.plan || '').trim(); }));

    rows.forEach(function (row, i) {
      var hasSet = String(row.set || '').trim() !== '';

      /* --- SET --- */
      var sR = setAt[i];
      if (sR && sR.i === i) {
        var cellSet = mkCell(i, 1, sR.n, 'c-set');
        var setIn = document.createElement('input');
        setIn.type = 'text';
        setIn.className = 'set-in';
        setIn.inputMode = 'numeric';
        setIn.maxLength = 2;
        setIn.value = sR.v;
        setIn.setAttribute('data-edit', 'set');
        setIn.setAttribute('data-row', rows[sR.i].id);
        setIn.setAttribute('data-run', runIds(sR));
        setIn.setAttribute('aria-label', '세트 번호');
        if (sR.n >= 2) {
          var bar = document.createElement('div');
          bar.className = 'setbar';
          bar.appendChild(setIn);
          cellSet.appendChild(bar);
        } else {
          cellSet.appendChild(setIn);
        }
        host.appendChild(cellSet);
      }

      /* --- TIME --- */
      var cellTime = mkCell(i, 2, 1, 'c-time');
      var timeT = document.createElement('span');
      timeT.className = 'time-t';
      timeT.contentEditable = 'true';
      timeT.spellcheck = false;
      timeT.setAttribute('data-edit', 'time');
      timeT.setAttribute('data-row', row.id);
      timeT.appendChild(timeNode(row.time));
      cellTime.appendChild(timeT);
      cellTime.appendChild(mkDel(row));
      host.appendChild(cellTime);

      /* --- 분류 --- */
      var cellCat = mkCell(i, 3, 1, 'c-cat');
      var catBtn = document.createElement('button');
      catBtn.type = 'button';
      catBtn.className = 'cat-btn';
      catBtn.setAttribute('data-act', 'cat');
      catBtn.setAttribute('data-row', row.id);
      catBtn.setAttribute('aria-label', '분류 선택');
      if (CAT_BY[row.cat]) {
        var c = CAT_BY[row.cat];
        catBtn.innerHTML = '<span class="badge" style="background:' + c.bg +
          ';border-color:' + c.bd + ';color:' + c.fg + '">' + c.key + '</span>';
      } else {
        catBtn.innerHTML = '<span class="cat-empty">+</span>';
      }
      cellCat.appendChild(catBtn);
      host.appendChild(cellCat);

      /* --- ACTION --- */
      var aR = actAt[i];
      if (aR && aR.i === i) {
        var firstRow = rows[aR.i];
        var cellAct = mkCell(i, 4, aR.n, 'c-act' + (hasSet ? ' tint' : '') + (firstRow.done ? ' done' : ''));
        cellAct.contentEditable = 'true';
        cellAct.spellcheck = false;
        cellAct.setAttribute('data-edit', 'action');
        cellAct.setAttribute('data-row', firstRow.id);
        cellAct.setAttribute('data-run', runIds(aR));
        cellAct.setAttribute('aria-label', '계획 내용');
        cellAct.innerHTML = hydrateAction(aR.v);
        host.appendChild(cellAct);
      }

      /* --- 우선순위 --- */
      var cellPr = mkCell(i, 5, 1, 'c-pr' + (hasSet ? ' tint' : ''));
      var prIn = document.createElement('input');
      prIn.type = 'text';
      prIn.className = 'pr-in';
      prIn.inputMode = 'numeric';
      prIn.maxLength = 1;
      prIn.value = row.pr || '';
      prIn.setAttribute('data-edit', 'pr');
      prIn.setAttribute('data-row', row.id);
      prIn.setAttribute('aria-label', '우선순위');
      cellPr.appendChild(prIn);
      host.appendChild(cellPr);

      /* --- 체크 --- */
      var cellCk = mkCell(i, 6, 1, 'c-ck');
      cellCk.appendChild(mkCheck(row));
      host.appendChild(cellCk);

      /* --- PLAN --- */
      var pR = planAt[i];
      if (pR && pR.i === i) {
        var cellPlan = mkCell(i, 7, pR.n, 'c-plan');
        var box = document.createElement('div');
        box.className = 'plan-box';
        box.contentEditable = 'true';
        box.spellcheck = false;
        box.setAttribute('data-edit', 'plan');
        box.setAttribute('data-row', rows[pR.i].id);
        box.setAttribute('data-run', runIds(pR));
        box.setAttribute('aria-label', '플랜');
        box.textContent = pR.v;
        cellPlan.appendChild(box);
        host.appendChild(cellPlan);
      }
    });
  }

  function renderMobile() {
    var host = $('#gridMobile');
    var rows = day.rows;
    host.innerHTML = '';
    rows.forEach(function (row) {
      var hasSet = String(row.set || '').trim() !== '';
      var isEmpty = !hasSet && !row.cat && !row.done &&
        String(row.action || '').trim() === '' && String(row.plan || '').trim() === '';
      var card = document.createElement('div');
      card.className = 'm-row' + (hasSet ? ' tint' : '') + (row.done ? ' done' : '') + (isEmpty ? ' empty' : '');
      card.setAttribute('data-row', row.id);

      var top = document.createElement('div');
      top.className = 'm-top';

      if (hasSet) {
        var chip = document.createElement('span');
        chip.className = 'm-set';
        chip.innerHTML = '<span>SET</span>' + esc(String(row.set).trim());
        top.appendChild(chip);
      }

      var t = document.createElement('span');
      t.className = 'm-time';
      t.contentEditable = 'true';
      t.spellcheck = false;
      t.setAttribute('data-edit', 'time');
      t.setAttribute('data-row', row.id);
      t.appendChild(timeNode(row.time));
      top.appendChild(t);

      var catBtn = document.createElement('button');
      catBtn.type = 'button';
      catBtn.className = 'cat-btn m-cat';
      catBtn.setAttribute('data-act', 'cat');
      catBtn.setAttribute('data-row', row.id);
      catBtn.style.width = 'auto';
      if (CAT_BY[row.cat]) {
        var c = CAT_BY[row.cat];
        catBtn.innerHTML = '<span class="badge" style="background:' + c.bg +
          ';border-color:' + c.bd + ';color:' + c.fg + '">' + c.key + '</span>';
      } else {
        catBtn.innerHTML = '<span class="cat-empty">+</span>';
      }
      top.appendChild(catBtn);

      var prIn = document.createElement('input');
      prIn.type = 'text';
      prIn.className = 'm-pr';
      prIn.inputMode = 'numeric';
      prIn.maxLength = 1;
      prIn.value = row.pr || '';
      prIn.placeholder = '#';
      prIn.setAttribute('data-edit', 'pr');
      prIn.setAttribute('data-row', row.id);
      prIn.setAttribute('aria-label', '우선순위');
      top.appendChild(prIn);

      top.appendChild(mkCheck(row));
      top.appendChild(mkDel(row));
      card.appendChild(top);

      var act = document.createElement('div');
      act.className = 'm-act' + (row.done ? ' done' : '');
      act.contentEditable = 'true';
      act.spellcheck = false;
      act.setAttribute('data-edit', 'action');
      act.setAttribute('data-row', row.id);
      act.innerHTML = hydrateAction(row.action);
      card.appendChild(act);

      var plan = document.createElement('div');
      plan.className = 'm-plan';
      plan.contentEditable = 'true';
      plan.spellcheck = false;
      plan.setAttribute('data-edit', 'plan');
      plan.setAttribute('data-row', row.id);
      plan.textContent = row.plan || '';
      card.appendChild(plan);

      host.appendChild(card);
    });
  }

  /* ---------------- 렌더: FITNESS ---------------- */
  function sumOf(item) {
    return item.vals.reduce(function (a, v) { var n = parseFloat(v); return a + (isNaN(n) ? 0 : n); }, 0);
  }

  function renderFitness() {
    var fit = day.fit;
    $('#sleepIn').value = fit.sleep || '';
    $('#weightIn').value = fit.weight || '';

    var head = '';
    for (var i = 1; i <= SETS; i++) head += '<span>' + i + '</span>';
    $('#fitHead').innerHTML = head;

    var host = $('#fitRows');
    host.innerHTML = '';

    fit.items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'fit-row';
      row.setAttribute('data-fit', item.id);

      var name = document.createElement('div');
      name.className = 'fit-name';

      var n = document.createElement('span');
      n.className = 'n';
      n.contentEditable = 'true';
      n.spellcheck = false;
      n.setAttribute('data-edit', 'fitname');
      n.setAttribute('data-fit', item.id);
      n.textContent = item.name;

      var u = document.createElement('span');
      u.className = 'u';
      u.contentEditable = 'true';
      u.spellcheck = false;
      u.setAttribute('data-edit', 'fitunit');
      u.setAttribute('data-fit', item.id);
      u.textContent = item.unit;

      name.appendChild(n);
      name.appendChild(u);
      row.appendChild(name);

      var cells = document.createElement('div');
      cells.className = 'fit-cells';
      for (var s = 0; s < SETS; s++) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'fit-in';
        inp.inputMode = 'numeric';
        inp.value = item.vals[s] == null ? '' : String(item.vals[s]);
        inp.setAttribute('data-fit', item.id);
        inp.setAttribute('data-idx', String(s));
        inp.setAttribute('aria-label', (item.name || '운동') + ' ' + (s + 1) + '세트');
        cells.appendChild(inp);
      }
      row.appendChild(cells);

      var total = document.createElement('div');
      total.className = 'fit-total';
      var sum = sumOf(item);
      var entered = item.vals.some(function (v) { return String(v == null ? '' : v).trim() !== ''; });
      total.textContent = entered ? fmtNum(sum) : '';
      if (!entered) total.classList.add('zero');
      row.appendChild(total);

      host.appendChild(row);
    });
  }

  /* ---------------- 렌더: HABITS ---------------- */
  function renderHabits() {
    var host = $('#habitRows');
    host.innerHTML = '';
    day.habits.forEach(function (h) {
      var item = document.createElement('div');
      item.className = 'habit' + (h.done ? ' done' : '');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'check';
      btn.setAttribute('data-act', 'habit');
      btn.setAttribute('data-id', h.id);
      btn.setAttribute('aria-pressed', h.done ? 'true' : 'false');
      btn.setAttribute('aria-label', h.text || '습관');
      btn.innerHTML = CHECK_SVG;

      var txt = document.createElement('span');
      txt.className = 'habit-t';
      txt.contentEditable = 'true';
      txt.spellcheck = false;
      txt.textContent = h.text;
      txt.setAttribute('data-edit', 'habit');
      txt.setAttribute('data-id', h.id);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'habit-del';
      del.setAttribute('data-act', 'habit-del');
      del.setAttribute('data-id', h.id);
      del.setAttribute('aria-label', '습관 삭제');
      del.textContent = '×';

      item.appendChild(btn);
      item.appendChild(txt);
      item.appendChild(del);
      host.appendChild(item);
    });

    var done = day.habits.filter(function (h) { return h.done; }).length;
    $('#habitCount').textContent = done + '/' + day.habits.length;
  }

  /* ---------------- 렌더: NOTE ---------------- */
  function renderNote() {
    $$('[data-note]').forEach(function (el) {
      var key = el.getAttribute('data-note');
      var lines = day.note[key] || [];
      if (!lines.length || !lines.join('').trim()) {
        el.innerHTML = '<div><br></div>';
        el.classList.add('ph');
      } else {
        el.innerHTML = lines.map(function (l) {
          return '<div>' + (l ? esc(l) : '<br>') + '</div>';
        }).join('');
        el.classList.remove('ph');
      }
    });
  }

  /* ---------------- 전체 렌더 ---------------- */
  function render() {
    renderHeader();
    renderSummary();
    renderGrid();
    renderMobile();
    renderFitness();
    renderHabits();
    renderNote();
    save(true);
  }

  /* ---------------- 날짜 이동 ---------------- */
  function setDate(iso) {
    date = iso;
    state.lastDate = iso;
    day = getDay(iso);
    closeCatMenu();
    render();
  }

  /* ---------------- 분류 팝오버 ---------------- */
  var catMenuEl = $('#catMenu');
  var catTarget = null;

  function openCatMenu(btn, row) {
    var html = CATS.map(function (c) {
      return '<button type="button" data-cat="' + c.key + '"><i style="background:' + c.color +
        '"></i>' + c.key + '</button>';
    }).join('');
    html += '<button type="button" data-cat=""><i class="none"></i>없음</button>';
    catMenuEl.innerHTML = html;
    catMenuEl.hidden = false;
    catTarget = row.id;

    var r = btn.getBoundingClientRect();
    var w = catMenuEl.offsetWidth, h = catMenuEl.offsetHeight;
    var left = r.left + r.width / 2 - w / 2;
    var top = r.bottom + 6;
    if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
    if (left < 10) left = 10;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 6);
    catMenuEl.style.left = left + 'px';
    catMenuEl.style.top = top + 'px';
  }

  function closeCatMenu() {
    catMenuEl.hidden = true;
    catTarget = null;
  }

  /* ---------------- 토스트 / 되돌리기 ---------------- */
  var toastEl = $('#toast');
  var toastTextEl = $('#toastText');
  var toastUndoEl = $('#toastUndo');
  var toastTimer = null;
  var undoFn = null;

  function showToast(msg, undo) {
    toastTextEl.textContent = msg;
    undoFn = undo || null;
    toastUndoEl.hidden = !undoFn;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; undoFn = null; }, 6000);
  }

  toastUndoEl.addEventListener('click', function () {
    if (undoFn) { var f = undoFn; undoFn = null; toastEl.hidden = true; f(); }
  });

  function snap() { return JSON.stringify(day); }
  function restore(json) {
    try {
      day = normalize(JSON.parse(json));
      state.days[date] = day;
      render();
    } catch (e) { /* 무시 */ }
  }

  /* ---------------- 편집 처리 ---------------- */
  function visibleRoot() {
    return window.matchMedia('(max-width: 700px)').matches ? $('#gridMobile') : $('#gridDesktop');
  }

  function rowById(id) {
    for (var i = 0; i < day.rows.length; i++) if (day.rows[i].id === id) return day.rows[i];
    return null;
  }

  function handleEdit(el) {
    var kind = el.getAttribute('data-edit');
    if (!kind) return;

    if (kind === 'action' || kind === 'plan' || kind === 'time') {
      var text = readText(el);
      var ids = String(el.getAttribute('data-run') || el.getAttribute('data-row') || '').split(',');
      ids.forEach(function (id) {
        var row = rowById(id);
        if (!row) return;
        row[kind] = text;
      });
      if (kind !== 'time') renderSummary();
      save();
      return;
    }

    if (kind === 'pr') {
      var prText = (el.value || '').replace(/[^0-9]/g, '').slice(0, 1);
      if (el.value !== prText) el.value = prText;
      var prRow = rowById(el.getAttribute('data-row'));
      if (prRow) { prRow.pr = prText; save(); }
      return;
    }

    if (kind === 'set') {
      var setText = (el.value || '').replace(/[^0-9]/g, '').slice(0, 2);
      if (el.value !== setText) el.value = setText;
      var setIds = String(el.getAttribute('data-run') || el.getAttribute('data-row') || '').split(',');
      setIds.forEach(function (id) {
        var r = rowById(id);
        if (r) r.set = setText;
      });
      save();
      return;
    }

    if (kind === 'habit') {
      var id = el.getAttribute('data-id');
      var habit = day.habits.filter(function (h) { return h.id === id; })[0];
      if (habit) { habit.text = readText(el); save(); }
      return;
    }

    if (kind === 'fitname' || kind === 'fitunit') {
      var fid = el.getAttribute('data-fit');
      var item = day.fit.items.filter(function (it) { return it.id === fid; })[0];
      if (item) {
        item[kind === 'fitname' ? 'name' : 'unit'] = readText(el);
        save();
      }
      return;
    }
  }

  /* ---------------- 삭제/추가 ---------------- */
  function toggleRow(id, btn) {
    var row = rowById(id);
    if (!row) return;
    var before = snap();
    row.done = !row.done;
    render();
    if (btn) {
      var fresh = visibleRoot().querySelector('[data-act="toggle"][data-row="' + id + '"]');
      if (fresh) fresh.classList.add('bump');
    }
    // 완료 취소도 되돌릴 수 있게 두지 않고, 통계만 갱신
    void before;
  }

  function deleteRow(id) {
    var before = snap();
    day.rows = day.rows.filter(function (r) { return r.id !== id; });
    render();
    showToast('행을 삭제했어요', function () { restore(before); });
  }

  function addRow() {
    var last = day.rows[day.rows.length - 1];
    var label = '';
    if (last) {
      var p = parseTimeLabel(last.time);
      label = p ? fmtTimeLabel((p.h + 1) % 24, p.mi) : '';
    }
    if (!label) label = fmtTimeLabel(21, 0);
    day.rows.push(newRow(label));
    render();
    var root = visibleRoot();
    var lastRow = day.rows[day.rows.length - 1];
    var target = root.querySelector('[data-edit="action"][data-row="' + lastRow.id + '"]');
    if (target) target.focus();
    var card = root.querySelector('.m-row[data-row="' + lastRow.id + '"]');
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function toggleHabit(id, btn) {
    var h = day.habits.filter(function (x) { return x.id === id; })[0];
    if (!h) return;
    h.done = !h.done;
    renderHabits();
    var fresh = $('#habitRows').querySelector('[data-act="habit"][data-id="' + id + '"]');
    if (fresh) fresh.classList.add('bump');
    void btn;
    save();
  }

  function addHabit() {
    var before = snap();
    var h = { id: uid(), text: '새 습관', done: false };
    day.habits.push(h);
    renderHabits();
    save();
    var el = $('#habitRows').querySelector('[data-edit="habit"][data-id="' + h.id + '"]');
    if (el) {
      el.focus();
      var r = document.createRange();
      r.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
    showToast('습관을 추가했어요', function () { restore(before); });
  }

  function deleteHabit(id) {
    var before = snap();
    day.habits = day.habits.filter(function (h) { return h.id !== id; });
    renderHabits();
    save();
    showToast('습관을 삭제했어요', function () { restore(before); });
  }

  function addFitItem() {
    var before = snap();
    var item = newItem('새 운동', '회');
    day.fit.items.push(item);
    renderFitness();
    save();
    var el = $('#fitRows').querySelector('[data-edit="fitname"][data-fit="' + item.id + '"]');
    if (el) {
      el.focus();
      var r = document.createRange();
      r.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
    showToast('운동 항목을 추가했어요', function () { restore(before); });
  }

  function resetDay() {
    if (!window.confirm('오늘 기록을 모두 지우고 빈 틀로 되돌릴까요?')) return;
    var before = snap();
    day = blankDay();
    state.days[date] = day;
    render();
    showToast('오늘 기록을 초기화했어요', function () { restore(before); });
  }

  function copyPrev() {
    var prevISO = addDays(date, -1);
    var prev = state.days[prevISO] ? normalize(state.days[prevISO]) : null;
    if (!prev) {
      showToast('전날 기록이 아직 없어요.');
      return;
    }
    if (!window.confirm(prevISO + ' 루틴을 오늘로 가져올까요? 오늘 적은 내용은 덮어씁니다.')) return;
    var before = snap();
    var nd = blankDay();
    nd.rows = prev.rows.map(function (r) {
      return { id: uid(), time: r.time, cat: r.cat, action: r.action, pr: r.pr, done: false, plan: r.plan, set: r.set };
    });
    nd.fit = {
      sleep: '', weight: '',
      items: prev.fit.items.map(function (it) {
        return { id: uid(), name: it.name, unit: it.unit, vals: blankVals() };
      })
    };
    nd.habits = prev.habits.map(function (h) { return { id: uid(), text: h.text, done: false }; });
    day = nd;
    state.days[date] = nd;
    render();
    showToast('전날 루틴을 가져왔어요', function () { restore(before); });
  }

  /* ---------------- 이벤트 ---------------- */
  document.addEventListener('click', function (e) {
    // 분류 메뉴
    var inMenu = catMenuEl.contains(e.target);
    if (inMenu) {
      var pick = e.target.closest('[data-cat]');
      if (pick && catTarget) {
        var row = rowById(catTarget);
        if (row) {
          row.cat = pick.getAttribute('data-cat');
          save();
          closeCatMenu();
          renderSummary();
          renderGrid();
          renderMobile();
          return;
        }
      }
      closeCatMenu();
      return;
    }
    if (!catMenuEl.hidden && !e.target.closest('[data-act="cat"]')) closeCatMenu();

    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');

    if (act === 'toggle') { e.preventDefault(); toggleRow(el.getAttribute('data-row'), el); }
    else if (act === 'cat') { e.preventDefault(); var r = rowById(el.getAttribute('data-row')); if (r) openCatMenu(el, r); }
    else if (act === 'row-del') { e.preventDefault(); deleteRow(el.getAttribute('data-row')); }
    else if (act === 'habit') { e.preventDefault(); toggleHabit(el.getAttribute('data-id'), el); }
    else if (act === 'habit-del') { e.preventDefault(); deleteHabit(el.getAttribute('data-id')); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;

    if (el.getAttribute && el.getAttribute('data-note')) {
      el.classList.remove('ph');
      var key = el.getAttribute('data-note');
      var lines = (el.innerText || '').replace(/\u00a0/g, ' ').split('\n');
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      day.note[key] = lines;
      save();
      return;
    }

    if (el.getAttribute && el.getAttribute('data-idx') !== null && el.getAttribute('data-fit')) {
      var item = day.fit.items.filter(function (it) { return it.id === el.getAttribute('data-fit'); })[0];
      if (!item) return;
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var v = (el.value || '').replace(/[^0-9.]/g, '');
      if (el.value !== v) el.value = v;
      item.vals[idx] = v;
      var rowEl = el.closest('.fit-row');
      if (rowEl) {
        var t = rowEl.querySelector('.fit-total');
        var sum = sumOf(item);
        var hasVal = item.vals.some(function (x) { return String(x == null ? '' : x).trim() !== ''; });
        if (t) { t.textContent = hasVal ? fmtNum(sum) : ''; t.classList.toggle('zero', !hasVal); }
      }
      save();
      return;
    }

    if (el.getAttribute && el.getAttribute('data-edit')) {
      if (el.getAttribute('data-edit') === 'fitname' || el.getAttribute('data-edit') === 'fitunit') {
        var it = day.fit.items.filter(function (x) { return x.id === el.getAttribute('data-fit'); })[0];
        if (it) {
          it[el.getAttribute('data-edit') === 'fitname' ? 'name' : 'unit'] = readText(el);
          save();
        }
        return;
      }
      handleEdit(el);
      return;
    }

    if (el.id === 'sleepIn') { day.fit.sleep = (el.value || '').replace(/[^0-9.]/g, ''); if (el.value !== day.fit.sleep) el.value = day.fit.sleep; save(); return; }
    if (el.id === 'weightIn') { day.fit.weight = (el.value || '').replace(/[^0-9.]/g, ''); if (el.value !== day.fit.weight) el.value = day.fit.weight; save(); return; }
  });

  // 엔터: 아래 칸으로 이동 (한 줄 입력 칸)
  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (e.key === 'Escape') {
      if (el.isContentEditable) { el.blur(); e.preventDefault(); }
      if (!catMenuEl.hidden) { closeCatMenu(); e.preventDefault(); }
      return;
    }
    if (e.key !== 'Enter') return;

    var kind = el.getAttribute('data-edit');
    if (!kind) return;

    if (kind === 'action' || kind === 'plan') {
      if (e.shiftKey) return; // 줄바꿈
      e.preventDefault();
      moveFocus(el, kind);
      return;
    }
    if (kind === 'time' || kind === 'habit' || kind === 'fitname' || kind === 'fitunit') {
      e.preventDefault();
      el.blur();
    }
  });

  function moveFocus(el, kind) {
    var rowId = el.getAttribute('data-row');
    var idx = -1;
    for (var i = 0; i < day.rows.length; i++) if (day.rows[i].id === rowId) { idx = i; break; }
    if (idx < 0) return;
    var root = visibleRoot();
    for (var j = idx + 1; j < day.rows.length; j++) {
      var t = root.querySelector('[data-edit="' + kind + '"][data-row="' + day.rows[j].id + '"]');
      if (t) { t.focus(); return; }
    }
    el.blur();
  }

  // 편집을 마치면 병합/취소선 등을 다시 그림
  document.addEventListener('focusout', function (e) {
    var el = e.target;
    if (!el || !el.isContentEditable) return;
    if (!el.closest('#gridDesktop') && !el.closest('#gridMobile')) return;
    setTimeout(function () {
      var active = document.activeElement;
      if (active && active.isContentEditable) return;
      if (active && active.closest && active.closest('#gridDesktop, #gridMobile')) return;
      renderGrid();
      renderMobile();
      renderSummary();
    }, 0);
  });

  window.addEventListener('resize', function () {
    if (!catMenuEl.hidden) closeCatMenu();
  });

  document.addEventListener('scroll', function () {
    if (!catMenuEl.hidden) closeCatMenu();
  }, true);

  $('#prevDay').addEventListener('click', function () { setDate(addDays(date, -1)); });
  $('#nextDay').addEventListener('click', function () { setDate(addDays(date, 1)); });

  var picker = $('#datePicker');
  function openPicker() {
    picker.value = date;
    if (typeof picker.showPicker === 'function') {
      try { picker.showPicker(); return; } catch (err) { /* fallback */ }
    }
    picker.focus();
    picker.click();
  }
  $('#weekdayLabel').addEventListener('click', openPicker);
  picker.addEventListener('change', function () { if (picker.value) setDate(picker.value); });

  $('#addRow').addEventListener('click', addRow);
  $('#addHabit').addEventListener('click', addHabit);
  $('#addFit').addEventListener('click', addFitItem);
  $('#resetDay').addEventListener('click', resetDay);
  $('#copyPrev').addEventListener('click', copyPrev);

  // PWA 설치
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    $('#installBtn').hidden = false;
  });
  $('#installBtn').addEventListener('click', function () {
    if (!deferredPrompt) { $('#installBtn').hidden = true; return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      $('#installBtn').hidden = true;
    });
  });
  window.addEventListener('appinstalled', function () { $('#installBtn').hidden = true; });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* 오프라인 캐시 없이도 동작 */ });
    });
  }

  /* ---------------- 시작 ---------------- */
  day = getDay(date);
  state.lastDate = date;
  render();
})();
