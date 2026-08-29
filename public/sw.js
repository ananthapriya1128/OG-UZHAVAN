const CACHE_NAME = "og-uzhavan-v1";
const OFFLINE_URLS = [
  "/",
  "/portal",
  "/farmer",
  "/farmer/token",
  "/farmer/queue",
  "/farmer/msp",
  "/farmer/booking",
  "/dpc/dashboard",
  "/index.html",
  "/manifest.json",
  "/images/paddy_landscape_bg.jpg"
];

// Install Event — Pre-cache critical offline app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("[SW] Cache addAll warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Stale-While-Revalidate Strategy for offline rural support
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback to root
          return cachedResponse || caches.match("/");
        });

      return cachedResponse || fetchPromise;
    })
  );
});
