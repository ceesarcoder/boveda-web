// Bóveda · service worker: la app abre al instante en visitas siguientes y aunque no haya internet.
// Solo guarda archivos fijos (la app cifrada, íconos, la librería de Supabase y las tipografías).
// Nunca guarda llamadas a la base ni a los catálogos: esos datos siempre llegan frescos.
const CACHE = "boveda-v1";
const FIXED_HOSTS = ["cdn.jsdelivr.net", "fonts.gstatic.com"];
const BUNDLE = /\/app\.[0-9a-f]+\.bin$/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;

  // La página de entrada: primero la red (así siempre llega la versión nueva); sin red, la guardada
  if (req.mode === "navigate" && url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
      return res;
    }).catch(() => caches.match("./").then(hit => hit || Response.error())));
    return;
  }

  // Archivos que no cambian (cada versión de la app tiene nombre propio): primero lo guardado
  const own = url.origin === location.origin && (BUNDLE.test(url.pathname) || /\/icons\/|manifest\.webmanifest$/.test(url.pathname));
  if (!own && !FIXED_HOSTS.includes(url.host)) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(async c => {
        if (BUNDLE.test(url.pathname)) for (const k of await c.keys()) if (BUNDLE.test(new URL(k.url).pathname) && k.url !== req.url) c.delete(k);
        c.put(req, copy);
      });
    }
    return res;
  })));
});
