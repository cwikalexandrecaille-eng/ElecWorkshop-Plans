(() => {
  'use strict';
  const current = document.querySelector('meta[name="ew-build"]')?.content;
  if (!/^[a-f0-9]{40}$/.test(current || '')) return;
  const root = new URL('./', location.href);
  let available, banner, action, message, checking = false, applying = false;
  const hasWork = () => !!document.querySelector('.ew-editor-backdrop, .modal-bg, form[data-ew-update-dirty="true"]');
  const blockedMessage = 'Enregistre les modifications en cours, puis ferme la fenêtre ouverte avant d’actualiser.';

  document.addEventListener('input', trackForm, true);
  document.addEventListener('change', trackForm, true);
  function trackForm(event) {
    const form = event.target.closest?.('form');
    if (form) form.dataset.ewUpdateDirty = 'true';
  }
  async function request(url, json = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw Error('Publication indisponible.');
      return json ? await response.json() : await response.text();
    } finally { clearTimeout(timeout); }
  }
  function show() {
    if (!banner) {
      const style = document.createElement('style');
      style.textContent = '.ew-update-banner{position:sticky;top:0;z-index:900;box-sizing:border-box;background:#fff;color:#30343a;border-bottom:1px solid #d9dde1;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;box-shadow:0 3px 12px #30343a12;font:14px/1.4 system-ui,sans-serif}.ew-update-banner[hidden]{display:none}.ew-update-banner>div{max-width:900px;margin:auto;display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px}.ew-update-copy{flex:1;min-width:220px}.ew-update-copy strong{display:block;font-size:15px}.ew-update-copy p{margin:4px 0 0;font-size:12px}.ew-update-banner button{background:#424952;color:#fff;border:0;border-radius:9px;min-height:44px;padding:10px 16px;font:600 14px system-ui,sans-serif;cursor:pointer}.ew-update-banner button:disabled{opacity:.6}.ew-update-message{width:100%;margin:0;font-size:12px}';
      document.head.append(style);
      banner = document.createElement('section');
      banner.className = 'ew-update-banner';
      banner.setAttribute('aria-label', 'Mise à jour de l’application');
      banner.innerHTML = '<div><div class="ew-update-copy"><strong>Mise à jour disponible</strong><p>La mise à jour conserve vos données et vos schémas enregistrés.</p></div><button type="button">Actualiser</button><p class="ew-update-message" role="status" aria-live="polite"></p></div>';
      document.body.prepend(banner);
      action = banner.querySelector('button');
      message = banner.querySelector('.ew-update-message');
      action.onclick = apply;
    }
    banner.hidden = false;
  }
  async function check() {
    if (checking || applying || !navigator.onLine || document.hidden) return;
    checking = true;
    try {
      const result = await request(new URL('version.json', root));
      if (!/^[a-f0-9]{40}$/.test(result.version || '')) return;
      available = result.version !== current ? result.version : null;
      if (available) show();
      else if (banner) banner.hidden = true;
    } catch (_) {
      // A missing connection must never interrupt the current page or offline work.
    } finally { checking = false; }
  }
  async function apply() {
    if (!available || applying) return;
    if (hasWork()) { message.textContent = blockedMessage; return; }
    if (!navigator.onLine) { message.textContent = 'Retrouve Internet pour appliquer la mise à jour.'; return; }
    applying = true;
    action.disabled = true;
    message.textContent = 'Vérification de la mise à jour…';
    try {
      const result = await request(new URL('version.json', root));
      if (!/^[a-f0-9]{40}$/.test(result.version || '') || result.version === current) {
        throw Error('La mise à jour n’est pas encore disponible. Réessaie dans un instant.');
      }
      const target = new URL(location.href);
      target.searchParams.set('ew-update', result.version);
      const html = await request(target, false);
      const expected = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="ew-build"]')?.content;
      if (expected !== result.version) throw Error('La mise à jour est en cours de publication. Réessaie dans un instant.');
      // The user may have started editing while the network request was pending.
      if (hasWork()) throw Error(blockedMessage);
      location.replace(target.href);
    } catch (error) {
      message.textContent = error.name === 'AbortError' ? 'Le réseau ne répond pas. Réessaie quand la connexion sera revenue.' : error.message || 'Mise à jour indisponible. Réessaie.';
    } finally { applying = false; action.disabled = false; }
  }
  window.EW_UPDATES = { check, apply };
  setInterval(check, 60000);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('pageshow', check);
  check();
})();
