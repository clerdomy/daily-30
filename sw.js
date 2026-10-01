// Service worker: deixa o app funcionar offline depois da primeira visita.
// Ao mudar os arquivos do app, aumente o número da versão abaixo.
const CACHE = "ingles30-v9";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "words.js",
  "phrasal.js",
  "frases.js",
  "db.js",
  "leitura.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-64.png",
];
// Fontes do Google e bibliotecas do cdnjs e jsDelivr (leitor de PDF e EPUB): guarda na primeira vez
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: guarda a primeira vez e depois usa do cache
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Arquivos do app: responde do cache na hora e atualiza em segundo plano
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const update = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || caches.match("index.html"));
      return hit || update;
    })
  );
});
