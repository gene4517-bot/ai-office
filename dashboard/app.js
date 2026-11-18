/* ==========================================================
   PC 컨트롤 대시보드 · app.js
   - PC 브릿지(로컬 서버)와 통신: /api/status · capture · launch · clipboard
   - 주소·토큰은 이 브라우저(localStorage)에만 저장합니다. 코드에 개인정보·고정 토큰 없음.
   ========================================================== */
'use strict';

/* ---------------- 저장 키 / 기본값 ---------------- */
const K_CFG = 'pcctl.cfg.v1';
const K_SLOT = 'pcctl.slots.v1';
const K_WX = 'pcctl.wx.v1';

const DEFAULT_CFG = {
  bridge: 'http://localhost:8765',
  token: '',
  notion: 'https://app.notion.com/p/AI-418dcae81cc081b8-873ac0d72de949db'
};

const CITIES = [
  { key: 'anseong', name: '현장 지역', lat: 37.0080, lon: 127.2797 },
  { key: 'changwon', name: '자택 지역', lat: 35.2281, lon: 128.6811 }
];

const STATE_NAME = { ok: '완료', info: '진행 중', bad: '확인 필요', idle: '대기' };
const SLOT_ORDER = ['idle', 'ok', 'info', 'bad'];

/* ---------------- 아이콘 ---------------- */
const S = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;

