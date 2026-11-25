(() => {
  "use strict";
  const prefix = "EW_DRAW_V1:",
    databaseName = "elecworkshop-offline-v1",
    ownerKey = "ew-offline-owner";
  let options,
    opening,
    syncing = false;
  function user() {
    return options.getUser();
  }
  function allowed() {
    return options.personal() && !!user();
  }
  function key(id) {
    if (!user()) throw Error("Reconnecte-toi pour retrouver tes schémas.");
    return user().id + ":" + id;
  }
  function database() {
    if (!opening)
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("documents", { keyPath: "key" });
          db.createObjectStore("identities", { keyPath: "id" });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            opening = null;
          };
          resolve(request.result);
        };
        request.onerror = () => {
          opening = null;
          reject(Error("Le stockage local est indisponible."));
        };
      });
    return opening;
  }
  async function read(store, id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function change(store, id, update) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite"),
        table = tx.objectStore(store),
        request = table.get(id);
      let result;
      request.onsuccess = () => {
        try {
          result = update(request.result);
          if (result === undefined) table.delete(id);
          else table.put(result);
        } catch (err) {
          reject(err);
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(tx.error || Error("Enregistrement local impossible."));
      tx.onabort = () =>
        reject(tx.error || Error("Enregistrement local interrompu."));
    });
  }
  async function documents() {
    const owner = user()?.id;
    if (!owner) return [];
    const db = await database();
    const all = await new Promise((resolve, reject) => {
      const request = db
        .transaction("documents")
        .objectStore("documents")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return all.filter((record) => record.owner === owner);
  }
  function group(rows, owner, page, visibility) {
    return rows.filter(
      (row) =>
        row.author_id === owner &&
        row.page === page &&
        row.visibility === visibility &&
        row.content.startsWith(prefix),
    );
  }
  function baseline(rows, owner, page, visibility) {
    return group(rows, owner, page, visibility)
      .map(({ id, content }) => ({ id, content }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  function overlay(record) {
    let rows = record.rows.slice();
    for (const op of record.pending) {
      rows = rows.filter(
        (row) =>
          !(
            row.author_id === record.owner &&
            row.page === op.page &&
            row.visibility === op.visibility &&
            row.content.startsWith(prefix)
          ),
      );
      rows.push({
        id: "local:" + op.id,
        document_id: record.document.id,
        author_id: record.owner,
        page: op.page,
        visibility: op.visibility,
        content: op.content,
        status: "open",
      });
    }
    return rows;
  }
  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  async function rpc(name, args) {
    if (!navigator.onLine)
      throw Error(
        "Hors connexion. Les corrections restent enregistrées sur cet appareil.",
      );
    const response = await options.client
      .rpc(name, args)
      .abortSignal(AbortSignal.timeout(12000));
    if (response.error) throw response.error;
    return response.data;
  }
  function notify() {
    window.dispatchEvent(new CustomEvent("ew-offline-change"));
  }
  async function remember(profile) {
    if (!options.personal() || !user()) return;
    await change("identities", user().id, () => ({
      id: user().id,
      profile,
      savedAt: Date.now(),
    }));
    localStorage.setItem(ownerKey, user().id);
  }
  async function resume() {
    if (localStorage.getItem("ew-personal-device") !== "true") return null;
    const id = localStorage.getItem(ownerKey);
    if (!id) return null;
    const saved = await read("identities", id);
    if (!saved?.profile?.active) return null;
    return saved;
  }
  function logout() {
    localStorage.removeItem(ownerKey);
  }
  async function offlineShell() {
    if (!("serviceWorker" in navigator) || !("caches" in window))
      throw Error("Ce navigateur ne permet pas le mode hors connexion.");
    let timer;
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Error(
                  "La préparation hors connexion est indisponible. Ferme puis rouvre l’application et réessaie.",
                ),
              ),
            20000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const cache = await caches.open("ew-shell-offline-20261125-1");
      if (
        await cache.match(
          new URL("offline.js", location.href.split("?")[0]).href,
          { ignoreSearch: true },
        )
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw Error(
      "L’application se prépare pour le mode hors connexion. Ferme-la puis rouvre-la avant de réessayer.",
    );
  }
  async function prepare(document) {
    if (!allowed())
      throw Error(
        "Choisis un appareil personnel pour télécharger tes schémas.",
      );
    await offlineShell();
    const snapshot = await rpc("offline_snapshot", { p_document: document.id });
    const existing = await read("documents", key(document.id));
    if (existing?.pending.length)
      throw Error(
        "Synchronise les corrections en attente avant de télécharger à nouveau ce schéma.",
      );
    const response = await fetch(await options.docUrl(snapshot.document), {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw Error("Le PDF n’a pas pu être téléchargé.");
    const blob = await response.blob();
    if (!blob.size) throw Error("Le PDF téléchargé est vide.");
    let catalog = [];
    const symbols = await options.client
      .from("electrical_symbols")
      .select("id,slug,name,category,paths,active")
      .eq("active", true);
    if (!symbols.error) catalog = symbols.data || [];
    const record = await change("documents", key(document.id), (current) => {
      if (current?.pending.length)
        throw Error(
          "Des corrections viennent d’être enregistrées. Synchronise-les avant de remplacer le téléchargement.",
        );
      return {
        key: key(document.id),
        owner: user().id,
        document: snapshot.document,
        blob,
        rows: snapshot.rows,
        acceptedRevision: snapshot.current?.id || null,
        pending: [],
        catalog,
        downloadedAt: Date.now(),
        issue: null,
      };
    });
    navigator.storage?.persist?.().catch(() => {});
    notify();
    return record;
  }
  async function onlineEditor(document, afterClose) {
    let cached;
    try {
      cached = await read("documents", key(document.id));
    } catch (err) {
      console.error("Stockage local indisponible", err);
    }
    if (cached?.blob) {
      await open(document, false, undefined, afterClose);
      return;
    }
    const snapshot = await rpc("offline_snapshot", { p_document: document.id });
    let revision = snapshot.current?.id || null;
    await window.EW_PDF_EDITOR.open({
      sb: options.client,
      document: snapshot.document,
      user: user(),
      docUrl: options.docUrl,
      annotationRows: snapshot.rows,
      readOnly: !options.canAnnotate(),
      onClose: afterClose,
      saveAnnotations: async (page, visibility, content, rows) => {
        let base = baseline(rows, user().id, page, visibility);
        for (;;) {
          const result = await rpc("sync_offline_annotation", {
            p_operation: crypto.randomUUID(),
            p_document: document.id,
            p_page: page,
            p_visibility: visibility,
            p_content: content,
            p_base: base,
            p_revision: revision,
          });
          if (result.status === "synced")
            return { rows: result.rows, message: "Corrections synchronisées." };
          if (result.status === "revision") {
            if (
              !confirm(
                "La révision officielle a changé. Conserver ces corrections sur la révision " +
                  document.revision +
                  " ?",
              )
            )
              throw Error(
                "Enregistrement suspendu. Les corrections sont encore ouvertes dans l’éditeur.",
              );
            revision = result.current?.id || null;
          } else {
            if (
              !confirm(
                "Cette page a aussi été modifiée ailleurs. Remplacer ses corrections par celles affichées dans cet éditeur ?",
              )
            )
              throw Error(
                "Enregistrement suspendu. Les corrections sont encore ouvertes dans l’éditeur.",
              );
            base = baseline(result.rows, user().id, page, visibility);
          }
        }
      },
      onSubmitCorrections: options.canSend()
        ? () => options.submit(document)
        : undefined,
    });
  }
  async function getRecord(document) {
    const record = await read("documents", key(document.id));
    if (!record)
      throw Error(
        "Ce schéma doit être téléchargé avant de partir hors connexion.",
      );
    return record;
  }
  async function syncOne(id) {
    if (!allowed() || !navigator.onLine) return;
    const recordKey = key(id),
      owner = user().id;
    for (;;) {
      const record = await read("documents", recordKey);
      if (
        !record?.pending.length ||
        record.issue?.type === "revision" ||
        record.issue?.type === "conflict"
      )
        return;
      const op = record.pending[0];
      let result;
      try {
        result = await rpc("sync_offline_annotation", {
          p_operation: op.id,
          p_document: id,
          p_page: op.page,
          p_visibility: op.visibility,
          p_content: op.content,
          p_base: op.base,
          p_revision: op.revision,
        });
      } catch (err) {
        await change("documents", recordKey, (current) => ({
          ...current,
          issue: {
            type: "error",
            message: err.message || "Synchronisation indisponible.",
          },
        }));
        notify();
        return;
      }
      if (user()?.id !== owner) return;
      await change("documents", recordKey, (current) => {
        if (!current) return current;
        if (result.status !== "synced") {
          return {
            ...current,
            issue:
              result.status === "revision"
                ? { type: "revision", current: result.current }
                : {
                    type: "conflict",
                    rows: result.rows,
                    page: op.page,
                    visibility: op.visibility,
                  },
          };
        }
        const pending = current.pending
          .filter((item) => item.id !== op.id)
          .map((item) => {
            if (
              item.page === op.page &&
              item.visibility === op.visibility &&
              same(item.base, op.base)
            ) {
              return {
                ...item,
                id: crypto.randomUUID(),
                base: baseline(result.rows, owner, item.page, item.visibility),
              };
            }
            return item;
          });
        return { ...current, rows: result.rows, pending, issue: null };
      });
      notify();
      if (result.status !== "synced") return;
    }
  }
  async function synchronized(id) {
    const name = "ew-offline-" + key(id);
    if (navigator.locks)
      return navigator.locks.request(name, () => syncOne(id));
    return syncOne(id);
  }
  function editorState(record) {
    const message = record.issue
      ? "Enregistré sur cet appareil · Synchronisation suspendue. Consulte Hors connexion."
      : record.pending.length
        ? "Enregistré sur cet appareil · Synchronisation en attente."
        : "Corrections synchronisées.";
    return { rows: overlay(record), message };
  }
  async function save(document, page, visibility, content, initialRows) {
    const owner = user().id,
      recordKey = key(document.id);
    await change("documents", recordKey, (current) => {
      if (!current)
        throw Error("Télécharge ce schéma avant de travailler hors connexion.");
      const previous = current.pending.find(
        (item) => item.page === page && item.visibility === visibility,
      );
      const op = {
        id: crypto.randomUUID(),
        page,
        visibility,
        content,
        base: previous?.base || baseline(initialRows, owner, page, visibility),
        revision: previous?.revision ?? current.acceptedRevision,
      };
      // Prefer the confirmed response of an earlier save if this editor still holds its local placeholder.
      if (
        !previous &&
        group(initialRows, owner, page, visibility).some((row) =>
          row.id.startsWith("local:"),
        )
      ) {
        op.base = baseline(current.rows, owner, page, visibility);
      }
      return {
        ...current,
        pending: [
          ...current.pending.filter(
            (item) => item.page !== page || item.visibility !== visibility,
          ),
          op,
        ],
        issue: current.issue?.type === "error" ? null : current.issue,
      };
    });
    notify();
    await synchronized(document.id);
    const saved = await read("documents", recordKey);
    return editorState(saved);
  }
  async function syncAll() {
    if (syncing || !allowed() || !navigator.onLine) return;
    syncing = true;
    try {
      const identity = await options.client.auth.getUser();
      if (identity.error || identity.data.user?.id !== user()?.id) return;
      for (const record of await documents()) {
        if (record.pending.length) await synchronized(record.document.id);
      }
    } finally {
      syncing = false;
      notify();
    }
  }
  async function open(document, readOnly = false, viewRows, afterClose) {
    const record = await getRecord(document);
    if (!viewRows && navigator.onLine && !record.pending.length) {
      try {
        const fresh = await rpc("offline_snapshot", {
          p_document: document.id,
        });
        await change("documents", record.key, (current) => {
          if (current.pending.length) return current;
          return {
            ...current,
            rows: fresh.rows,
            issue:
              (fresh.current?.id || null) !== current.acceptedRevision
                ? { type: "revision", current: fresh.current }
                : null,
          };
        });
      } catch (err) {
        if (
          navigator.onLine &&
          !/fetch|network|timeout|connexion/i.test(err.message)
        ) {
          throw err;
        }
      }
    }
    const latest = await getRecord(document);
    if (latest.issue?.type === "revision" && !viewRows) {
      const label = latest.issue.current
        ? "La révision " +
          latest.issue.current.revision +
          " est désormais officielle."
        : "La révision officielle a changé.";
      if (
        !confirm(
          label +
            " Tu consultes la révision " +
            document.revision +
            ". Continuer sur cette révision ?",
        )
      )
        return;
    }
    await window.EW_PDF_EDITOR.open({
      sb: options.client,
      document: latest.document,
      user: user(),
      docUrl: options.docUrl,
      pdfData: await latest.blob.arrayBuffer(),
      annotationRows: viewRows || overlay(latest),
      catalogRows: latest.catalog,
      refreshAnnotations:
        !readOnly && !viewRows
          ? async () => editorState(await getRecord(document))
          : undefined,
      readOnly: readOnly || !options.canAnnotate(),
      saveAnnotations: (page, visibility, content, rows) =>
        save(document, page, visibility, content, rows),
      onSubmitCorrections: options.canSend()
        ? async () => {
            const current = await getRecord(document);
            if (current.pending.length)
              throw Error(
                "Synchronise les corrections avant de les envoyer au référent.",
              );
            return options.submit(document);
          }
        : undefined,
      onClose: () => {
        syncAll().catch(console.error);
        notify();
        afterClose?.();
      },
    });
  }
  async function remove(record) {
    if (record.pending.length)
      throw Error(
        "Synchronise tes corrections avant de retirer ce téléchargement.",
      );
    await change("documents", record.key, (current) => {
      if (current?.pending.length)
        throw Error("Des corrections restent à synchroniser.");
      return undefined;
    });
    notify();
  }
  async function resolveRevision(record) {
    const label = record.issue.current
      ? "la nouvelle révision " + record.issue.current.revision
      : "la nouvelle situation du schéma";
    if (
      !confirm(
        "Tu as vérifié " +
          label +
          " ? Conserver tes corrections sur la révision " +
          record.document.revision +
          " et les synchroniser ?",
      )
    )
      return;
    const revision = record.issue.current?.id || null;
    await change("documents", record.key, (current) => ({
      ...current,
      acceptedRevision: revision,
      pending: current.pending.map((op) => ({
        ...op,
        id: crypto.randomUUID(),
        revision,
      })),
      issue: null,
    }));
    await synchronized(record.document.id);
    notify();
  }
  async function resolveConflict(record, keepLocal) {
    const issue = record.issue;
    if (
      !confirm(
        keepLocal
          ? "Remplacer les corrections enregistrées de cette page par tes corrections locales ?"
          : "Utiliser la version enregistrée et abandonner tes corrections locales de cette page ?",
      )
    )
      return;
    await change("documents", record.key, (current) => {
      const pending = current.pending.filter(
        (op) => op.page !== issue.page || op.visibility !== issue.visibility,
      );
      const local = current.pending.find(
        (op) => op.page === issue.page && op.visibility === issue.visibility,
      );
      if (keepLocal && local)
        pending.push({
          ...local,
          id: crypto.randomUUID(),
          base: baseline(
            issue.rows,
            current.owner,
            local.page,
            local.visibility,
          ),
        });
      return { ...current, rows: issue.rows, pending, issue: null };
    });
    await synchronized(record.document.id);
    notify();
  }
  function button(label, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "secondary";
    element.textContent = label;
    element.onclick = async () => {
      element.disabled = true;
      try {
        await action();
      } catch (err) {
        options.report(err);
      } finally {
        element.disabled = false;
      }
    };
    return element;
  }
  async function render(container) {
    const identity = user();
    if (!identity) return;
    const records = await documents();
    if (user()?.id !== identity.id || !container.isConnected) return;
    container.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "Hors connexion";
    const status = document.createElement("p");
    status.textContent = navigator.onLine
      ? "Schémas enregistrés sur cet appareil."
      : "Hors connexion · Tes corrections seront synchronisées au retour du réseau.";
    const list = document.createElement("section");
    list.dataset.offlineList = "true";
    list.className = "card";
    container.append(title, status, button("Synchroniser", syncAll), list);
    if (navigator.onLine)
      container.append(button("Retour à mon compte", options.back));
    container.append(button("Déconnexion", options.signOut));
    if (!records.length) {
      const empty = document.createElement("p");
      empty.textContent =
        "Ouvre un schéma avec Internet, puis touche « Disponible hors connexion ».";
      list.append(empty);
    }
    for (const record of records) {
      const card = document.createElement("div");
      card.className = "item";
      const name = document.createElement("strong");
      name.textContent =
        record.document.filename + " · Rév. " + record.document.revision;
      const state = document.createElement("p");
      state.textContent = record.pending.length
        ? record.pending.length + " page(s) à synchroniser"
        : "Disponible hors connexion";
      const actions = document.createElement("div");
      actions.className = "toolbar";
      actions.append(
        button("Ouvrir", () => open(record.document)),
        button("Retirer le téléchargement", () => remove(record)),
      );
      card.append(name, state, actions);
      if (record.issue) {
        const warning = document.createElement("p");
        warning.className = "warning";
        if (record.issue.type === "revision") {
          const revision = record.issue.current;
          warning.textContent = revision
            ? "Une nouvelle révision " +
              revision.revision +
              " est disponible. Tes corrections concernent la révision " +
              record.document.revision +
              "."
            : "La révision officielle a changé.";
          actions.append(
            button("Conserver sur la rév. " + record.document.revision, () =>
              resolveRevision(record),
            ),
          );
          if (revision)
            actions.append(
              button("Voir la nouvelle révision", () =>
                options.openOnline(revision.id),
              ),
            );
        } else if (record.issue.type === "conflict") {
          warning.textContent =
            "La page " +
            record.issue.page +
            " a aussi été modifiée ailleurs. Compare les corrections avant de choisir.";
          actions.append(
            button("Voir mes corrections", () =>
              open(record.document, true, overlay(record)),
            ),
            button("Voir la version enregistrée", () =>
              open(record.document, true, record.issue.rows),
            ),
            button("Garder mes corrections", () =>
              resolveConflict(record, true),
            ),
            button("Garder la version enregistrée", () =>
              resolveConflict(record, false),
            ),
          );
        } else warning.textContent = record.issue.message;
        card.append(warning);
      }
      list.append(card);
    }
  }
  window.EW_OFFLINE = {
    init(config) {
      options = config;
      window.addEventListener("online", () => syncAll().catch(console.error));
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) syncAll().catch(console.error);
      });
      setInterval(() => syncAll().catch(console.error), 30000);
    },
    remember,
    resume,
    logout,
    prepare,
    open,
    onlineEditor,
    render,
    save,
    syncAll,
    documents,
    allowed,
    overlay,
  };
})();
