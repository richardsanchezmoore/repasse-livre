// Service worker das Damas Virtuosas. Além de instalável, agora dá VELOCIDADE:
//  - estáticos do Next (/_next/static, versionados) e ícones → cache-first (instantâneo)
//  - navegações (páginas) → network-first, com o cache só como reserva offline
//  - o resto (imagens de dossiê, API) → rede normal (não arrisca servir foto velha)
const CACHE = "corte-v2";

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

  // versionados/imutáveis → cache-first (JS/CSS do Next e ícones vêm do cache = rápido)
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon")) {
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

  // páginas → network-first (nunca serve versão velha), cache só offline
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
        return res;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match("/")) || Response.error();
      }
    })());
  }
});