const ICO = {
  monitor: S('<rect x="2.5" y="4.5" width="19" height="12.5" rx="2.2"/><path d="M8.5 20.5h7M12 17v3.5"/>'),
  cpu: S('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9.5 3v2.5M12 3v2.5M14.5 3v2.5M9.5 18.5V21M12 18.5V21M14.5 18.5V21M3 9.5h2.5M3 12h2.5M3 14.5h2.5M18.5 9.5H21M18.5 12H21M18.5 14.5H21"/>'),
  ram: S('<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6.5 17v2.5M10 17v2.5M14 17v2.5M17.5 17v2.5M6 12h2.5M10.5 12H13M15 12h3"/>'),
  battery: S('<rect x="2" y="7.5" width="17" height="9" rx="2.2"/><path d="M21.5 10.5v3"/><path d="M4.8 10.4v3.2M8 10.4v3.2M11.2 10.4v3.2"/>'),
  cloud: S('<path d="M7.5 18h9.7a3.8 3.8 0 0 0 .3-7.6 5.4 5.4 0 0 0-10.4-.9A4.3 4.3 0 0 0 7.5 18z"/>'),
  scan: S('<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>'),
  grid: S('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><rect x="13" y="13" width="7.5" height="7.5" rx="2"/>'),
  copy: S('<rect x="8.5" y="8.5" width="11" height="12" rx="2.2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>'),
  clear: S('<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 2.6"/><path d="M9 9l6 6M15 9l-6 6"/>'),
  log: S('<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
  forward: S('<path d="M4 6.5v11l8-5.5z"/><path d="M13.5 6.5v11l8-5.5z"/>'),
  thumb: S('<path d="M7.5 20.5V10l4.2-6.2a1.8 1.8 0 0 1 3.2 1.2l-.4 3.6h4.2a2 2 0 0 1 2 2.4l-1.3 6.6a3 3 0 0 1-3 2.9z"/><path d="M7.5 10.5H4.8A1.3 1.3 0 0 0 3.5 11.8v7.4a1.3 1.3 0 0 0 1.3 1.3h2.7"/>'),
  gear: S('<path d="M12 3.3l1.9 1.5 2.4-.5 1 2.2 2.2 1-.5 2.4 1.5 1.9-1.5 1.9.5 2.4-2.2 1-1 2.2-2.4-.5L12 20.7l-1.9-1.5-2.4.5-1-2.2-2.2-1 .5-2.4L3.5 12.2 5 10.3l-.5-2.4 2.2-1 1-2.2 2.4.5z"/><circle cx="12" cy="12" r="3.1"/>'),
  code: S('<path d="M8.5 8.5 4.5 12l4 3.5M15.5 8.5l4 3.5-4 3.5M13.6 5.5l-3.2 13"/>'),
  chat: S('<path d="M20.5 11.5c0 3.9-3.8 7-8.5 7-1 0-2-.1-2.9-.4L4.5 20l1.2-3.6A6.6 6.6 0 0 1 3.5 11.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7z"/>'),
  refresh: S('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.4h-4.4"/>'),
  office: S('<path d="M4 20V8.5L12 4l8 4.5V20"/><path d="M9 20v-5.5h6V20"/><path d="M4 20h16"/>'),
  folder: '<svg viewBox="0 0 48 48"><path d="M5 13.5A3.5 3.5 0 0 1 8.5 10h8.2l3.4 4.2h19A3.9 3.9 0 0 1 43 18v16a3.9 3.9 0 0 1-3.9 3.9H8.9A3.9 3.9 0 0 1 5 34z" fill="#f4c34f"/><path d="M5 20.5h38V18a3.9 3.9 0 0 0-3.9-3.8H20.1L16.7 10H8.5A3.5 3.5 0 0 0 5 13.5z" fill="#ffdc7a"/></svg>',
  chrome: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#ffffff"/><path d="M24 3a21 21 0 0 1 18.19 10.5H24a10.5 10.5 0 0 0-9.09 5.25L8.4 10.1A20.9 20.9 0 0 1 24 3z" fill="#ea4335"/><path d="M6.1 13.4 14.9 28.6a10.5 10.5 0 0 0 9.1 5.4l-6.6 11.4A21 21 0 0 1 6.1 13.4z" fill="#34a853"/><path d="M42.3 17.6a21 21 0 0 1-18.7 27.3l6.6-11.4a10.5 10.5 0 0 0 3.7-14.4z" fill="#fbbc05"/><circle cx="24" cy="24" r="7.2" fill="#4285f4"/></svg>',
  youtube: '<svg viewBox="0 0 48 48"><rect x="2" y="10" width="44" height="28" rx="8.5" fill="#ff0033"/><path d="M20 17.6 32 24l-12 6.4z" fill="#ffffff"/></svg>',
  kakao: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#ffe812"/><path d="M24 13.8c-6.9 0-12.5 4.2-12.5 9.4 0 3.3 2.3 6.2 5.7 7.9-.3 1.1-1.1 3.9-1.2 4.5-.1.6.3.6.6.4.4-.2 4-2.7 5.2-3.5.7.1 1.5.1 2.2.1 6.9 0 12.5-4.2 12.5-9.4S30.9 13.8 24 13.8z" fill="#3b1e1e"/></svg>',
  notion: '<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="10" fill="#ffffff"/><path d="M16.6 33.4V15.2h3.5l9.4 12.6V15.2h3.2v18.2h-3.3L19.8 20.7v12.7z" fill="#0e0e0f"/></svg>',
  gpt: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#111112"/><g fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M24 10.5 33.2 16v11.6L24 33.2 14.8 27.6V16z"/><path d="M24 10.5v22.7M14.8 16l18.4 11.6M33.2 16 14.8 27.6"/></g></svg>',
  claude: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#1b1613"/><g stroke="#d97757" stroke-width="3.4" stroke-linecap="round"><path d="M24 8.5v9M24 30.5v9M8.5 24h9M30.5 24h9M13 13l6.4 6.4M28.6 28.6 35 35M35 13l-6.4 6.4M19.4 28.6 13 35"/></g></svg>',
  zoom: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#2d8cff"/><rect x="10" y="17" width="19" height="14" rx="4" fill="#ffffff"/><path d="M31 23l7-4.4v11L31 25z" fill="#ffffff"/></svg>',
  pickle: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#173e28"/><g transform="rotate(-22 24 25)"><rect x="18" y="11" width="12" height="27" rx="6" fill="#a8d96a"/><path d="M20.5 16h1.6M26 18.5h1.4M20 23h1.6M25.5 26h1.5M20.5 30h1.6" stroke="#2f6b3c" stroke-width="1.6" stroke-linecap="round"/></g></svg>',
  cal: S('<rect x="4" y="6.5" width="16" height="14" rx="2.5"/><path d="M4 11h16M8.5 3.5v5M15.5 3.5v5"/>'),
  trash: S('<path d="M4 7h16M9.5 7V4.8h5V7M6 7l1.1 12.4A2 2 0 0 0 9.1 21.4h5.8a2 2 0 0 0 2-1.9L18 7"/><path d="M10.5 11v6M13.5 11v6"/>')
};

/* ---------------- 날씨 아이콘 ---------------- */
function wxIcon(kind) {
  const cl = '#cfd3da', bl = '#8fb8ff';
  const cloudPath = '<path d="M8 30h16a5 5 0 0 0 .4-10 7 7 0 0 0-13.6-1.2A5.6 5.6 0 0 0 8 30z" fill="' + cl + '"/>';
  switch (kind) {
    case 'clear':
      return '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="7.4" fill="#f5c451"/><g stroke="#f5c451" stroke-width="2.4" stroke-linecap="round"><path d="M20 3.5v4.6M20 31.9v4.6M3.5 20h4.6M31.9 20h4.6M8.6 8.6l3.2 3.2M28.2 28.2l3.2 3.2M31.4 8.6l-3.2 3.2M11.8 28.2l-3.2 3.2"/></g></svg>';
    case 'part':
      return '<svg viewBox="0 0 40 40"><circle cx="15" cy="14" r="6" fill="#f5c451"/><g stroke="#f5c451" stroke-width="2" stroke-linecap="round"><path d="M15 3.6v3M3.6 14h3M6.7 5.7l2.1 2.1M23.3 5.7l-2.1 2.1"/></g>' + cloudPath.replace('d="M8 30h16', 'd="M14 32h14') + '</svg>';
    case 'rain':
      return '<svg viewBox="0 0 40 40">' + cloudPath + '<g stroke="' + bl + '" stroke-width="2.3" stroke-linecap="round"><path d="M13 33.5l-1.6 4M20 33.5l-1.6 4M27 33.5l-1.6 4"/></g></svg>';
    case 'snow':
      return '<svg viewBox="0 0 40 40">' + cloudPath + '<g stroke="#dbe8ff" stroke-width="2.2" stroke-linecap="round"><path d="M13 34.5v3.5M11.4 35.2l3.2 1.6M14.6 35.2l-3.2 1.6M26 34.5v3.5M24.4 35.2l3.2 1.6M27.6 35.2l-3.2 1.6"/></g></svg>';
    case 'fog':
      return '<svg viewBox="0 0 40 40">' + cloudPath + '<g stroke="#b9bcc2" stroke-width="2.3" stroke-linecap="round"><path d="M9 34h22M13 38h16"/></g></svg>';
    case 'storm':
      return '<svg viewBox="0 0 40 40">' + cloudPath + '<path d="M21 30l-5 6h5l-2 5 8-8h-5l2-3z" fill="#f5c451"/></svg>';
    default:
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 18h9.7a3.8 3.8 0 0 0 .3-7.6 5.4 5.4 0 0 0-10.4-.9A4.3 4.3 0 0 0 7.5 18z"/></svg>';
  }
}

const WMO = {
  0: ['맑음', 'clear'], 1: ['대체로 맑음', 'part'], 2: ['구름 조금', 'part'], 3: ['흐림', 'cloud'],
  45: ['안개', 'fog'], 48: ['짙은 안개', 'fog'],
  51: ['약한 이슬비', 'rain'], 53: ['이슬비', 'rain'], 55: ['강한 이슬비', 'rain'],
  56: ['어는 이슬비', 'rain'], 57: ['어는 이슬비', 'rain'],
  61: ['약한 비', 'rain'], 63: ['비', 'rain'], 65: ['강한 비', 'rain'],
  66: ['어는 비', 'rain'], 67: ['어는 비', 'rain'],
  71: ['약한 눈', 'snow'], 73: ['눈', 'snow'], 75: ['많은 눈', 'snow'], 77: ['싸락눈', 'snow'],
  80: ['약한 소나기', 'rain'], 81: ['소나기', 'rain'], 82: ['강한 소나기', 'rain'],
  85: ['소낙눈', 'snow'], 86: ['강한 소낙눈', 'snow'],
  95: ['뇌우', 'storm'], 96: ['뇌우·우박', 'storm'], 99: ['뇌우·우박', 'storm']
};
const wxInfo = (code) => WMO[code] || ['흐림', 'cloud'];

/* ---------------- 명령 · 앱 정의 ---------------- */
const COMMANDS = [
  { id: 'log', label: 'Log', icon: 'log', kind: 'text', sub: '작업 로그 정리',
    text: '지금까지 작업한 내용을 시간 순서대로 로그로 정리해서 보여줘.' },
  { id: 'keepgoing', label: 'keep going', icon: 'forward', kind: 'text', sub: '계속 진행',
    text: '좋아, 그대로 계속 진행해줘. 막히거나 확인이 필요하면 멈추고 알려줘.' },
  { id: 'ok', label: 'ok', icon: 'thumb', kind: 'text', sub: '승인 · 그대로 실행',
    text: '확인했어. 그대로 진행해.' },
  { id: 'html', label: 'html', icon: 'code', kind: 'text', sub: '결과를 화면으로',
    text: '결과를 바로 열어 볼 수 있는 HTML 한 페이지로 만들어줘.' },
  { id: 'office', label: 'AI 사무실 열기', icon: 'office', kind: 'link', sub: '본부 대시보드',
    href: '../index.html' },
  { id: 'notion', label: '노션 본부', icon: 'notion', kind: 'link', sub: '작업판 열기' },
  { id: 'brief', label: '오늘 브리핑', icon: 'chat', kind: 'text', sub: '상태 요약 복사',
    text: '' },
  { id: 'refresh', label: '전체 새로고침', icon: 'refresh', kind: 'action', sub: '모든 값 갱신' }
];

const APPS = [
  { id: 'settings', label: '설정', icon: 'gear' },
  { id: 'youtube', label: '유튜브', icon: 'youtube', web: 'https://www.youtube.com', ext: true },
  { id: 'explorer', label: '탐색기', icon: 'folder' },
  { id: 'chrome', label: '크롬', icon: 'chrome' },
  { id: 'kakaotalk', label: '카카오톡', icon: 'kakao' },
  { id: 'notion', label: 'Notion', icon: 'notion' },
  { id: 'chatgpt', label: 'ChatGPT', icon: 'gpt', web: 'https://chatgpt.com', ext: true },
  { id: 'claude', label: 'Claude', icon: 'claude', web: 'https://claude.ai', ext: true },
  { id: 'zoom', label: 'Zoom', icon: 'zoom' },
  { id: 'pickle', label: '피클(웹)', icon: 'pickle', web: '' },
  { id: 'notion_calendar', label: '노션 캘린더', icon: 'cal', web: 'https://www.notion.so/calendar', ext: true },
  { id: 'recycle', label: '휴지통 비우기', icon: 'trash', danger: true }
];

/* ---------------- 상태 ---------------- */
const state = {
  cfg: { ...DEFAULT_CFG },
  conn: { mode: 'offline', at: 0, host: '' },
  sys: { cpu: null, cores: null, ram: null, ramUsed: null, ramTotal: null, bat: null, plug: false },
  wx: {},
  slots: Array.from({ length: 12 }, (_, i) => ({ n: i + 1, state: 'idle', label: '', manual: false, live: false })),
  slotsAt: ''
};

const $ = (id) => document.getElementById(id);
const els = {};

/* ---------------- 유틸 ---------------- */
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const pct = (v) => (v == null ? '—' : r1(v) + '%');

function fmtClock(d) {
  const t = new Date(d);
  return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
}

function agoText(at) {
  if (!at) return '—';
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 5) return '방금';
  if (s < 60) return s + '초 전';
  const m = Math.floor(s / 60);
  if (m < 60) return m + '분 전';
  return Math.floor(m / 60) + '시간 전';
}

