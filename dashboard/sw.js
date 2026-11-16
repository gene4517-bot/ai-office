/* PC 컨트롤 대시보드 서비스 워커
   - 크롬 '정식 앱'(WebAPK) 설치 요건 충족용: 매니페스트 + 이 범위(./)의 fetch 핸들러
   - 네트워크 우선: 평소에는 항상 최신 파일을 먼저 받고, 실패했을 때만 캐시로 대체
   - PC 브릿지(http://192.168.x.x:8765 · http://localhost:8765 · Tailscale)나 날씨 API 같은
     외부 요청은 절대 가로채지 않고 그대로 통과시킵니다. */
const CACHE = 'pc-dashboard-v2';
const PRECACHE = ['./', './index.html', './style.css', './deck.css', './app.js', './deck.js', './manifest.json',
                  './icon-192.png', './icon-512.png'];

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
  // 외부 출처(PC 브릿지·날씨 API 등)는 그대로 통과
  if (url.origin !== self.location.origin) return;
  // 같은 출처라도 다른 호스트(로컬 테스트 주소 등)면 그대로 통과
  if (url.hostname !== self.location.hostname) return;

  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        const noStore = url.pathname.endsWith('/sw.js') ||
                        url.pathname.endsWith('manifest.json');
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
