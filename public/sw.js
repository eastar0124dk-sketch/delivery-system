/* 홈 화면 앱용 서비스 워커 — 아주 얇게만 만든다.

   오더 자료는 항상 서버에서 새로 받아야 한다. 옛 자료를 캐시로 보여 주면
   이미 등록한 오더가 안 보이거나 지운 오더가 되살아난 것처럼 보인다.
   그래서 자료 요청(/api/…)은 절대 캐시하지 않는다.

   캐시하는 것은 화면 껍데기(html/css/js/아이콘) 뿐이고, 그것도 항상
   서버를 먼저 시도한 뒤 안 될 때만 캐시를 쓴다(network-first).
   Render 서버가 자다 깨는 동안 흰 화면이 뜨는 것을 막아 준다. */

const CACHE = 'order-app-v1';
const SHELL = [
  '/admin.html',
  '/auth-guard.js',
  '/hub-nav.js',
  '/rates.js',
  '/clients.js',
  '/region.js',
  '/icon-192.png',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))   // 하나 실패해도 설치는 계속
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // 저장·수정은 건드리지 않는다
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // 바깥 주소는 그대로 통과
  if (url.pathname.startsWith('/api/')) return;          // 오더 자료는 항상 서버에서

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => {
        if (m) return m;
        if (req.mode === 'navigate') return caches.match('/admin.html');
        return Response.error();
      }))
  );
});
