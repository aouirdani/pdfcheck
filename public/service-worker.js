const CACHE_NAME = 'pdfcheck-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for same-origin HTML/CSS/JS
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/functions/v1/')) return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('stripe.com')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