function trimUrl(u) {
  let v = String(u || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
  return v.replace(/\/+$/, '');
}

let toastT;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 아래 fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

/* ---------------- 설정 저장/불러오기 ---------------- */
function loadCfg() {
  try {
    const raw = JSON.parse(localStorage.getItem(K_CFG) || 'null');
    state.cfg = Object.assign({}, DEFAULT_CFG, raw && typeof raw === 'object' ? raw : {});
  } catch (e) {
    state.cfg = { ...DEFAULT_CFG };
  }
  state.cfg.bridge = trimUrl(state.cfg.bridge) || DEFAULT_CFG.bridge;
  return state.cfg;
}

function saveCfg(cfg) {
  state.cfg = cfg;
  try { localStorage.setItem(K_CFG, JSON.stringify(cfg)); } catch (e) { }
}

/* ---------------- 브릿지 API ---------------- */
async function api(path, opt = {}) {
  const method = opt.method || 'GET';
  const timeout = opt.timeout || 6000;
  const url = state.cfg.bridge.replace(/\/+$/, '') + path;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const headers = {};
  if (state.cfg.token) headers['X-Dashboard-Token'] = state.cfg.token;
  if (opt.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
      signal: ctrl.signal,
      cache: 'no-store',
      mode: 'cors'
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err && err.name === 'AbortError' ? '응답 시간 초과' : 'PC에 연결할 수 없음' };
  } finally {
    clearTimeout(timer);
  }
}

