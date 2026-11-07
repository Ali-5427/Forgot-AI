// Forgot AI Minimal Pass-Through Service Worker
// Enables PWA installation on Chrome, Edge, and Android without caching stale assets.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler satisfies PWA installability requirements
// while ensuring zero-stale cache on Vercel deployments and auth requests.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
