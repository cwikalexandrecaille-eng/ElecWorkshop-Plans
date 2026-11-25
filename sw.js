/* ElecWorkshop Plans — installation et notifications push. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
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
