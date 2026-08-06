// Service worker da Marta (PWA). Estratégia conservadora pra nunca servir página velha:
//  - estáticos do Next (/_next/static, versionados) e ícones → cache-first (abre instantâneo)
//  - navegações (páginas) → network-first, com o cache só como reserva offline
// Escopo = /lar/ (servido em /lar/sw.js). basePath fixo abaixo.
const CACHE = "marta-v1";
const BASE = "/lar";
const OFFLINE = BASE + "/";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const estatico = url.pathname.startsWith(BASE + "/_next/static") || url.pathname.startsWith(BASE + "/icons");
  if (estatico) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
        return res;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match(OFFLINE)) || Response.error();
      }
    })());
  }
});
