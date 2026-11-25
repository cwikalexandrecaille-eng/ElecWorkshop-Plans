/* ElecWorkshop Plans — installation et notifications push. */
const shellCache = "ew-shell-offline-20261125-1";
const localAssets = [
  "./",
  "./index.html",
  "./app.js",
  "./offline.js",
  "./push.js",
  "./pdf-editor.js",
  "./style.css",
  "./pdf-editor.css",
  "./redesign.css",
  "./ui-v3.css",
  "./config.js",
  "./icon.svg",
  "./icon-192.png",
  "./manifest.webmanifest",
];
const externalAssets = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",
  "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
];
const localPaths = new Set(
  localAssets.map((asset) => new URL(asset, self.registration.scope).pathname),
);
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(shellCache);
      await cache.addAll([
        ...localAssets.map((asset) => {
          const url = new URL(asset, self.registration.scope);
          url.searchParams.set("ew-release", "20261125-offline1");
          return url.href;
        }),
        ...externalAssets,
      ]);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("ew-shell-offline-") && name !== shellCache)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const navigation =
    event.request.mode === "navigate" &&
    url.href.startsWith(self.registration.scope);
  const local =
    url.origin === self.location.origin && localPaths.has(url.pathname);
  if (!navigation && !local && !externalAssets.includes(url.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(shellCache);
      try {
        const response = await fetch(event.request, {
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) throw Error("Ressource indisponible");
        const key = navigation
          ? new URL("index.html", self.registration.scope).href
          : local
            ? url.origin + url.pathname
            : url.href;
        await cache.put(key, response.clone()).catch(() => {});
        return response;
      } catch (err) {
        const key = navigation
          ? new URL("index.html", self.registration.scope).href
          : local
            ? url.origin + url.pathname
            : url.href;
        const cached = await cache.match(key, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })(),
  );
});
function destination(value) {
  const root = new URL("./", self.registration.scope);
  if (
    typeof value === "string" &&
    /^\?(correction|document)=[0-9a-f-]{36}$/i.test(value)
  )
    root.search = value;
  return root.href;
}
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification("ElecWorkshop Plans", {
      body:
        typeof payload.body === "string"
          ? payload.body
          : "Une nouvelle notification t’attend.",
      icon: new URL("icon-192.png", self.registration.scope).href,
      badge: new URL("icon-192.png", self.registration.scope).href,
      tag: payload.tag || "elecworkshop",
      data: { url: destination(payload.url) },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const window = windows.find((client) =>
        client.url.startsWith(self.registration.scope),
      );
      if (window) {
        await window.navigate(url);
        await window.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
