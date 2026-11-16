/* ==========================================================
   🎛️ gene 덱 · deck.js
   진근 님(gene) 기준 타일판 — 실제 동작·실제 링크만 사용
   · 해이 상태·작업 수: ../status.json (실제 파일)
   · PC 타일: 기존 PC 브릿지 API (app.js 의 api/pushText/launchApp 재사용)
   · D-Day·타이머·확인 시각: 이 폰 localStorage
   ========================================================== */
(function () {
  'use strict';

  var PREF_K = 'genedeck.v1';
  var EL = function (id) { return document.getElementById(id); };

  /* 상위 app.js 의 state 는 전역 어휘 스코프 const 라 window 에 없습니다.
     없을 수도 있으니 참조를 try 로 감쌉니다. */
  function appState() { try { return state; } catch (e) { return null; } }

  var prefs = {
    oled: false,
    wake: false,
    threadsAt: 0,
    dd: [],
    timer: { dur: 25 * 60000, end: 0, remain: 25 * 60000, run: false }
  };

  /* ---------------- 저장 ---------------- */
  function loadPrefs() {
    try {
      var raw = JSON.parse(localStorage.getItem(PREF_K) || 'null');
      if (raw && typeof raw === 'object') {
        if (typeof raw.oled === 'boolean') prefs.oled = raw.oled;
        if (typeof raw.wake === 'boolean') prefs.wake = raw.wake;
        if (typeof raw.threadsAt === 'number') prefs.threadsAt = raw.threadsAt;
        if (Array.isArray(raw.dd)) prefs.dd = raw.dd.filter(function (d) { return d && d.label && d.date; });
        if (raw.timer && typeof raw.timer === 'object') {
          var t = raw.timer;
          prefs.timer.dur = Math.max(60000, Number(t.dur) || 25 * 60000);
          prefs.timer.remain = Math.max(0, Number(t.remain) || 0);
          prefs.timer.end = Number(t.end) || 0;
          prefs.timer.run = !!t.run && prefs.timer.end > 0;
        }
      }
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_K, JSON.stringify(prefs)); } catch (e) {}
  }

  /* ---------------- 날짜 계산 ---------------- */
  function today0() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function parseDay(str) {
    var p = String(str || '').split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function daysTo(dateStr, yearly) {
    var d = parseDay(dateStr);
    if (!d) return null;
    var t0 = today0();
    if (yearly) {
      d = new Date(t0.getFullYear(), d.getMonth(), d.getDate());
      if (d.getTime() < t0.getTime()) d = new Date(t0.getFullYear() + 1, d.getMonth(), d.getDate());
    }
    return Math.round((d.getTime() - t0.getTime()) / 86400000);
  }
  function ddText(n) {
    if (n == null) return '—';
    if (n === 0) return 'D-DAY';
    return n > 0 ? 'D-' + n : 'D+' + (-n);
  }
  function ddShort(d) {
    if (!d) return '—';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  var DEF_DD = [
    { icon: '⛺', label: '고삼저수지 차박', date: '2026-11-20' },
    { icon: '🎆', label: '올해 마지막 날', date: '2026-12-31', yearly: true }
  ];

  /* ---------------- 타일 그리기 ---------------- */
  function section(name) {
    return '<div class="dsec">' + name + '</div>';
  }

  function gridHTML() {
    return '' +
      /* 시계 · 날씨 */
      '<div class="tile hero" role="group" aria-label="시계와 날씨">' +
        '<div class="clockrow"><span class="clockbig" id="dClock">--:--</span><span class="clocksec" id="dSec">--</span></div>' +
        '<div class="datebig" id="dDate">—</div>' +
        '<div class="wxrow" id="dWx"><span class="wxchip">날씨 불러오는 중…</span></div>' +
      '</div>' +

      /* 해이 상태 */
      '<button class="tile haei span2" data-act="staff">' +
        '<div class="trow"><span class="dico">ㅎ</span>' +
          '<div style="min-width:0"><div class="ttl">해이 (피클)</div><div class="tsub" id="dHaeiSub">사단장 · 총괄 지휘</div></div>' +
          '<span class="tmeta" id="dHaeiMeta">—</span></div>' +
        '<div class="tbig" id="dHaeiTask">AI 지휘실 상태 불러오는 중…</div>' +
        '<div class="tline" id="dHaeiLog">최근 활동 로그를 불러옵니다</div>' +
        '<div class="tchips" id="dHaeiChips"></div>' +
      '</button>' +

      section('AI 지휘') +
      tileLink('🎤', '음성 지휘', '「해이, 출석체크 해줘」처럼 말로', '../index.html?tab=voice', 'ai') +
      tileLink('👔', '전문 자문단', '변호사 · 회계사 · CD 역할별 보드', '../index.html?tab=advisor', 'ai') +
      tileLink('🧠', '노션 AI 본부', '16칸 본부 · 모든 AI 공용 기억', 'https://app.notion.com/p/gene-AI-418dcae81cc081b8873ac0d72de949db', 'ai') +
      tileLink('🏢', 'AI 지휘실', '19명 오피스 · 살아 움직이는 화면', '../index.html', 'ai') +

      section('PC 원격 제어') +
      '<button class="tile pc" data-act="capture">' +
        '<div class="trow"><span class="dico">📸</span><div style="min-width:0"><div class="ttl">PC 화면 캡처</div></div></div>' +
        '<div class="tline" style="margin-top:auto">누르면 PC 화면을 캡처해 이 폰에 띄웁니다</div>' +
      '</button>' +
      '<button class="tile pc" data-act="clip">' +
        '<div class="trow"><span class="dico">📋</span><div style="min-width:0"><div class="ttl">클립보드 전송</div></div></div>' +
        '<div class="tline" style="margin-top:auto">보낸 글은 PC에서 Ctrl+V로 붙여넣기</div>' +
      '</button>' +
      '<button class="tile pc" data-act="apps">' +
        '<div class="trow"><span class="dico">🗂️</span><div style="min-width:0"><div class="ttl">앱 실행 · 700곡</div></div></div>' +
        '<div class="tline" style="margin-top:auto">탐색기로 오디오 폴더를 엽니다</div>' +
      '</button>' +
      '<button class="tile pc" data-act="cfg">' +
        '<div class="trow"><span class="dico">🖥️</span><div style="min-width:0"><div class="ttl">PC 연결 상태</div><div class="tsub" id="dPcSub">설정에서 주소·토큰</div></div></div>' +
        '<div class="tbig" id="dPcState">확인 중…</div>' +
        '<div class="tchips" id="dPcChips"></div>' +
      '</button>' +

      section('수입 · SNS') +
      '<button class="tile sns span2" data-act="threads">' +
        '<div class="trow"><span class="dico">🧵</span>' +
          '<div style="min-width:0"><div class="ttl">스레드 @ogenegun</div><div class="tsub" id="dThreadAgo">눌러서 열기 · 확인 시각 기록</div></div>' +
          '<span class="tmeta">↗</span></div>' +
        '<div class="tline" style="margin-top:auto">쿠팡 파트너스 3회/일 — 07:30 · 13:00 · 19:30</div>' +
      '</button>' +
      tileLink('📝', '네이버 블로그', 'dynamic4516 · 매일 3편', 'https://blog.naver.com/dynamic4516', 'sns') +
      tileLink('🛍️', '쿠팡 파트너스', '링크 생성 · 실적 확인', 'https://partners.coupang.com', 'sns') +

      section('일상 · D-Day') +
      '<div id="dDdWrap" style="display:contents"></div>' +
      '<div class="tile timer span2" id="dTimer" role="group" aria-label="집중 타이머">' +
        '<div class="trow"><span class="dico">⏱️</span>' +
          '<div style="min-width:0"><div class="ttl">집중 타이머</div><div class="tsub" id="dTimerSub">시작을 누르면 카운트다운</div></div>' +
          '<span class="tmeta" id="dTimerMeta">대기</span></div>' +
        '<div class="timerrow"><span class="timerval" id="dTimerVal">25:00</span>' +
          '<button class="timerdur" data-act="tdur" aria-label="시간 길이 바꾸기">25분 ▸</button></div>' +
        '<div class="timerbar"><i id="dTimerBar"></i></div>' +
        '<div class="timerbtns"><button class="tbtn go" data-act="tstart" id="dTStart">시작</button>' +
        '<button class="tbtn" data-act="treset">리셋</button></div>' +
      '</div>' +

      section('화면 · 표시') +
      '<button class="tile util" data-act="full" id="dFull">' +
        '<div class="trow"><span class="dico">⛶</span><div style="min-width:0"><div class="ttl">전체화면</div><div class="tsub">주소창 없이</div></div></div>' +
        '<div class="tline" style="margin-top:auto" id="dFullSub">누르면 꽉 찬 화면</div>' +
      '</button>' +
      '<button class="tile util" data-act="wake" id="dWake">' +
        '<div class="trow"><span class="dico">💡</span><div style="min-width:0"><div class="ttl">화면 켜짐</div><div class="tsub">꺼짐 방지</div></div></div>' +
        '<div class="tline" style="margin-top:auto" id="dWakeSub">탭하면 켜짐 유지</div>' +
      '</button>' +
      '<button class="tile util" data-act="oled" id="dOled">' +
        '<div class="trow"><span class="dico">🌙</span><div style="min-width:0"><div class="ttl">OLED 보호</div><div class="tsub">저휘도 · 미세 이동</div></div></div>' +
        '<div class="tline" style="margin-top:auto" id="dOledSub">밤에 켜 두세요</div>' +
      '</button>' +
      '<button class="tile util" data-act="refresh">' +
        '<div class="trow"><span class="dico">⟳</span><div style="min-width:0"><div class="ttl">전체 새로고침</div><div class="tsub">PC·날씨·상태</div></div></div>' +
        '<div class="tline" style="margin-top:auto">모든 값을 다시 읽습니다</div>' +
      '</button>';
  }

  function tileLink(icon, title, sub, url, cls) {
    return '<button class="tile ' + (cls || '') + '" data-act="url" data-url="' + url + '">' +
      '<div class="trow"><span class="dico">' + icon + '</span>' +
        '<div style="min-width:0"><div class="ttl">' + title + '</div></div>' +
        '<span class="tmeta">↗</span></div>' +
      '<div class="tline" style="margin-top:auto">' + sub + '</div>' +
      '</button>';
  }

  /* ---------------- D-Day 렌더 ---------------- */
  function renderDd() {
    var wrap = EL('dDdWrap');
    if (!wrap) return;
    var all = DEF_DD.concat(prefs.dd.map(function (d) {
      return { icon: d.icon || '📌', label: d.label, date: d.date, custom: true };
    }));
    wrap.innerHTML = all.map(function (d) {
      var n = daysTo(d.date, d.yearly);
      var pd = parseDay(d.date);
      var cls = 'tile dd util' + (n === 0 ? ' today' : '');
      return '<button class="' + cls + '" data-act="dd" title="' + String(d.label).replace(/"/g, '') + '">' +
        '<div class="dleft">' + (d.icon || '📌') + ' ' + esc(d.label) + '</div>' +
        '<div class="dday">' + ddText(n) + '</div>' +
        '<div class="ddate">' + ddShort(pd) + (d.yearly ? ' · 해마다' : '') + '</div>' +
        '</button>';
    }).join('') +
      '<button class="tile dd add" data-act="dd"><span class="plus">＋</span><span style="font-size:11px;font-weight:800">D-Day 추가</span></button>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- 시계 · 날씨 ---------------- */
  var WDAY = ['일', '월', '화', '수', '목', '금', '토'];
  var wxSig = '';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function renderClock() {
    var n = new Date();
    var c = EL('dClock'), s = EL('dSec'), d = EL('dDate');
    if (c) c.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes());
    if (s) s.textContent = pad2(n.getSeconds());
    if (d) d.textContent = (n.getMonth() + 1) + '월 ' + n.getDate() + '일 (' + WDAY[n.getDay()] + ') · ' +
      (n.getHours() < 12 ? '오전' : '오후') + (n.getHours() % 12 || 12) + '시대';
  }

  function renderWx() {
    var box = EL('dWx');
    if (!box) return;
    var S = appState();
    var wx = (S && S.wx) || {};
    var a = wx.anseong, c = wx.changwon;
    var sig = JSON.stringify([a && [a.temp, a.label, a.min, a.max], c && [c.temp, c.label, c.min, c.max]]);
    if (sig === wxSig) return;
    wxSig = sig;
    if (!a && !c) {
      box.innerHTML = '<span class="wxchip">날씨 불러오는 중…</span>';
      return;
    }
    var one = function (name, w) {
      if (!w) return '<span class="wxchip">' + name + ' <b>—</b></span>';
      return '<span class="wxchip">' + name + ' <b>' + w.temp + '°</b>' + esc(w.label) +
        ' <small>' + w.min + '° / ' + w.max + '°</small></span>';
    };
    box.innerHTML = one('안성', a) + one('창원', c);
  }

  /* ---------------- 해이 상태 (status.json) ---------------- */
  var officeAt = 0;

  function loadOffice() {
    if (Date.now() - officeAt < 20000) return;
    officeAt = Date.now();
    fetch('../status.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) applyOffice(j); })
      .catch(function () {});
  }

  function applyOffice(j) {
    var staff = Array.isArray(j.staff) ? j.staff : [];
    var haei = null;
    for (var i = 0; i < staff.length; i++) if (staff[i] && staff[i].id === 'haei') haei = staff[i];
    var stats = j.stats || {};
    var logs = Array.isArray(j.logs) ? j.logs : [];

    var sub = EL('dHaeiSub'), task = EL('dHaeiTask'), log = EL('dHaeiLog'),
        meta = EL('dHaeiMeta'), chips = EL('dHaeiChips');
    if (haei) {
      if (sub) sub.textContent = (haei.rank || '사단장') + ' · ' + (haei.dept || '지휘부');
      if (task) task.textContent = haei.task || haei.role || '대기 중';
    }
    if (meta) meta.textContent = logs[0] && logs[0].time ? logs[0].time : '—';
    if (log) {
      log.textContent = logs[0]
        ? '최근 ' + logs[0].time + ' · ' + logs[0].who + ' — ' + logs[0].text
        : '활동 로그가 아직 없습니다';
    }
    if (chips) {
      var out = [];
      if (stats.progress != null) out.push('<span>진행 ' + stats.progress + '</span>');
      if (stats.waiting != null) out.push('<span>대기 ' + stats.waiting + '</span>');
      if (stats.done != null) out.push('<span>완료 ' + stats.done + '</span>');
      if (j.updated_at) out.push('<span>status.json ' + String(j.updated_at).slice(5) + '</span>');
      chips.innerHTML = out.join('');
    }
  }

  /* ---------------- PC 연결 상태 ---------------- */
  function renderPc() {
    var st = EL('dPcState'), sub = EL('dPcSub'), chips = EL('dPcChips');
    if (!st) return;
    var S = appState() || {};
    var conn = S.conn || { mode: 'offline' };
    var sys = S.sys || {};
    var host = String(((S.cfg && S.cfg.bridge) || '')).replace(/^https?:\/\//, '');
    if (conn.mode === 'live') {
      st.textContent = '연결됨';
      if (sub) sub.textContent = sys.host || host || 'PC 브릿지';
      if (chips) {
        var c = [];
        if (sys.cpu != null) c.push('<span>CPU ' + Math.round(sys.cpu) + '%</span>');
        if (sys.ram != null) c.push('<span>RAM ' + Math.round(sys.ram) + '%</span>');
        if (sys.bat != null) c.push('<span>배터리 ' + Math.round(sys.bat) + '%</span>');
        chips.innerHTML = c.join('');
      }
    } else if (conn.mode === 'auth') {
      st.textContent = '토큰 필요';
      if (sub) sub.textContent = '서버는 켜져 있어요 · 토큰 확인';
      if (chips) chips.innerHTML = '';
    } else {
      st.textContent = '오프라인';
      if (sub) sub.textContent = host || '설정에서 주소·토큰';
      if (chips) chips.innerHTML = '<span>start_bridge.bat 실행</span>';
    }
  }

  /* ---------------- 스레드 확인 시각 ---------------- */
  function renderThreads() {
    var el = EL('dThreadAgo');
    if (!el) return;
    if (!prefs.threadsAt) { el.textContent = '눌러서 열기 · 확인 시각 기록'; return; }
    el.textContent = '마지막 확인 ' + agoText(prefs.threadsAt);
  }

  /* ---------------- 타이머 ---------------- */
  var DURS = [5, 15, 25, 50, 90];

  function fmtTimer(ms) {
    var s = Math.ceil(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + pad2(m) : String(m).padStart(2, '0')) + ':' + pad2(ss);
  }

  function renderTimer() {
    var T = prefs.timer;
    var rem = T.run ? Math.max(0, T.end - Date.now()) : T.remain;
    var pct = T.dur ? Math.max(0, Math.min(100, (1 - rem / T.dur) * 100)) : 0;
    var v = EL('dTimerVal'), bar = EL('dTimerBar'), btn = EL('dTStart'),
        meta = EL('dTimerMeta'), dur = document.querySelector('.timerdur'), box = EL('dTimer'),
        sub = EL('dTimerSub');
    if (v) v.textContent = fmtTimer(rem);
    if (bar) bar.style.width = pct.toFixed(1) + '%';
    if (btn) btn.textContent = T.run ? '정지' : (rem > 0 && rem < T.dur ? '계속' : '시작');
    if (meta) meta.textContent = T.run ? '집중' : (rem > 0 && rem < T.dur ? '멈춤' : '대기');
    if (dur) dur.textContent = Math.round(T.dur / 60000) + '분 ▸';
    if (box) box.classList.toggle('running', !!T.run);
    if (sub) sub.textContent = T.run ? '집중 중 · 정지를 누르면 멈춰요'
      : rem <= 0 ? '끝났어요 · 리셋해서 다시 시작'
      : rem < T.dur ? '멈춤 · 계속을 누르세요' : '시작을 누르면 카운트다운';
  }

  function timerStart() {
    var T = prefs.timer;
    if (T.run) {
      T.remain = Math.max(0, T.end - Date.now());
      T.run = false; T.end = 0;
      savePrefs(); renderTimer();
      return;
    }
    if (T.remain <= 0) T.remain = T.dur;
    T.end = Date.now() + T.remain;
    T.run = true;
    savePrefs(); renderTimer();
    if (window.toast) toast('집중 타이머 ' + Math.round(T.dur / 60000) + '분 시작');
  }

  function timerReset() {
    var T = prefs.timer;
    T.run = false; T.end = 0; T.remain = T.dur;
    savePrefs(); renderTimer();
    if (window.toast) toast('타이머를 리셋했어요');
  }

  function timerCycle() {
    var T = prefs.timer;
    var cur = Math.round(T.dur / 60000);
    var i = DURS.indexOf(cur);
    var next = DURS[(i + 1) % DURS.length];
    T.dur = next * 60000;
    T.run = false; T.end = 0; T.remain = T.dur;
    savePrefs(); renderTimer();
    if (window.toast) toast('타이머 ' + next + '분으로 설정');
  }

  function timerDone() {
    prefs.timer.remain = 0; prefs.timer.run = false; prefs.timer.end = 0;
    savePrefs();
    if (navigator.vibrate) { try { navigator.vibrate([140, 90, 140, 90, 240]); } catch (e) {} }
    if (window.toast) toast('⏱️ 집중 타이머 끝 — 잠깐 쉬어요');
  }

  /* ---------------- 전체화면 · 화면 켜짐 · OLED ---------------- */
  function paintFull() {
    var t = EL('dFull'), s = EL('dFullSub');
    var on = !!document.fullscreenElement;
    if (t) t.classList.toggle('on', on);
    if (s) s.textContent = on ? '누르면 원래 화면' : '누르면 꽉 찬 화면';
  }

  function toggleFull() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
      return;
    }
    var el = document.documentElement;
    if (!el.requestFullscreen) { if (window.toast) toast('이 브라우저는 전체화면을 지원하지 않아요'); return; }
    el.requestFullscreen({ navigationUI: 'hide' }).catch(function () { if (window.toast) toast('전체화면을 시작하지 못했어요'); });
  }

  var wakeSentinel = null;

  async function requestWake() {
    if (!('wakeLock' in navigator)) {
      if (window.toast) toast('이 브라우저는 화면 꺼짐 방지를 지원하지 않아요');
      return false;
    }
    try {
      wakeSentinel = await navigator.wakeLock.request('screen');
      wakeSentinel.addEventListener('release', function () { wakeSentinel = null; });
      return true;
    } catch (e) {
      if (window.toast) toast('화면 켜짐 유지 실패 · 배터리 최적화를 확인해 주세요');
      return false;
    }
  }

  async function toggleWake() {
    if (prefs.wake) {
      prefs.wake = false;
      if (wakeSentinel) { try { await wakeSentinel.release(); } catch (e) {} wakeSentinel = null; }
      savePrefs(); paintWake();
      if (window.toast) toast('화면 꺼짐 방지를 해제했어요');
      return;
    }
    var ok = await requestWake();
    prefs.wake = !!ok;
    savePrefs(); paintWake();
    if (ok && window.toast) toast('화면이 꺼지지 않게 유지해요 · 이 화면을 보고 있는 동안');
  }

  function paintWake() {
    var t = EL('dWake'), s = EL('dWakeSub');
    if (t) t.classList.toggle('on', !!prefs.wake);
    if (s) s.textContent = prefs.wake ? '유지 중 · 탭하면 해제' : '탭하면 켜짐 유지';
  }

  function paintOled() {
    document.documentElement.classList.toggle('oled', !!prefs.oled);
    var t = EL('dOled'), s = EL('dOledSub');
    if (t) t.classList.toggle('on', !!prefs.oled);
    if (s) s.textContent = prefs.oled ? '보호 중 · 저휘도' : '밤에 켜 두세요';
  }

  var shiftX = 0, shiftY = 0, shiftStep = 0;
  function oledShift() {
    if (!prefs.oled) return;
    var seq = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    var p = seq[shiftStep % seq.length];
    shiftStep++;
    shiftX = p[0] * 1.5;
    shiftY = p[1] * 1.5;
    var s = EL('deckShift');
    if (s) s.style.transform = 'translate(' + shiftX + 'px,' + shiftY + 'px)';
  }

  /* ---------------- 모달 열기/닫기 ---------------- */
  function openModal(id) {
    var m = EL(id);
    if (m) m.hidden = false;
  }
  function closeModal(id) {
    var m = EL(id);
    if (m) m.hidden = true;
  }

  /* ---------------- 동작 ---------------- */
  function onAct(act, el) {
    switch (act) {
      case 'url': {
        var u = el.getAttribute('data-url') || '';
        if (u) window.open(u, '_blank', 'noopener');
        return;
      }
      case 'staff':
        window.open('../index.html?tab=staff', '_blank', 'noopener');
        return;
      case 'capture':
        if (typeof doCapture === 'function') doCapture();
        return;
      case 'clip':
        openClip();
        return;
      case 'apps':
        openApps();
        return;
      case 'cfg':
        if (typeof openCfg === 'function') openCfg();
        return;
      case 'threads':
        prefs.threadsAt = Date.now();
        savePrefs(); renderThreads();
        window.open('https://www.threads.net/@ogenegun', '_blank', 'noopener');
        return;
      case 'dd':
        openDd();
        return;
      case 'tdur': timerCycle(); return;
      case 'tstart': timerStart(); return;
      case 'treset': timerReset(); return;
      case 'full': toggleFull(); return;
      case 'wake': toggleWake(); return;
      case 'oled':
        prefs.oled = !prefs.oled;
        if (!prefs.oled) { var s = EL('deckShift'); if (s) s.style.transform = 'none'; }
        savePrefs(); paintOled();
        if (window.toast) toast(prefs.oled ? 'OLED 번인 방지 모드 켜짐' : 'OLED 번인 방지 꺼짐');
        return;
      case 'refresh':
        if (window.toast) toast('새로고침 중…');
        officeAt = 0;
        Promise.resolve().then(function () {
          if (typeof runCommand === 'function') return runCommand('refresh');
        }).then(function () {
          loadOffice();
          setTimeout(function () { if (window.toast) toast('최신 상태로 갱신했어요'); }, 1200);
        });
        return;
    }
  }

  /* ---------------- 클립보드 모달 ---------------- */
  function openClip() {
    var ta = EL('clipText');
    if (ta) ta.value = '';
    openModal('modalClip');
    setTimeout(function () { if (ta) ta.focus(); }, 80);
  }

  function sendClip() {
    var ta = EL('clipText');
    var text = ta ? ta.value.trim() : '';
    if (!text) { if (window.toast) toast('보낼 내용을 적어 주세요'); return; }
    closeModal('modalClip');
    if (typeof pushText === 'function') pushText(text);
  }

  /* ---------------- 앱 실행 모달 ---------------- */
  function openApps() {
    var box = EL('deckApps');
    if (box && typeof APPS !== 'undefined') {
      box.innerHTML = APPS.map(function (a) {
        var ico = (typeof ICO !== 'undefined' && ICO[a.icon]) || '';
        return '<button class="app2' + (a.danger ? ' danger' : '') + '" data-app="' + a.id + '">' +
          '<span class="aico2">' + ico + '</span>' + esc(a.label) + '</button>';
      }).join('');
    }
    openModal('modalApps');
  }

  /* ---------------- D-Day 모달 ---------------- */
  function openDd() {
    renderDdList();
    var d = EL('ddDate');
    if (d && !d.value) {
      var n = new Date();
      d.value = n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate());
    }
    var msg = EL('ddMsg');
    if (msg) msg.textContent = '';
    openModal('modalDd');
  }

  function renderDdList() {
    var box = EL('ddList');
    if (!box) return;
    var rows = DEF_DD.map(function (d) {
      var pd = parseDay(d.date);
      return '<div class="ddrow"><span>' + d.icon + '</span><span>' + esc(d.label) + '</span>' +
        '<span class="dday2">' + ddText(daysTo(d.date, d.yearly)) + '</span>' +
        '<span class="del" style="opacity:.4">기본</span></div>';
    });
    prefs.dd.forEach(function (d, i) {
      var pd = parseDay(d.date);
      rows.push('<div class="ddrow"><span>' + esc(d.icon || '📌') + '</span><span>' + esc(d.label) + '</span>' +
        '<span class="dday2">' + ddText(daysTo(d.date)) + '</span>' +
        '<button class="del" data-del="' + i + '">삭제</button></div>');
    });
    if (!prefs.dd.length) rows.push('<div class="ddrow" style="opacity:.6"><span>📌</span><span>내 D-Day가 아직 없어요</span></div>');
    box.innerHTML = rows.join('');
  }

  function addDd() {
    var icon = (EL('ddIcon').value || '📌').trim().slice(0, 2) || '📌';
    var label = (EL('ddLabel').value || '').trim();
    var date = (EL('ddDate').value || '').trim();
    var msg = EL('ddMsg');
    if (!label) { if (msg) msg.textContent = '이름을 적어 주세요.'; return; }
    if (!parseDay(date)) { if (msg) msg.textContent = '날짜를 골라 주세요.'; return; }
    prefs.dd.push({ icon: icon, label: label, date: date });
    savePrefs(); renderDd(); renderDdList();
    EL('ddLabel').value = '';
    if (msg) msg.textContent = '추가했어요 · 이 폰에만 저장됩니다.';
  }

  /* ---------------- 이벤트 연결 ---------------- */
  function bind() {
    var grid = EL('deckGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]');
        if (el) onAct(el.getAttribute('data-act'), el);
      });
    }

    var btnMode = EL('btnMode');
    if (btnMode) {
      btnMode.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>';
      btnMode.addEventListener('click', function () {
        var deck = document.documentElement.classList.contains('m-deck');
        document.documentElement.classList.remove('m-deck', 'm-detail');
        document.documentElement.classList.add(deck ? 'm-detail' : 'm-deck');
        if (window.toast) toast(deck ? '상세 화면 · 다시 누르면 덱' : '🎛️ gene 덱 화면');
      });
    }

    var logo = EL('brandLogo');
    if (logo) {
      logo.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h6M14 7h6M4 17h6M14 17h6"/><circle cx="12" cy="7" r="2.2"/><circle cx="12" cy="17" r="2.2"/></svg>';
    }

    /* 클립보드 */
    var cs = EL('clipSend'); if (cs) cs.addEventListener('click', sendClip);
    var cq = EL('clipQuick');
    if (cq) cq.addEventListener('click', function () {
      var ta = EL('clipText');
      if (ta && typeof summaryText === 'function') ta.value = summaryText();
    });
    var cc = EL('clipClose'); if (cc) cc.addEventListener('click', function () { closeModal('modalClip'); });

    /* 앱 실행 */
    var box = EL('deckApps');
    if (box) box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-app]');
      if (!b) return;
      var id = b.getAttribute('data-app');
      var app = null;
      if (typeof APPS !== 'undefined') {
        for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) app = APPS[i];
      }
      if (app && typeof launchApp === 'function') launchApp(app);
      var S = appState();
      if (app && S && S.conn && S.conn.mode === 'live') closeModal('modalApps');
    });
    var ac = EL('appsClose'); if (ac) ac.addEventListener('click', function () { closeModal('modalApps'); });

    /* D-Day */
    var da = EL('ddAdd'); if (da) da.addEventListener('click', addDd);
    var dc = EL('ddClose'); if (dc) dc.addEventListener('click', function () { closeModal('modalDd'); });
    var dl = EL('ddList');
    if (dl) dl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (!b) return;
      var i = Number(b.getAttribute('data-del'));
      if (!isNaN(i)) {
        prefs.dd.splice(i, 1);
        savePrefs(); renderDd(); renderDdList();
      }
    });

    document.querySelectorAll('#modalClip, #modalApps, #modalDd').forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) m.hidden = true; });
    });

    document.addEventListener('fullscreenchange', paintFull);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && prefs.wake && !wakeSentinel) requestWake();
      if (document.hidden) savePrefs();
    });
    window.addEventListener('pagehide', savePrefs);
  }

  /* ---------------- 시작 ---------------- */
  function boot() {
    loadPrefs();
    var grid = EL('deckGrid');
    if (!grid) return;
    grid.innerHTML = gridHTML();
    bind();
    renderDd();
    renderClock();
    renderWx();
    renderThreads();
    renderTimer();
    paintFull();
    paintWake();
    paintOled();
    loadOffice();
    if (typeof loadWeather === 'function') { try { loadWeather(false); } catch (e) {} }

    /* 1초 갱신: 시계·타이머·PC 상태 등 */
    setInterval(function () {
      renderClock();
      renderWx();
      renderPc();
      renderThreads();
      renderTimer();
      var T = prefs.timer;
      if (T.run && T.end - Date.now() <= 0) timerDone();
    }, 1000);

    /* 타이머 실행 중 주기 저장 */
    setInterval(function () { if (prefs.timer.run) savePrefs(); }, 5000);

    /* 상태 파일 60초마다 */
    setInterval(loadOffice, 60000);

    /* OLED 미세 이동 45초마다 */
    setInterval(oledShift, 45000);

    /* 날씨·연결은 상위 app.js 가 갱신하므로 여기서는 읽기만 */
    setTimeout(function () { if (typeof loadWeather === 'function') { try { loadWeather(false); } catch (e) {} } }, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
