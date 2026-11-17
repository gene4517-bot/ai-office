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
    s25sent: {},
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
        if (raw.s25sent && typeof raw.s25sent === 'object') {
          Object.keys(raw.s25sent).forEach(function (k) {
            var v = Number(raw.s25sent[k]);
            if (v > 0) prefs.s25sent[k] = v;
          });
        }
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

  /* ==========================================================
     📱 S25 울트라 원격 리모컨 — MacroDroid 웹훅
     · 이 덱(공기계 노트10)의 버튼 → S25 울트라의 매크로 실행
     · 주소 형식: https://trigger.macrodroid.com/<기기ID>/<식별자>
     · 주소는 이 브라우저(localStorage genedeck.s25.webhook.v1)에만 저장
     ========================================================== */
  var S25_K = 'genedeck.s25.webhook.v1';
  var S25_IDS = [
    { id: 'pickle', icon: 'ㅎ', title: '피클 열기', sub: 'S25에서 피클 앱을 엽니다' },
    { id: 'bixby', icon: '🎙️', title: '빅스비 호출', sub: 'S25의 빅스비를 부릅니다' },
    { id: 'threads', icon: '🧵', title: '스레드 열기', sub: 'S25에서 스레드 앱을 엽니다' },
    { id: 'youtube', icon: '▶️', title: '유튜브 열기', sub: 'S25에서 유튜브를 엽니다' },
    { id: 'mute', icon: '🔇', title: '무음/진동', sub: 'S25를 무음(진동)으로 바꿉니다' },
    { id: 'ping', icon: '🔔', title: 'S25 알림 울리기', sub: 'S25를 소리·진동으로 찾습니다' }
  ];
  var s25Cache = null;
  var s25Busy = {};

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

      /* 📺 세계 무료 TV — 원터치 간편모드 */
      '<button class="tile tv span2" data-act="tv">' +
        '<div class="trow"><span class="dico">📺</span>' +
          '<div style="min-width:0"><div class="ttl">세계 무료 TV</div>' +
          '<div class="tsub" id="dTvSub">한국 72채널 · 원터치로 바로</div></div>' +
          '<span class="tmeta">LIVE</span></div>' +
        '<div class="tline" style="margin-top:auto">누르면 세계 방송 간편 뷰가 열립니다 · 새 창 버튼도 한 번에</div>' +
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

      section('📱 S25 울트라 리모컨') +
      S25_IDS.map(s25Tile).join('') +
      '<button class="tile s25cfg span2" data-act="s25cfg">' +
        '<div class="trow"><span class="dico">⚙️</span>' +
          '<div style="min-width:0"><div class="ttl">S25 연결 설정 · 연동 가이드</div>' +
          '<div class="tsub" id="dS25Sub">웹훅 주소 넣기</div></div>' +
          '<span class="tmeta">설정</span></div>' +
        '<div class="tline" style="margin-top:auto" id="dS25Line">처음이면 5분 가이드를 따라 매크로 6개를 만드세요</div>' +
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

  function s25Tile(d) {
    return '<button class="tile s25" data-act="s25" data-s25="' + d.id + '">' +
      '<div class="trow"><span class="dico">' + d.icon + '</span>' +
        '<span class="s25dot" data-s25dot="' + d.id + '" title="대기" aria-hidden="true"></span></div>' +
      '<div class="s25ttl">' + d.title + '</div>' +
      '<div class="tline" style="margin-top:auto" data-s25sub="' + d.id + '">' + d.sub + '</div>' +
      '</button>';
  }

  /* ---------------- S25 웹훅 주소 다루기 ---------------- */
  function s25Clean(v) {
    var u = String(v || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    u = u.replace(/\/+$/, '');
    var m = u.match(/\/([^\/]+)$/);
    if (m) {
      var last = '';
      try { last = decodeURIComponent(m[1]).toLowerCase(); } catch (e) { last = m[1].toLowerCase(); }
      for (var i = 0; i < S25_IDS.length; i++) {
        if (S25_IDS[i].id === last) { u = u.slice(0, u.length - m[1].length - 1); break; }
      }
    }
    return u.replace(/\/+$/, '');
  }

  function s25Base() {
    if (s25Cache != null) return s25Cache;
    var out = '';
    try {
      var raw = localStorage.getItem(S25_K);
      if (raw) {
        var v = raw;
        try {
          var j = JSON.parse(raw);
          if (j && typeof j === 'object' && j.url) v = String(j.url);
        } catch (e) {}
        out = s25Clean(v);
      }
    } catch (e) { out = ''; }
    s25Cache = out;
    return out;
  }

  function s25Set(v) {
    var u = s25Clean(v);
    s25Cache = u;
    try { localStorage.setItem(S25_K, JSON.stringify({ url: u, saved: Date.now() })); } catch (e) {}
    return u;
  }

  function s25Label(id) {
    for (var i = 0; i < S25_IDS.length; i++) if (S25_IDS[i].id === id) return S25_IDS[i].title;
    return id;
  }

  function s25Did(base) {
    var seg = String(base || '').split('/');
    var did = seg[seg.length - 1] || '';
    return did.length > 6 ? '····' + did.slice(-6) : did;
  }

  /* 신호 보내기 (no-cors: 응답 내용은 볼 수 없고 '보냈다'까지만 확인) */
  function s25Send(id, tile) {
    var base = s25Base();
    if (!base) {
      if (window.toast) toast('먼저 📱 S25 원격 연결 주소를 넣어 주세요');
      openS25Cfg();
      return;
    }
    var done = function (ok) {
      delete s25Busy[id];
      if (ok) {
        prefs.s25sent[id] = Date.now();
        savePrefs();
        if (window.toast) toast('📱 ' + s25Label(id) + ' · S25로 신호를 보냈어요');
        if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) {} }
      } else if (window.toast) {
        toast('S25로 보내지 못했어요 · 주소와 S25 인터넷을 확인하세요');
      }
      paintS25();
    };
    s25Busy[id] = true;
    if (tile) tile.classList.add('sending');
    paintS25();
    try {
      fetch(base + '/' + id, { mode: 'no-cors', cache: 'no-store', method: 'GET' })
        .then(function () { done(true); })
        .catch(function () { done(false); });
    } catch (e) { done(false); }
    /* 응답 없는 경우에도 버튼이 '보내는 중'에 머물지 않게 */
    setTimeout(function () { if (s25Busy[id]) done(true); }, 4000);
  }

  function paintS25() {
    var base = s25Base();
    var dots = document.querySelectorAll('[data-s25dot]');
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var id = dot.getAttribute('data-s25dot');
      var tile = dot.closest ? dot.closest('.tile') : null;
      var st = !base ? 'none'
        : s25Busy[id] ? 'sending'
        : (prefs.s25sent[id] && Date.now() - prefs.s25sent[id] < 6000) ? 'sent'
        : 'idle';
      if (tile) {
        tile.classList.toggle('sent', st === 'sent');
        tile.classList.toggle('sending', st === 'sending');
        tile.classList.toggle('nocfg', st === 'none');
      }
      dot.setAttribute('title', st === 'none' ? '설정 필요' : st === 'sent' ? '전송됨' : st === 'sending' ? '보내는 중' : '대기');
      var sub = document.querySelector('[data-s25sub="' + id + '"]');
      if (sub) {
        var def = '';
        for (var j = 0; j < S25_IDS.length; j++) if (S25_IDS[j].id === id) def = S25_IDS[j].sub;
        sub.textContent = st === 'none' ? '설정에서 웹훅 주소를 넣으세요' : def;
      }
    }
    var sub2 = EL('dS25Sub'), line = EL('dS25Line');
    if (sub2) sub2.textContent = base ? '연결됨 · 신호 보내기 준비' : '웹훅 주소 넣기';
    if (line) {
      line.textContent = base
        ? 'S25 ' + s25Did(base) + ' · 버튼을 누르면 S25가 움직여요'
        : '처음이면 5분 가이드를 따라 매크로 6개를 만드세요';
    }
  }

  /* ---------------- 설정 모달 안 S25 칸 ---------------- */
  function paintS25Cfg() {
    var inp = EL('s25Url');
    if (inp && document.activeElement !== inp) inp.value = s25Base();
    var box = EL('s25Ids');
    if (box && !box.innerHTML) {
      box.innerHTML = S25_IDS.map(function (d) {
        return '<span class="s25id"><b>' + d.id + '</b>' + d.title + '</span>';
      }).join('');
    }
  }

  function openS25Cfg() {
    var m = EL('modalCfg');
    if (typeof openCfg === 'function') { try { openCfg(); } catch (e) { if (m) m.hidden = false; } }
    else if (m) m.hidden = false;
    paintS25Cfg();
    if (!s25Base()) { var g = EL('s25Guide'); if (g) g.open = true; }
    setTimeout(function () {
      var blk = EL('s25Block');
      if (blk && blk.scrollIntoView) { try { blk.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
      var inp = EL('s25Url');
      if (inp && !inp.value) { try { inp.focus({ preventScroll: true }); } catch (e) {} }
    }, 150);
  }

  function s25SaveClick() {
    var inp = EL('s25Url');
    var u = s25Set(inp ? inp.value : '');
    if (inp) inp.value = u;
    var res = EL('s25Result');
    if (!u) {
      if (res) res.textContent = '주소가 비어 있어요 · S25의 웹훅 기본 주소(https://trigger.macrodroid.com/기기ID)를 붙여 넣어 주세요.';
      return;
    }
    if (res) res.textContent = '✅ 저장했어요 · ' + u + '\n이 폰에만 저장되고 서버로 보내지 않습니다.';
    if (window.toast) toast('📱 S25 주소를 저장했어요');
    paintS25();
  }

  function s25TestClick() {
    var inp = EL('s25Url');
    var u = s25Clean(inp ? inp.value : '');
    var res = EL('s25Result');
    if (!u) {
      if (res) res.textContent = '먼저 S25 웹훅 기본 주소를 넣어 주세요.';
      return;
    }
    s25Set(u);
    if (inp) inp.value = u;
    paintS25();
    if (res) res.textContent = 'ping 신호 전송 중… S25가 3초 안에 울려야 합니다.';
    var t0 = Date.now();
    try {
      fetch(u + '/ping', { mode: 'no-cors', cache: 'no-store', method: 'GET' })
        .then(function () {
          if (res) res.textContent = '✅ 신호를 보냈어요 (' + ((Date.now() - t0) / 1000).toFixed(1) + '초)\n' +
            '브라우저는 응답 내용을 볼 수 없어, S25에서 실제로 알림·진동이 왔는지로 확인해 주세요.\n' +
            '안 오면: ping 매크로의 식별자가 ping인지 · S25가 인터넷에 연결됐는지 · MacroDroid 매크로가 켜져 있는지 확인하세요.';
          if (window.toast) toast('📱 ping 신호를 보냈어요 · S25를 확인하세요');
        })
        .catch(function () {
          if (res) res.textContent = '❌ 전송 자체가 실패했어요 · 주소 형식(https://trigger.macrodroid.com/기기ID)과 인터넷 연결을 확인하세요.';
        });
    } catch (e) {
      if (res) res.textContent = '❌ 이 브라우저에서는 전송을 시작하지 못했어요 · 인터넷 연결을 확인하세요.';
    }
  }

  function tileLink(icon, title, sub, url, cls) {
    return '<button class="tile ' + (cls || '') + '" data-act="url" data-url="' + url + '">' +
      '<div class="trow"><span class="dico">' + icon + '</span>' +
        '<div style="min-width:0"><div class="ttl">' + title + '</div></div>' +
        '<span class="tmeta">↗</span></div>' +
      '<div class="tline" style="margin-top:auto">' + sub + '</div>' +
      '</button>';
  }


  /* ---------------- 📺 세계 무료 TV · 원터치 간편모드 ---------------- */
  var TV_KEY = 'genedeck.tv.v1';
  var TV_SPOTS = [
    { path: 'tv/kr', flag: '🇰🇷', name: '한국', n: 72 },
    { path: 'tv/us', flag: '🇺🇸', name: '미국', n: 1366 },
    { path: 'tv/jp', flag: '🇯🇵', name: '일본', n: 35 },
    { path: 'tv/uk', flag: '🇬🇧', name: '영국', n: 224 },
    { path: 'tv/fr', flag: '🇫🇷', name: '프랑스', n: 139 },
    { path: 'tv/de', flag: '🇩🇪', name: '독일', n: 167 },
    { path: 'tv/es', flag: '🇪🇸', name: '스페인', n: 148 },
    { path: 'tv', flag: '🌍', name: '전체', n: 0 },
    { path: 'radio/kr', flag: '📻', name: '라디오', n: 0 },
    { path: 'webcams', flag: '🎥', name: '웹캠', n: 0 }
  ];
  var tvNow = 'tv/kr', tvTimer = null;

  function tvUrl(path) { return 'https://famelack.com/' + (path || 'tv/kr'); }
  function tvSaved() {
    try { var v = localStorage.getItem(TV_KEY); if (v) return v; } catch (e) {}
    return 'tv/kr';
  }
  function tvChips() {
    var row = EL('tvRow');
    if (!row) return;
    row.innerHTML = TV_SPOTS.map(function (s) {
      return '<button data-tv="' + s.path + '"' + (s.path === tvNow ? ' class="on"' : '') + '>' +
        s.flag + ' ' + s.name + (s.n ? ' ' + s.n : '') + '</button>';
    }).join('');
  }
  function openTv(path) {
    var v = EL('tvView');
    if (!v) return;
    if (path) { tvNow = path; try { localStorage.setItem(TV_KEY, path); } catch (e) {} }
    else tvNow = tvSaved();
    v.hidden = false;
    tvChips();
    var hint = EL('tvHint');
    if (hint) hint.hidden = true;
    var f = EL('tvIframe');
    if (f) f.src = tvUrl(tvNow);
    clearTimeout(tvTimer);
    tvTimer = setTimeout(function () {
      var h = EL('tvHint');
      if (h && !v.hidden) h.hidden = false;
    }, 6000);
  }
  function closeTv() {
    var v = EL('tvView');
    clearTimeout(tvTimer);
    if (!v) return;
    v.hidden = true;
    var f = EL('tvIframe');
    if (f) f.src = 'about:blank';
  }
  function tvNewWin() {
    window.open(tvUrl(tvNow), '_blank', 'noopener');
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
      case 'tv':
        openTv();
        return;
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
      case 's25':
        s25Send(el.getAttribute('data-s25'), el);
        return;
      case 's25cfg':
        openS25Cfg();
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

    /* 📺 세계 무료 TV */
    var tvNew = EL('tvNew'); if (tvNew) tvNew.addEventListener('click', tvNewWin);
    var tvCl = EL('tvClose'); if (tvCl) tvCl.addEventListener('click', closeTv);
    var tvRow = EL('tvRow');
    if (tvRow) tvRow.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tv]');
      if (b) openTv(b.getAttribute('data-tv'));
    });
    var tvHintOpen = EL('tvHintOpen'); if (tvHintOpen) tvHintOpen.addEventListener('click', tvNewWin);

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

    /* S25 원격 설정 */
    var s25s = EL('s25Save'); if (s25s) s25s.addEventListener('click', s25SaveClick);
    var s25t = EL('s25Test'); if (s25t) s25t.addEventListener('click', s25TestClick);
    var s25i = EL('s25Url');
    if (s25i) s25i.addEventListener('change', function () { s25i.value = s25Set(s25i.value); paintS25(); });
    var cfgSaveBtn = EL('cfgSave');
    if (cfgSaveBtn) cfgSaveBtn.addEventListener('click', function () {
      var i = EL('s25Url');
      if (i) i.value = s25Set(i.value);
      paintS25();
    });

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
    paintS25();
    loadOffice();
    if (typeof loadWeather === 'function') { try { loadWeather(false); } catch (e) {} }

    /* 📺 ?tv=1 또는 ?tv=tv/kr 로 열면 TV 간편 뷰를 바로 띄웁니다 */
    try {
      var tvq = new URLSearchParams(location.search).get('tv');
      if (tvq) openTv(tvq === '1' ? null : tvq);
    } catch (e) {}

    /* 1초 갱신: 시계·타이머·PC 상태 등 */
    setInterval(function () {
      renderClock();
      renderWx();
      renderPc();
      renderThreads();
      renderTimer();
      paintS25();
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
