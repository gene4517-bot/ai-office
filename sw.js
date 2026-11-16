/* AI 사무실 서비스 워커
   - 설치 요건 충족용 최소 구현
   - 네트워크 우선: 항상 최신 파일을 먼저 시도하고, 실패했을 때만 캐시로 대체
   - status.json 은 캐시에 저장하지 않아 화면이 항상 최신 상태를 읽습니다 */
const CACHE = 'ai-office-v3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/office-day.png',
  './assets/office-night.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        const noStore = url.pathname.endsWith('/status.json') || url.pathname.endsWith('sw.js');
        if (res && res.ok && !noStore) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