async function refreshSystem() {
  const r = await api('/api/status', { timeout: 5000 });
  if (r.ok && r.data && r.data.ok) {
    state.conn.mode = 'live';
    state.conn.at = Date.now();
    applySys(r.data);
  } else if (r.status === 401 || r.status === 403) {
    state.conn.mode = 'auth';
  } else if (r.status === 0) {
    const p = await api('/api/ping', { timeout: 3000 });
    state.conn.mode = p.ok ? 'auth' : 'offline';
  } else {
    state.conn.mode = 'offline';
  }
  renderConn();
  renderSys();
}

function applySys(d) {
  const cpu = num(d.cpu && d.cpu.percent);
  const ram = num(d.ram && d.ram.percent);
  const bat = d.battery ? num(d.battery.percent) : null;
  state.sys = {
    cpu,
    cores: num(d.cpu && d.cpu.cores),
    ram,
    ramUsed: r1(num(d.ram && d.ram.used_gb)),
    ramTotal: r1(num(d.ram && d.ram.total_gb)),
    bat,
    plug: !!(d.battery && d.battery.plugged),
    host: typeof d.host === 'string' ? d.host : ''
  };
}

/* ---------------- 렌더: 연결 ---------------- */
function renderConn() {
  const m = state.conn.mode;
  const pill = $('connPill');
  pill.className = 'pill' + (m === 'live' ? ' live' : m === 'auth' ? ' auth' : '');
  $('connPillText').textContent = m === 'live' ? '연결됨' : m === 'auth' ? '토큰 필요' : '오프라인 데모';
  $('barSub').textContent = m === 'live'
    ? 'PC 연결됨 · ' + (state.sys.host || 'Windows PC')
    : m === 'auth' ? '서버는 켜져 있어요 · 토큰 확인' : '오프라인 데모 모드';

  const st = $('pcState'), tag = $('pcTag'), sub = $('pcSub'), meta = $('pcMeta');
  if (m === 'live') {
    st.textContent = '연결됨';
    tag.textContent = 'LIVE';
    const host = (state.cfg.bridge || '').replace(/^https?:\/\//, '');
    sub.textContent = [state.sys.host, host].filter(Boolean).join(' · ');
    meta.textContent = agoText(state.conn.at);
  } else if (m === 'auth') {
    st.textContent = '토큰 확인';
    tag.textContent = 'AUTH';
    sub.textContent = 'PC는 응답하지만 보안 토큰이 맞지 않아요. 연결 설정에서 토큰을 다시 넣어 주세요.';
    meta.textContent = '—';
  } else {
    st.textContent = '오프라인';
    tag.textContent = 'DEMO';
    sub.textContent = '연결 설정에서 PC 주소와 보안 토큰을 넣으면 실제 PC를 제어할 수 있어요.';
    meta.textContent = '—';
  }
  $('chipCapture').className = 'chip' + (m === 'live' ? ' on' : '');
  $('chipCapture').textContent = m === 'live' ? '화면 캡처 가능' : '화면 캡처 대기';
  $('chipLaunch').className = 'chip' + (m === 'live' ? ' on' : '');
  $('chipLaunch').textContent = m === 'live' ? '앱 실행 가능' : '앱 실행 대기';
  $('shotNote').textContent = m === 'live' ? '눌러서 PC 화면 보기' : 'PC 연결 시 실제 캡처';
  $('shotMeta').textContent = m === 'live' ? 'LIVE' : 'DEMO';
}

/* ---------------- 렌더: 시스템 ---------------- */
function meterFill(el, v, tone) {
  const box = el;
  const bar = box.querySelector('i');
  bar.style.width = Math.max(0, Math.min(100, v == null ? 0 : v)) + '%';
  if (tone) box.className = 'meter ' + tone;
};

function renderSys() {
  const s = state.sys;
  const live = state.conn.mode === 'live';

  const cpuTxt = live && s.cpu != null ? r1(s.cpu) : null;
  $('cpuVal').innerHTML = cpuTxt == null ? '—' : cpuTxt + '<span class="u">%</span>';
  $('cpuCores').textContent = live && s.cores ? s.cores + '코어' : '';
  meterFill($('cpuMeter'), cpuTxt, cpuTxt == null ? '' : cpuTxt >= 92 ? 'bad' : cpuTxt >= 80 ? 'warn' : '');

  $('ramVal').innerHTML = live && s.ram != null ? r1(s.ram) + '<span class="u">%</span>' : '—';
  $('ramMeta').textContent = live && s.ramUsed != null ? s.ramUsed + ' / ' + s.ramTotal + 'GB' : '';
  meterFill($('ramMeter'), live ? s.ram : null, s.ram == null ? '' : s.ram >= 92 ? 'bad' : s.ram >= 80 ? 'warn' : '');

  $('batVal').innerHTML = live ? (s.bat == null ? '<span style="font-size:0.62em">없음</span>' : Math.round(s.bat) + '<span class="u">%</span>') : '—';
  $('batMeta').textContent = live ? (s.bat == null ? '데스크톱' : s.plug ? '충전 중' : '사용 중') : '';
  $('batNote').textContent = !live ? 'PC 연결 후 표시'
    : s.bat == null ? '이 PC에는 배터리가 없어요' : (s.plug ? '전원에 연결되어 충전 중' : '배터리로 사용 중');
  $('batMeter').style.display = live && s.bat != null ? '' : 'none';
  meterFill($('batMeter'), live ? s.bat : null, 'ok');
}

/* ---------------- 렌더: 날씨 ---------------- */
function renderWx() {
  CITIES.forEach((c) => {
    const w = state.wx[c.key];
    const K = c.key === 'anseong' ? 'A' : 'C';
    const val = $('wx' + K + 'Val'), desc = $('wx' + K + 'Desc'), note = $('wx' + K + 'Note');
    const meta = $('wx' + K + 'Meta'), box = $('cardWx' + K);
    const ico = box.querySelector('.ico');
    if (!w) {
      val.textContent = '—';
      desc.textContent = '정보 없음';
      note.textContent = '최저 — · 최고 —';
      meta.textContent = '';
      ico.innerHTML = ICO.cloud;
      meterFill($('wx' + K + 'Meter'), 0, 'info');
      return;
    }
    val.innerHTML = w.temp + '<span class="u">°</span>';
    desc.textContent = w.label;
    note.textContent = '최저 ' + w.min + '° · 최고 ' + w.max + '° · 강수 ' + (w.pop == null ? '—' : w.pop + '%');
    meta.textContent = fmtClock(w.at) + ' 기준';
    ico.innerHTML = wxIcon(w.kind);
    meterFill($('wx' + K + 'Meter'), w.pop == null ? 0 : w.pop, 'info');
  });
}

async function loadWeather(force) {
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(K_WX) || 'null'); } catch (e) { }
  if (!force && cache && cache.d && Date.now() - cache.t < 20 * 60 * 1000) {
    state.wx = cache.d;
    renderWx();
    return;
  }
  const lat = CITIES.map((c) => c.lat).join(',');
  const lon = CITIES.map((c) => c.lon).join(',');
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=Asia%2FSeoul&forecast_days=1';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const list = Array.isArray(j) ? j : [j];
    const out = {};
    list.forEach((d, i) => {
      const c = CITIES[i];
      if (!c || !d || !d.current) return;
      const [label, kind] = wxInfo(d.current.weather_code);
      const daily = d.daily || {};
      const popArr = daily.precipitation_probability_max || [];
      const maxArr = daily.temperature_2m_max || [];
      const minArr = daily.temperature_2m_min || [];
      out[c.key] = {
        temp: Math.round(d.current.temperature_2m),
        label, kind,
        min: minArr[0] == null ? '—' : Math.round(minArr[0]),
        max: maxArr[0] == null ? '—' : Math.round(maxArr[0]),
        pop: popArr[0] == null ? null : Math.round(popArr[0]),
        at: Date.now()
      };
    });
    if (Object.keys(out).length) {
      state.wx = out;
      try { localStorage.setItem(K_WX, JSON.stringify({ t: Date.now(), d: out })); } catch (e) { }
      renderWx();
    }
  } catch (e) {
    renderWx();
  }
}

