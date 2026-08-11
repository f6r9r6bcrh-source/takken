/* 宅建ゴロ単語帳 — オフライン用サービスワーカー
   アプリ本体は最初の起動で保存。音声は再生したぶんが自動でたまり、
   設定の「音声をぜんぶ保存」でまとめて先読みできます。
   アプリを更新したら CACHE の番号を上げてください。 */
const CACHE = "takken-goro-v5";

/* 起動に必要なものだけ先に保存する（音声24MBはここに含めない） */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./audio/manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    /* ignoreVary: 音声はブラウザが Range 付きで取りにくるので、
       保存済みの完全なレスポンスにも当たるようにしておく */
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        /* 206（部分レスポンス）は Cache API に保存できないので入れない */
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
