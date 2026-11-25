(() => {
  "use strict";
  let client = null,
    getUser = () => null,
    isPersonal = () => false;
  const settingLabels = {
    corrections: "Corrections envoyées au référent",
    feedback: "Retours du référent",
    revisions: "Nouvelles révisions des affaires suivies",
  };
  function supported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }
  async function registration() {
    let timer;
    try {
      return await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Error(
                  "Ferme puis rouvre ElecWorkshop Plans pour activer les notifications.",
                ),
              ),
            10000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function attach(subscription) {
    const sub = subscription.toJSON();
    const r = await client.rpc("register_push", {
      p_endpoint: sub.endpoint,
      p_p256dh: sub.keys.p256dh,
      p_auth: sub.keys.auth,
    });
    if (r.error) throw r.error;
  }
  async function disable() {
    if (!supported()) return;
    const reg = await registration(),
      subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const result = await client
        .rpc("unregister_push", { p_endpoint: subscription.endpoint })
        .abortSignal(AbortSignal.timeout(5000))
        .catch(() => null);
      const stopped = await subscription.unsubscribe();
      if (!stopped)
        throw Error(
          "Impossible de désactiver les notifications sur cet appareil.",
        );
      if (result?.error)
        console.error("Push registration removal pending logout");
    }
    for (const notice of await reg.getNotifications()) notice.close();
  }
  async function sync() {
    if (!supported() || !getUser()) return;
    const reg = await registration(),
      subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    if (!isPersonal()) {
      await disable();
      return;
    }
    if (Notification.permission === "granted") await attach(subscription);
  }
  async function render(container) {
    const user = getUser();
    if (!user) return;
    container.innerHTML =
      '<h2>Notifications sur cet appareil</h2><p data-push-status></p><div class="toolbar"><button type="button" class="secondary" data-push-enable disabled>Activer les notifications</button><button type="button" class="secondary" data-push-test hidden>Tester une notification</button><button type="button" class="secondary" data-push-disable hidden>Désactiver sur cet appareil</button></div><fieldset data-push-settings><legend>Alertes push à recevoir</legend></fieldset>';
    const status = container.querySelector("[data-push-status]"),
      enable = container.querySelector("[data-push-enable]"),
      stop = container.querySelector("[data-push-disable]"),
      settings = container.querySelector("[data-push-settings]"),
      test = container.querySelector("[data-push-test]");
    const fail = (err) => {
      status.textContent = err.message || "Notifications indisponibles.";
    };
    let publicKey = null;
    async function refresh() {
      const available = supported();
      const installed =
        window.matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone;
      const iphone =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const subscribed = available
        ? await (await registration()).pushManager.getSubscription()
        : null;
      enable.hidden = !!subscribed;
      stop.hidden = !subscribed;
      test.hidden = !subscribed;
      enable.disabled =
        !available || !isPersonal() || (iphone && !installed) || !publicKey;
      status.textContent = !isPersonal()
        ? "Choisis « Cet appareil est personnel » pour activer les notifications."
        : iphone && !installed
          ? "Sur iPhone, ouvre ElecWorkshop Plans depuis son icône sur l’écran d’accueil."
          : !available
            ? "Les notifications push sont indisponibles dans ce navigateur."
            : Notification.permission === "denied"
              ? "Autorise ElecWorkshop Plans dans les réglages de notifications de ton appareil."
              : subscribed
                ? "Notifications activées sur cet appareil."
                : "Active les notifications pour recevoir les alertes avec l’application fermée.";
    }
    enable.onclick = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        await refresh();
        return;
      }
      enable.disabled = true;
      try {
        if (!isPersonal() || !getUser())
          throw Error("Reconnecte-toi sur ton appareil personnel.");
        const padded = publicKey + "=".repeat((4 - (publicKey.length % 4)) % 4);
        const key = Uint8Array.from(
          atob(padded.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        const reg = await registration();
        const sub =
          (await reg.pushManager.getSubscription()) ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          }));
        try {
          await attach(sub);
        } catch (err) {
          await sub.unsubscribe();
          throw err;
        }
        await refresh();
      } catch (err) {
        fail(err);
        enable.disabled = false;
      }
    };
    test.onclick = async () => {
      test.disabled = true;
      try {
        const r = await client.rpc("test_push");
        if (r.error) throw r.error;
        status.textContent =
          "Test demandé. L’alerte devrait arriver d’ici une minute.";
      } catch (err) {
        fail(err);
      } finally {
        test.disabled = false;
      }
    };
    stop.onclick = async () => {
      stop.disabled = true;
      try {
        await disable();
        await refresh();
      } catch (err) {
        fail(err);
      } finally {
        stop.disabled = false;
      }
    };
    try {
      const [keyResult, prefs] = await Promise.all([
        client.rpc("push_public_key"),
        client
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (keyResult.error) throw keyResult.error;
      if (prefs.error) throw prefs.error;
      publicKey = keyResult.data;
      for (const [key, label] of Object.entries(settingLabels)) {
        const row = document.createElement("label");
        row.className = "ew-device-choice";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = prefs.data?.[key] ?? true;
        row.append(input, document.createTextNode(label));
        settings.append(row);
        input.onchange = async () => {
          input.disabled = true;
          const r = await client
            .from("notification_preferences")
            .upsert(
              { user_id: user.id, [key]: input.checked },
              { onConflict: "user_id" },
            );
          input.disabled = false;
          if (r.error) {
            input.checked = !input.checked;
            fail(r.error);
          }
        };
      }
      await refresh();
    } catch (err) {
      fail(err);
      enable.disabled = true;
    }
  }
  window.EW_PUSH = {
    init(options) {
      client = options.client;
      getUser = options.getUser;
      isPersonal = options.isPersonal;
    },
    disable,
    sync,
    render,
  };
})();