/* ---------------- 렌더: 작업 상태 1~12 ---------------- */
function loadSlots() {
  try {
    const arr = JSON.parse(localStorage.getItem(K_SLOT) || 'null');
    if (Array.isArray(arr) && arr.length === 12) {
      state.slots = arr.map((s, i) => ({
        n: i + 1,
        state: STATE_NAME[s && s.state] ? s.state : 'idle',
        label: (s && s.label) || '',
        manual: !!(s && s.manual),
        live: false
      }));
    }
  } catch (e) { }
}

function saveSlots() {
  try {
    localStorage.setItem(K_SLOT, JSON.stringify(state.slots.map((s) => ({ state: s.state, label: s.label, manual: s.manual }))));
  } catch (e) { }
}

function mapTaskState(v) {
  const k = String(v || '').toLowerCase();
  if (k === 'done' || k === 'complete' || k === 'completed') return 'ok';
  if (k === 'progress' || k === 'working' || k === 'busy' || k === 'run') return 'info';
  if (k === 'blocked' || k === 'error' || k === 'fail' || k === 'hold') return 'bad';
  return 'idle';
}

async function loadStatusJson() {
  try {
    const res = await fetch('../status.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const tasks = Array.isArray(j.tasks) ? j.tasks : [];
    state.slots = state.slots.map((s, i) => {
      const t = tasks[i];
      if (!t) return Object.assign({}, s, { live: false });
      const auto = mapTaskState(t.state);
      return Object.assign({}, s, {
        live: true,
        label: String(t.title || '').slice(0, 48),
        auto
      });
    });
    state.slots.forEach((s) => { if (!s.manual && s.auto) s.state = s.auto; });
    state.slotsAt = j.updated_at || '';
    renderSlots();
  } catch (e) {
    state.slotsAt = '';
    renderSlots();
  }
}

function renderSlots() {
  const box = $('slots');
  if (!box) return;
  box.innerHTML = state.slots.map((s, i) => {
    const t = (s.n + '번 · ' + (s.label || '작업 ' + s.n) + ' · ' + STATE_NAME[s.state]);
    return '<button class="slot s-' + s.state + '" data-i="' + i + '" title="' + t.replace(/"/g, '&quot;') +
      '" data-live="' + (s.live ? 1 : 0) + '">' + s.n + '</button>';
  }).join('');
  $('slotMeta').textContent = state.slotsAt ? 'status.json ' + state.slotsAt.slice(5) : '탭해서 색 변경';
}

function cycleSlot(i) {
  const s = state.slots[i];
  if (!s) return;
  s.state = SLOT_ORDER[(SLOT_ORDER.indexOf(s.state) + 1) % SLOT_ORDER.length];
  s.manual = true;
  saveSlots();
  renderSlots();
  toast(s.n + '번 · ' + (s.label ? s.label + ' · ' : '') + STATE_NAME[s.state]);
}

/* ---------------- 요약 문구 ---------------- */
function summaryText() {
  const L = [];
  L.push('[PC 컨트롤 대시보드] ' + fmtClock(Date.now()));
  if (state.conn.mode === 'live') {
    const s = state.sys;
    L.push('PC: 연결됨' + (s.host ? ' · ' + s.host : '') + ' · CPU ' + pct(s.cpu) + ' · RAM ' + pct(s.ram) +
      (s.ramUsed != null ? ' (' + s.ramUsed + '/' + s.ramTotal + 'GB)' : '') +
      ' · 배터리 ' + (s.bat == null ? '없음' : Math.round(s.bat) + '%' + (s.plug ? ' 충전 중' : '')));
  } else {
    L.push('PC: ' + (state.conn.mode === 'auth' ? '토큰 확인 필요' : '오프라인 데모 모드'));
  }
  L.push('날씨: ' + CITIES.map((c) => {
    const w = state.wx[c.key];
    return w ? c.name + ' ' + w.temp + '° ' + w.label : c.name + ' —';
  }).join(' / '));
  const cnt = { ok: 0, info: 0, bad: 0, idle: 0 };
  state.slots.forEach((s) => { cnt[s.state] = (cnt[s.state] || 0) + 1; });
  L.push('작업 12칸: 완료 ' + cnt.ok + ' · 진행 ' + cnt.info + ' · 확인 ' + cnt.bad + ' · 대기 ' + cnt.idle);
  return L.join('\n');
}

/* ---------------- 명령 실행 ---------------- */
async function pushText(text) {
  if (state.conn.mode === 'live' && state.cfg.token) {
    const r = await api('/api/clipboard', { method: 'POST', body: { text } });
    if (r.ok && r.data && r.data.ok) {
      toast('PC 클립보드에 복사했어요 · PC에 붙여 넣으세요');
      return;
    }
  }
  const ok = await copyText(text);
  if (ok) {
    toast(state.conn.mode === 'live' ? '태블릿 클립보드에 복사했어요' : '클립보드에 복사했어요 · 원하는 곳에 붙여 넣으세요');
  } else {
    toast('복사에 실패했어요');
  }
}

async function runCommand(id) {
  if (id === 'copy') {           // copy to clipboard 카드
    await pushText(summaryText());
    return;
  }
  const c = COMMANDS.find((x) => x.id === id);
  if (!c) return;
  if (c.kind === 'link') {
    const href = c.id === 'notion' ? (state.cfg.notion || DEFAULT_CFG.notion) : c.href;
    window.open(href, '_blank', 'noopener');
    return;
  }
  if (c.kind === 'action') {
    toast('새로고침 중…');
    await Promise.all([refreshSystem(), loadWeather(true), loadStatusJson()]);
    toast('최신 상태로 갱신했어요');
    return;
  }
  const text = id === 'copy' || id === 'brief' || !c.text ? summaryText() : c.text;
  await pushText(text);
}

/* ---------------- 앱 실행 ---------------- */
async function launchApp(app) {
  if (app.danger && !window.confirm('PC 휴지통을 비울까요?\n비운 파일은 되돌릴 수 없습니다.')) return;
  if (state.conn.mode === 'live') {
    const r = await api('/api/launch', { method: 'POST', body: { app: app.id }, timeout: 12000 });
    if (r.ok && r.data && r.data.ok) {
      toast(app.label + ' 실행 · ' + (r.data.via ? r.data.via : 'PC'));
      return;
    }
    const msg = (r.data && (r.data.error || r.data.detail)) || r.error || ('HTTP ' + r.status);
    toast(app.label + ' 실행 실패 · ' + msg);
    return;
  }
  if (app.web) {
    window.open(app.web, '_blank', 'noopener');
    toast(app.label + ' · 태블릿 새 탭에서 열었어요 (PC 미연결)');
    return;
  }
  toast('PC 브릿지가 연결되어야 ' + app.label + '을(를) 실행할 수 있어요');
}

/* ---------------- 화면 캡처 ---------------- */
async function doCapture() {
  if (state.conn.mode !== 'live') {
    toast('PC 브릿지가 연결되어야 PC 화면을 캡처할 수 있어요');
    return;
  }
  $('modalShot').hidden = false;
  $('shotLead').textContent = 'PC 화면을 캡처하는 중…';
  $('shotInfo').textContent = '';
  $('shotWrap').hidden = true;
  $('shotSave').hidden = true;
  $('shotPh').hidden = false;
  $('shotPh').textContent = '캡처 중…';
  const t0 = Date.now();
  const r = await api('/api/capture', { timeout: 20000 });
  if (r.ok && r.data && r.data.image) {
    $('shotImg').src = r.data.image;
    $('shotSave').href = r.data.image;
    $('shotSave').setAttribute('download', 'pc-capture-' + Date.now() + '.png');
    $('shotWrap').hidden = false;
    $('shotPh').hidden = true;
    $('shotSave').hidden = false;
    $('shotLead').textContent = 'PC 화면을 캡처했습니다.';
    $('shotInfo').textContent = (r.data.width || '?') + '×' + (r.data.height || '?') +
      ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + '초';
  } else {
    const msg = (r.data && (r.data.error || r.data.detail)) || r.error || ('HTTP ' + r.status);
    $('shotLead').textContent = '캡처하지 못했어요';
    $('shotPh').textContent = msg + '\n\nPC에서 start_bridge.bat 이 실행 중인지 확인해 주세요.';
  }
}

/* ---------------- 설정 모달 ---------------- */
function openCfg() {
  $('cfgUrl').value = state.cfg.bridge || '';
  $('cfgToken').value = state.cfg.token || '';
  $('cfgNotion').value = state.cfg.notion || '';
  $('cfgResult').textContent = '';
  $('modalCfg').hidden = false;
  setTimeout(() => $('cfgUrl').focus(), 60);
}

async function testCfg() {
  const url = trimUrl($('cfgUrl').value) || DEFAULT_CFG.bridge;
  const token = $('cfgToken').value.trim();
  const out = $('cfgResult');
  out.textContent = '연결 확인 중…';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url + '/api/ping', { cache: 'no-store', signal: ctrl.signal });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (token) {
      const r2 = await fetch(url + '/api/status', { cache: 'no-store', headers: { 'X-Dashboard-Token': token } });
      if (r2.ok) {
        out.textContent = '✅ 연결 성공 · ' + (j && j.app ? j.app : 'PC 브릿지') + ' · 토큰도 정상입니다. 이제 [저장하고 연결]을 누르세요.';
      } else {
        out.textContent = '⚠️ 서버는 응답하지만 토큰이 맞지 않아요 (HTTP ' + r2.status + '). config.json 의 token 값을 다시 확인하세요.';
      }
    } else {
      out.textContent = '서버는 응답합니다. 토큰을 넣고 다시 테스트해 주세요.';
    }
  } catch (e) {
    out.textContent = '❌ 응답이 없어요 · PC에서 start_bridge.bat 이 실행 중인지, 주소와 Wi-Fi가 같은지 확인하세요.';
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- 초기화 ---------------- */
function buildCommands() {
  $('cmds').innerHTML = COMMANDS.map((c) => {
    const mark = c.kind === 'link' ? '↗' : c.kind === 'action' ? '⟳' : '↵';
    return '<button class="card cmd" data-cmd="' + c.id + '">' +
      '<div class="top"><span class="ico">' + (ICO[c.icon] || '') + '</span><span class="mark">' + mark + '</span></div>' +
      '<div class="lbl">' + c.label + '</div>' +
      '<div class="sub">' + c.sub + '</div></button>';
  }).join('');
}

function buildApps() {
  $('apps').innerHTML = APPS.map((a) =>
    '<button class="card app' + (a.danger ? ' danger' : '') + '" data-app="' + a.id + '">' +
    (a.ext ? '<span class="mark">↗</span>' : '') +
    '<div class="aico">' + (ICO[a.icon] || '') + '</div>' +
    '<div class="lbl">' + a.label + '</div></button>'
  ).join('');
}

let pollTimer = null;
async function loop() {
  clearTimeout(pollTimer);
  if (!document.hidden) await refreshSystem();
  pollTimer = setTimeout(loop, state.conn.mode === 'live' ? 4000 : 15000);
}

function init() {
  els.shotImg = $('shotImg');
  els.shotLead = $('shotLead');
  els.shotInfo = $('shotInfo');
  els.shotSave = $('shotSave');
  els.shotWrap = $('shotWrap');
  els.shotPh = $('shotPh');

  $('brandLogo').innerHTML = ICO.monitor;
  $('btnRefresh').innerHTML = ICO.refresh;
  $('btnSettings').innerHTML = ICO.gear;
  document.querySelectorAll('[data-ico]').forEach((el) => {
    const k = el.getAttribute('data-ico');
    if (ICO[k]) el.innerHTML = ICO[k];
  });

  loadCfg();
  loadSlots();
  buildCommands();
  buildApps();
  renderSlots();
  renderConn();
  renderSys();
  renderWx();

  $('slots').addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (b) cycleSlot(Number(b.dataset.i));
  });
  $('cmds').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (b) runCommand(b.dataset.cmd);
  });
  $('apps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-app]');
    if (b) {
      const app = APPS.find((a) => a.id === b.dataset.app);
      if (app) launchApp(app);
    }
  });

  $('cmdCopy').addEventListener('click', () => runCommand('copy'));
  $('cmdClear').addEventListener('click', () => {
    if (!window.confirm('작업 상태 12칸을 모두 회색(대기)으로 되돌릴까요?')) return;
    state.slots.forEach((s) => { s.state = 'idle'; s.manual = true; });
    saveSlots();
    renderSlots();
    toast('작업 상태를 초기화했어요');
  });

  $('cardShot').addEventListener('click', doCapture);
  $('shotAgain').addEventListener('click', doCapture);
  $('shotClose').addEventListener('click', () => { $('modalShot').hidden = true; });
  $('cardPC').addEventListener('click', openCfg);
  $('chipCfg').addEventListener('click', (e) => { e.stopPropagation(); openCfg(); });
  $('btnSettings').addEventListener('click', openCfg);
  $('btnRefresh').addEventListener('click', () => runCommand('refresh'));

  $('cfgSave').addEventListener('click', async () => {
    const cfg = {
      bridge: trimUrl($('cfgUrl').value) || DEFAULT_CFG.bridge,
      token: $('cfgToken').value.trim(),
      notion: trimUrl($('cfgNotion').value)
    };
    saveCfg(cfg);
    $('modalCfg').hidden = true;
    toast('연결 설정을 저장했어요 (이 브라우저에만 저장)');
    await refreshSystem();
    if (state.conn.mode === 'live') toast('PC 브릿지에 연결됐어요');
    else if (state.conn.mode === 'auth') toast('서버는 응답해요 · 토큰을 확인해 주세요');
    else toast('PC에 연결되지 않아요 · 주소와 실행 상태를 확인하세요');
  });
  $('cfgTest').addEventListener('click', testCfg);
  $('cfgClose').addEventListener('click', () => { $('modalCfg').hidden = true; });

  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  refreshSystem();
  loadWeather(false);
  loadStatusJson();
  loop();
  setInterval(() => {
    if (state.conn.mode === 'live') $('pcMeta').textContent = agoText(state.conn.at);
  }, 1000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
