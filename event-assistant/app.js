/* ==========================================================
   체험단 · 이벤트 비서 — app.js
   정적 웹앱 · localStorage 저장 · 서버 전송 없음
   ========================================================== */
(function () {
  'use strict';

  window.__eaErrors = window.__eaErrors || [];
  window.addEventListener('error', function (e) {
    window.__eaErrors.push(String((e && e.message) || e));
  });

  var KEY = 'event-assistant.v1';
  var NOTI_KEY = 'event-assistant.notified';
  var SEED = (window.EA_SEED || []).map(function (o) { return Object.assign({}, o); });
  var STATUS = { wait: '대기', win: '당첨', lost: '미당첨', done: '완료' };
  var CATS = ['체험단', '이벤트', '공모전'];

  var state = { items: [], filter: 'all', q: '', editingId: null };

  /* ---------- 도우미 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return toKey(new Date()); }
  function parseKey(k) {
    if (!k) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(k));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function dayDiff(a, b) {
    var A = parseKey(a), B = parseKey(b);
    if (!A || !B) return null;
    return Math.round((A.getTime() - B.getTime()) / 86400000);
  }
  function md(k) { var d = parseKey(k); return d ? (d.getMonth() + 1) + '.' + pad(d.getDate()) : ''; }
  function mdw(k) { var d = parseKey(k); return d ? md(k) + ' (' + '일월화수목금토'.charAt(d.getDay()) + ')' : ''; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }

  /* ---------- 저장 ---------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw) { state.items = SEED.map(clean); return; }
    try {
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('bad');
      state.items = arr.map(clean).filter(function (it) { return it.title; });
    } catch (e) {
      state.items = SEED.map(clean);
    }
  }
  function clean(o) {
    o = o || {};
    var st = STATUS[o.status] ? o.status : 'wait';
    var cat = CATS.indexOf(o.cat) >= 0 ? o.cat : '이벤트';
    return {
      id: String(o.id || ('u' + Math.random().toString(36).slice(2, 9))),
      cat: cat,
      title: String(o.title || '').trim(),
      org: String(o.org || '').trim(),
      applied: o.applied || '',
      announce: o.announce || null,
      due: o.due || null,
      prize: String(o.prize || '').trim(),
      link: String(o.link || '').trim(),
      memo: String(o.memo || '').trim(),
      status: st
    };
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state.items)); }
    catch (e) { toast('저장 공간이 부족해 저장하지 못했어요'); }
  }

  /* ---------- D-day ---------- */
  function badge(it) {
    var t = todayKey();
    if (it.status === 'lost') return { text: '미당첨', cls: 'd-dead' };
    if (it.status === 'done') return { text: '완료', cls: 'd-dead' };
    if (it.status === 'win') {
      if (!it.due) return { text: '리뷰 대기', cls: 'd-ok' };
      var n = dayDiff(it.due, t);
      if (n > 0) return { text: '리뷰 D-' + n, cls: n <= 3 ? 'd-soon' : 'd-ok' };
      if (n === 0) return { text: '리뷰 D-DAY', cls: 'd-today' };
      return { text: '기한 ' + (-n) + '일 지남', cls: 'd-over' };
    }
    if (!it.announce) return { text: '발표일 미정', cls: 'd-none' };
    var d = dayDiff(it.announce, t);
    if (d > 0) return { text: 'D-' + d, cls: d <= 3 ? 'd-soon' : 'd-ok' };
    if (d === 0) return { text: 'D-DAY', cls: 'd-today' };
    return { text: '발표 D+' + (-d), cls: 'd-over' };
  }

  function groupOf(it) {
    if (it.status === 'win') return 'win';
    if (it.status === 'lost' || it.status === 'done') return 'end';
    return it.announce ? 'wait' : 'undated';
  }
  var GROUPS = [
    { key: 'wait', label: '발표 대기', hint: '가까운 발표일 순' },
    { key: 'win', label: '당첨 · 리뷰 중', hint: '리뷰 마감 순' },
    { key: 'undated', label: '발표일 미정', hint: '개별 문자 · DM 안내' },
    { key: 'end', label: '미당첨 · 완료', hint: '최근 순' }
  ];

  function sortKey(it) {
    if (it.status === 'wait') return it.announce || '9999-12-31';
    if (it.status === 'win') return it.due || it.announce || '9999-12-31';
    return it.announce || it.applied || '0000-01-01';
  }
  function sortItems(a, b) {
    var ga = GROUPS.map(function (g) { return g.key; }).indexOf(groupOf(a));
    var gb = GROUPS.map(function (g) { return g.key; }).indexOf(groupOf(b));
    if (ga !== gb) return ga - gb;
    var endGroup = groupOf(a) === 'end';
    var ka = sortKey(a), kb = sortKey(b);
    if (ka !== kb) return endGroup ? (ka < kb ? 1 : -1) : (ka < kb ? -1 : 1);
    return a.title.localeCompare(b.title, 'ko');
  }

  function haystack(it) {
    return norm([it.title, it.org, it.prize, it.memo, it.cat, STATUS[it.status]].join(' '));
  }

  function matchFilter(it) {
    var f = state.filter;
    if (f === 'all') return true;
    var t = todayKey();
    if (f === 'soon') {
      if (it.status === 'wait') {
        if (it.announce && dayDiff(it.announce, t) <= 3) return true;
        if (it.due && dayDiff(it.due, t) <= 3) return true;
        return false;
      }
      if (it.status === 'win') {
        if (!it.due) return true;
        return dayDiff(it.due, t) <= 3;
      }
      return false;
    }
    if (f === 'wait') return it.status === 'wait';
    if (f === 'win') return it.status === 'win';
    if (f === 'end') return it.status === 'lost' || it.status === 'done';
    return true;
  }

  /* ---------- 오늘 브리핑 ---------- */
  function briefing() {
    var t = todayKey();
    var rows = [];
    var seen = {};
    function push(tag, tone, it, dd, w) {
      if (seen[it.id]) return;
      seen[it.id] = 1;
      rows.push({ tag: tag, tone: tone, it: it, dd: dd, w: w });
    }
    state.items.forEach(function (it) {
      if (it.status === 'lost' || it.status === 'done') return;
      if (it.status === 'wait') {
        if (it.announce) {
          var n = dayDiff(it.announce, t);
          if (n === 0) push('오늘 발표', 'hot', it, 'D-DAY', 0);
          else if (n < 0) push('확인 필요', 'warn', it, 'D+' + (-n), -6);
          else if (n <= 3) push('발표 임박', '', it, 'D-' + n, 10 + n);
        }
        if (it.due) {
          var d = dayDiff(it.due, t);
          if (d === 0) push('오늘 마감', 'hot', it, '마감', 1);
          else if (d < 0) push('마감 지남', 'warn', it, 'D+' + (-d), -5);
          else if (d <= 3) push('마감 임박', '', it, 'D-' + d, 20 + d);
        }
      } else if (it.status === 'win' && it.due) {
        var w = dayDiff(it.due, t);
        if (w === 0) push('리뷰 마감', 'hot', it, 'D-DAY', 2);
        else if (w < 0) push('리뷰 지남', 'warn', it, 'D+' + (-w), -4);
        else if (w <= 3) push('리뷰 임박', '', it, 'D-' + w, 30 + w);
      }
    });
    rows.sort(function (a, b) { return a.w - b.w; });
    return rows;
  }

  function nextUp() {
    var t = todayKey();
    var best = null;
    state.items.forEach(function (it) {
      if (it.status !== 'wait' || !it.announce) return;
      var n = dayDiff(it.announce, t);
      if (n < 0) return;
      if (!best || n < best.n) best = { it: it, n: n };
    });
    return best;
  }

  /* ---------- 렌더 ---------- */
  function render() {
    renderHeader();
    renderToday();
    renderStats();
    renderTabs();
    renderList();
  }

  function renderHeader() {
    var waiting = state.items.filter(function (i) { return i.status === 'wait'; }).length;
    var todayN = briefing().filter(function (r) { return r.tone === 'hot'; }).length;
    $('#brandSub').textContent = 'gene · ' + state.items.length + '건 관리 · 오늘 ' + todayN + '건';
    $('#menuSub').textContent = '대기 ' + waiting + '건 · 전체 ' + state.items.length + '건';
    if (window.Notification && Notification.permission === 'granted') {
      $('#btnBell').classList.add('on');
      var ms = $('#mNotifySub');
      if (ms) ms.textContent = '알림 켜짐 · 눌러서 테스트';
    }
  }

  function renderToday() {
    var d = new Date();
    $('#todayDate').innerHTML = (d.getMonth() + 1) + '월 ' + d.getDate() + '일' +
      '<span>' + '일월화수목금토'.charAt(d.getDay()) + '요일</span>';

    var rows = briefing();
    $('#todayCount').innerHTML = '<b>' + rows.length + '</b>건 확인';

    var host = $('#todayList');
    if (!rows.length) {
      var nx = nextUp();
      host.innerHTML = '<div class="today-empty">오늘 발표도 마감도 없어요.<br>' +
        (nx
          ? '가장 가까운 일정은 <b>D-' + nx.n + ' · ' + esc(nx.it.title) + '</b> 입니다.'
          : '새 일정을 추가하면 여기에서 챙겨 드립니다.') +
        '</div>';
      $('#todayMore').hidden = true;
      return;
    }
    var limit = 4;
    var shown = rows.slice(0, limit);
    host.innerHTML = shown.map(function (r) {
      return '<button class="today-row ' + r.tone + '" type="button" data-goto="' + esc(r.it.id) + '">' +
        '<span class="tag">' + esc(r.tag) + '</span>' +
        '<span class="tt">' + esc(r.it.title) + '</span>' +
        '<span class="dd">' + esc(r.dd) + '</span>' +
        '</button>';
    }).join('');
    var more = $('#todayMore');
    if (rows.length > limit) {
      more.hidden = false;
      more.textContent = '임박한 일정 ' + (rows.length - limit) + '건 더 보기 →';
    } else {
      more.hidden = true;
    }
  }

  function renderStats() {
    var t = todayKey();
    var wait = 0, win = 0, end = 0;
    state.items.forEach(function (it) {
      if (it.status === 'wait') wait++;
      else if (it.status === 'win') win++;
      else end++;
    });
    var soon = briefing().length;
    var cells = [
      { k: 'wait', cls: 'wait', n: wait, label: '발표 대기' },
      { k: 'soon', cls: 'soon', n: soon, label: '오늘 · 임박' },
      { k: 'win', cls: 'win', n: win, label: '당첨 · 리뷰' },
      { k: 'end', cls: 'end', n: end, label: '종료' }
    ];
    $('#stats').innerHTML = cells.map(function (c) {
      return '<button class="stat ' + c.cls + '" type="button" data-filter="' + c.k + '"' +
        (state.filter === c.k ? ' style="outline:2px solid #c2410c;outline-offset:-2px"' : '') + '>' +
        '<b>' + c.n + '</b><span>' + c.label + '</span></button>';
    }).join('');
  }

  function renderTabs() {
    var q = norm(state.q);
    function count(f) {
      return state.items.filter(function (it) {
        var save = state.filter;
        state.filter = f;
        var ok = matchFilter(it);
        state.filter = save;
        if (!ok) return false;
        return !q || haystack(it).indexOf(q) >= 0;
      }).length;
    }
    var tabs = [
      { k: 'all', label: '전체' },
      { k: 'soon', label: '오늘 · 임박' },
      { k: 'wait', label: '발표 대기' },
      { k: 'win', label: '당첨 · 리뷰' },
      { k: 'end', label: '종료' }
    ];
    $('#tabs').innerHTML = tabs.map(function (t) {
      var n = count(t.k);
      return '<button class="tab' + (state.filter === t.k ? ' on' : '') + '" type="button" data-filter="' + t.k + '"' +
        ' role="tab" aria-selected="' + (state.filter === t.k) + '">' + t.label + ' <i>' + n + '</i></button>';
    }).join('');
  }

  function cardHTML(it) {
    var b = badge(it);
    var urgent = b.cls === 'd-today' || b.cls === 'd-soon';
    var past = b.cls === 'd-over';
    var cls = 'card s-' + it.status + (urgent ? ' urgent' : '') + (past ? ' past' : '');

    var meta = [];
    if (it.announce) meta.push('<div class="key"><dt>발표</dt><dd>' + esc(mdw(it.announce)) + '</dd></div>');
    if (it.due) meta.push('<div><dt>' + (it.status === 'win' ? '리뷰 마감' : '마감') + '</dt><dd>' + esc(mdw(it.due)) + '</dd></div>');
    if (it.applied) meta.push('<div><dt>응모</dt><dd>' + esc(md(it.applied)) + '</dd></div>');

    var link = it.link
      ? '<a class="open-link" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer">원문 ↗</a>'
      : '<span class="open-link none">링크 없음</span>';

    var seg = Object.keys(STATUS).map(function (s) {
      return '<button type="button" data-act="status" data-status="' + s + '"' +
        (it.status === s ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + STATUS[s] + '</button>';
    }).join('');

    return '<article class="' + cls + '" data-id="' + esc(it.id) + '">' +
      '<div class="card-top">' +
        '<span class="chip c-' + esc(it.cat) + '">' + esc(it.cat) + '</span>' +
        '<span class="dday ' + b.cls + '">' + esc(b.text) + '</span>' +
        '<button class="edit-btn" type="button" data-act="edit" aria-label="수정">✎</button>' +
      '</div>' +
      '<h3 class="title">' + esc(it.title) + '</h3>' +
      (it.org ? '<div class="org">' + esc(it.org) + '</div>' : '') +
      (meta.length ? '<dl class="meta">' + meta.join('') + '</dl>' : '') +
      (it.prize ? '<p class="prize"><span>🎁</span><span>' + esc(it.prize) + '</span></p>' : '') +
      (it.memo ? '<p class="memo' + (/필수|구독|서명|대기|지남/.test(it.memo) ? ' hot' : '') + '"><span>📌</span><span>' + esc(it.memo) + '</span></p>' : '') +
      '<div class="card-foot">' + link + '<div class="seg" role="group" aria-label="단계 변경">' + seg + '</div></div>' +
      '</article>';
  }

  function renderList() {
    var q = norm(state.q);
    var items = state.items.filter(function (it) {
      return matchFilter(it) && (!q || haystack(it).indexOf(q) >= 0);
    }).sort(sortItems);

    var host = $('#listHost');
    if (!items.length) {
      var msg = state.q
        ? { ico: '🔎', t: '“' + esc(state.q) + '” 검색 결과가 없어요', p: '다른 단어로 찾아보거나 검색을 지워 주세요.' }
        : (state.filter === 'win'
          ? { ico: '🏆', t: '아직 당첨 항목이 없어요', p: '발표일이 되면 카드에서 [당첨]을 눌러 단계를 옮기면 됩니다.' }
          : state.filter === 'end'
            ? { ico: '🗂', t: '종료된 항목이 없어요', p: '[미당첨]이나 [완료]로 바꾼 항목이 여기에 모입니다.' }
            : { ico: '📋', t: '표시할 항목이 없어요', p: '아래 + 버튼으로 새 일정을 추가해 보세요.' });
      host.innerHTML = '<div class="empty"><div class="ico">' + msg.ico + '</div><b>' + msg.t + '</b><p>' + msg.p + '</p></div>';
      return;
    }

    var byGroup = {};
    items.forEach(function (it) {
      var g = groupOf(it);
      (byGroup[g] = byGroup[g] || []).push(it);
    });
    var shownGroups = GROUPS.filter(function (g) { return byGroup[g.key] && byGroup[g.key].length; });
    var multi = shownGroups.length > 1;

    host.innerHTML = shownGroups.map(function (g) {
      var list = byGroup[g.key];
      return '<section class="group">' +
        (multi ? '<div class="group-head"><h2>' + g.label + '</h2><span class="n">' + list.length + '</span><span class="hint">' + g.hint + '</span></div>' : '') +
        '<div class="list">' + list.map(cardHTML).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  /* ---------- 시트 열고 닫기 ---------- */
  var openSheetEl = null;
  function openSheet(el) {
    closeSheet(true);
    openSheetEl = el;
    $('#scrim').classList.add('on');
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('on'); });
    document.body.style.overflow = 'hidden';
  }
  function closeSheet(instant) {
    var el = openSheetEl;
    if (!el) { $('#scrim').classList.remove('on'); document.body.style.overflow = ''; return; }
    el.classList.remove('on');
    openSheetEl = null;
    $('#scrim').classList.remove('on');
    document.body.style.overflow = '';
    if (instant) { el.hidden = true; return; }
    setTimeout(function () { if (!el.classList.contains('on')) el.hidden = true; }, 280);
  }

  /* ---------- 편집기 ---------- */
  function openEditor(id) {
    state.editingId = id || null;
    var it = id ? state.items.filter(function (x) { return x.id === id; })[0] : null;
    $('#editH').textContent = it ? '일정 수정' : '새 일정 추가';
    $('#fTitle').value = it ? it.title : '';
    $('#fCat').value = it ? it.cat : '체험단';
    $('#fStatus').value = it ? it.status : 'wait';
    $('#fOrg').value = it ? it.org : '';
    $('#fApplied').value = it ? (it.applied || '') : todayKey();
    $('#fAnnounce').value = it && it.announce ? it.announce : '';
    $('#fDue').value = it && it.due ? it.due : '';
    $('#fPrize').value = it ? it.prize : '';
    $('#fLink').value = it ? it.link : '';
    $('#fMemo').value = it ? it.memo : '';
    $('#btnDelete').hidden = !it;
    openSheet($('#editSheet'));
    if (!it) setTimeout(function () { $('#fTitle').focus(); }, 300);
  }

  function saveEditor() {
    var title = $('#fTitle').value.trim();
    if (!title) { toast('제목을 입력해 주세요'); $('#fTitle').focus(); return; }
    var link = $('#fLink').value.trim();
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link.replace(/^\/+/, '');

    var data = clean({
      id: state.editingId || ('u' + Date.now()),
      cat: $('#fCat').value,
      title: title,
      org: $('#fOrg').value,
      applied: $('#fApplied').value || '',
      announce: $('#fAnnounce').value || null,
      due: $('#fDue').value || null,
      prize: $('#fPrize').value,
      link: link,
      memo: $('#fMemo').value,
      status: $('#fStatus').value
    });

    if (state.editingId) {
      state.items = state.items.map(function (it) { return it.id === state.editingId ? data : it; });
    } else {
      state.items.unshift(data);
    }
    persist();
    closeSheet();
    render();
    toast(state.editingId ? '수정했어요' : '추가했어요');
  }

  function deleteCurrent() {
    if (!state.editingId) return;
    var it = state.items.filter(function (x) { return x.id === state.editingId; })[0];
    if (!it) return;
    if (!confirm('“' + it.title + '”을(를) 삭제할까요?')) return;
    state.items = state.items.filter(function (x) { return x.id !== state.editingId; });
    persist();
    closeSheet();
    render();
    toast('삭제했어요');
  }

  /* ---------- 알림 ---------- */
  function canNotify() { return 'Notification' in window; }

  function notify(title, body) {
    if (!canNotify() || Notification.permission !== 'granted') return false;
    try {
      new Notification(title, { body: body, icon: './icon-192.png', badge: './icon-192.png', tag: 'event-assistant' });
      return true;
    } catch (e) { return false; }
  }

  function bellAction() {
    if (!canNotify()) { toast('이 브라우저는 알림을 지원하지 않아요'); return; }
    if (Notification.permission === 'granted') { testNotify(); return; }
    if (Notification.permission === 'denied') {
      toast('알림이 차단되어 있어요. 주소창 옆 자물쇠 → 알림 허용으로 바꿔 주세요');
      return;
    }
    Notification.requestPermission().then(function (p) {
      renderHeader();
      if (p === 'granted') { toast('알림을 켰어요'); testNotify(); }
      else toast('알림 권한이 허용되지 않았어요');
    });
  }

  function testNotify() {
    var rows = briefing().filter(function (r) { return r.tone === 'hot'; });
    if (!rows.length) {
      rows = briefing().slice(0, 2);
    }
    if (!rows.length) {
      notify('체험단 · 이벤트 비서', '알림이 잘 도착했어요. 오늘 챙길 일정은 없습니다.');
      toast('테스트 알림을 보냈어요');
      return;
    }
    var title = '오늘 챙길 것 · ' + rows.length + '건';
    var body = rows.slice(0, 3).map(function (r) { return r.tag + ' · ' + r.it.title; }).join('\n');
    notify(title, body);
    toast('테스트 알림을 보냈어요');
  }

  function autoNotify() {
    if (!canNotify() || Notification.permission !== 'granted') return;
    var t = todayKey();
    var last = null;
    try { last = localStorage.getItem(NOTI_KEY); } catch (e) {}
    if (last === t) return;
    var rows = briefing().filter(function (r) { return r.tone === 'hot' || r.tone === 'warn'; });
    if (!rows.length) return;
    try { localStorage.setItem(NOTI_KEY, t); } catch (e) {}
    notify('오늘 챙길 것 · ' + rows.length + '건',
      rows.slice(0, 3).map(function (r) { return r.tag + ' · ' + r.it.title; }).join('\n'));
  }

  /* ---------- 캘린더(.ics) ---------- */
  function icsText(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function compact(k) { return String(k).replace(/-/g, ''); }
  function stamp() {
    var d = new Date();
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function addDays(k, n) {
    var d = parseKey(k);
    if (!d) return k;
    d.setDate(d.getDate() + n);
    return toKey(d);
  }
  function eventLines(it, kind, day, timed) {
    var desc = [it.org, it.prize ? '경품: ' + it.prize : '', it.memo ? '메모: ' + it.memo : '', it.link || '']
      .filter(Boolean).join('\n');
    var out = [
      'BEGIN:VEVENT',
      'UID:' + it.id + '-' + kind + '@event-assistant',
      'DTSTAMP:' + stamp(),
      'SUMMARY:' + icsText('[' + kind + '] ' + it.title)
    ];
    if (timed) {
      // 발표는 14:00 KST(=05:00Z) 기준, 30분 전 알림
      out.push('DTSTART:' + compact(day) + 'T050000Z');
      out.push('DTEND:' + compact(day) + 'T053000Z');
    } else {
      out.push('DTSTART;VALUE=DATE:' + compact(day));
      out.push('DTEND;VALUE=DATE:' + compact(addDays(day, 1)));
    }
    out.push('DESCRIPTION:' + icsText(desc));
    if (it.link) out.push('URL:' + it.link);
    if (timed) {
      out.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(it.title), 'END:VALARM');
    }
    out.push('END:VEVENT');
    return out;
  }
  function buildICS() {
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gene//event-assistant//KO',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:체험단 · 이벤트 비서', 'X-WR-TIMEZONE:Asia/Seoul'
    ];
    var count = 0;
    state.items.forEach(function (it) {
      if (it.status === 'lost' || it.status === 'done') return;
      if (it.announce) { lines = lines.concat(eventLines(it, '발표', it.announce, true)); count++; }
      if (it.due) { lines = lines.concat(eventLines(it, '마감', it.due, false)); count++; }
    });
    lines.push('END:VCALENDAR');
    return { text: lines.join('\r\n'), count: count };
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function exportICS() {
    var r = buildICS();
    if (!r.count) { toast('내보낼 발표일·마감일이 없어요'); return; }
    download('event-assistant-' + todayKey().replace(/-/g, '') + '.ics', r.text, 'text/calendar;charset=utf-8');
    toast(r.count + '개 일정을 캘린더 파일로 내보냈어요');
  }

  /* ---------- 백업 / 복원 / 초기화 ---------- */
  function exportJSON() {
    var payload = { app: 'event-assistant', version: 1, exportedAt: new Date().toISOString(), items: state.items };
    download('event-assistant-backup-' + todayKey() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('백업 파일을 저장했어요');
  }
  function importJSON(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var obj = JSON.parse(String(fr.result).replace(/^\ufeff/, ''));
        var arr = Array.isArray(obj) ? obj : obj.items;
        if (!Array.isArray(arr)) throw new Error('bad');
        var cleanArr = arr.map(clean).filter(function (it) { return it.title; });
        if (!cleanArr.length) throw new Error('empty');
        if (!confirm('현재 목록(' + state.items.length + '건)을 백업 파일(' + cleanArr.length + '건)로 바꿀까요?')) return;
        state.items = cleanArr;
        persist();
        render();
        toast(cleanArr.length + '건을 복원했어요');
      } catch (e) {
        toast('백업 파일을 읽지 못했어요 (.json 파일인지 확인해 주세요)');
      }
    };
    fr.readAsText(file);
  }
  function reseed() {
    var have = {};
    state.items.forEach(function (it) { have[it.id] = 1; });
    var added = 0;
    SEED.forEach(function (s) { if (!have[s.id]) { state.items.push(clean(s)); added++; } });
    if (!added) { toast('이미 기본 일정이 모두 들어 있어요'); return; }
    persist(); render();
    toast('기본 일정 ' + added + '건을 추가했어요');
  }
  function resetAll() {
    if (!confirm('모든 기록을 지우고 기본 일정(' + SEED.length + '건)으로 되돌릴까요? 이 작업은 되돌릴 수 없습니다.')) return;
    state.items = SEED.map(clean);
    persist(); render();
    toast('기본 일정으로 초기화했어요');
  }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* ---------- 이벤트 연결 ---------- */
  function bind() {
    $('#btnBell').addEventListener('click', bellAction);
    $('#btnNotify').addEventListener('click', bellAction);
    $('#btnMenu').addEventListener('click', function () { openSheet($('#menuSheet')); });
    $('#scrim').addEventListener('click', function () { closeSheet(); });
    $('#fab').addEventListener('click', function () { openEditor(null); });
    $('#btnSave').addEventListener('click', saveEditor);
    $('#editForm').addEventListener('submit', function (e) { e.preventDefault(); saveEditor(); });
    $('#btnCancel').addEventListener('click', function () { closeSheet(); });
    $('#btnDelete').addEventListener('click', deleteCurrent);
    $('#btnIcs').addEventListener('click', exportICS);
    $('#mIcs').addEventListener('click', function () { closeSheet(); exportICS(); });
    $('#mNotify').addEventListener('click', function () { closeSheet(); setTimeout(bellAction, 250); });
    $('#mExport').addEventListener('click', function () { closeSheet(); exportJSON(); });
    $('#mImport').addEventListener('click', function () { $('#restoreFile').click(); });
    $('#mReseed').addEventListener('click', function () { closeSheet(); reseed(); });
    $('#mReset').addEventListener('click', function () { closeSheet(); resetAll(); });
    $('#restoreFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) { closeSheet(); setTimeout(function () { importJSON(f); }, 220); }
      e.target.value = '';
    });

    $('#todayMore').addEventListener('click', function () {
      setFilter('soon');
      document.querySelector('.tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#todayList').addEventListener('click', function (e) {
      var row = e.target.closest('[data-goto]');
      if (!row) return;
      var id = row.getAttribute('data-goto');
      var card = document.querySelector('.card[data-id="' + id + '"]');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.transition = 'box-shadow .3s ease';
        card.style.boxShadow = '0 0 0 3px #f0a374';
        setTimeout(function () { card.style.boxShadow = ''; }, 1400);
      } else {
        setFilter('all');
        $('#q').value = '';
        state.q = '';
        setTimeout(function () {
          var c2 = document.querySelector('.card[data-id="' + id + '"]');
          if (c2) c2.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      }
    });

    $('#listHost').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var card = btn.closest('.card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'edit') { openEditor(id); return; }
      if (act === 'status') {
        var next = btn.getAttribute('data-status');
        var it = state.items.filter(function (x) { return x.id === id; })[0];
        if (!it || it.status === next) return;
        it.status = next;
        persist();
        render();
        toast('“' + it.title.slice(0, 18) + (it.title.length > 18 ? '…' : '') + '” → ' +
          ({ wait: '발표 대기', win: '당첨 · 리뷰 중', lost: '미당첨', done: '완료' })[next]);
      }
    });

    $('#stats').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (b) setFilter(b.getAttribute('data-filter'));
    });
    $('#tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (b) setFilter(b.getAttribute('data-filter'));
    });

    var q = $('#q');
    q.addEventListener('input', function () {
      state.q = q.value;
      $('#searchWrap').classList.toggle('filled', !!q.value);
      renderTabs(); renderList();
    });
    $('#qClear').addEventListener('click', function () {
      q.value = ''; state.q = '';
      $('#searchWrap').classList.remove('filled');
      renderTabs(); renderList();
      q.focus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSheet();
    });
  }

  function setFilter(f) {
    state.filter = f;
    render();
  }

  /* ---------- 시작 ---------- */
  load();
  bind();
  render();
  autoNotify();

  // 홈 화면 바로가기(?new=1)로 열면 추가 화면을 바로 띄웁니다.
  try {
    if (new URLSearchParams(location.search).get('new') === '1') {
      setTimeout(function () { openEditor(null); }, 260);
    }
  } catch (e) {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();
