/* Family OS — service worker.
   Caches the app shell so it opens instantly and works offline.
   Bump CACHE when you change index.html or icons to force an update. */
const CACHE = "family-os-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // Don't fail the whole install if one optional asset (e.g. a PNG) is missing.
      Promise.allSettled(ASSETS.map((a) => c.add(a)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Never cache the Anthropic API or any cross-origin POST target.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Network-first for the HTML so updates show up; cache-first for everything else.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
