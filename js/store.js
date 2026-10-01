/* Capa de datos.
   Por defecto la demo trabaja contra localStorage y no necesita nada más.
   Hay backend cuando:
     - la página la sirve el servidor de server/ (config.js define ALIANZA_API), o
     - se lo pide a mano, una vez, desde la consola:
         localStorage.setItem('alianza-api','http://localhost:3000')
   "Seguir en modo demo" en el login deja la preferencia en alianza-mode=local.
   Para volver a intentar con el servidor: localStorage.removeItem('alianza-mode')

   Sincronización: se manda sólo lo que cambió respecto de la última versión
   que confirmó el servidor, cada boda con su revisión. Si alguien cambió la
   boda en el medio, el servidor no pisa nada y avisa (conflicto). Si falla la
   red, se reintenta solo; nada se descarta hasta que el servidor confirma. */
(() => {
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* modo privado */ } },
  };
  const API = ls.get('alianza-mode') === 'local' ? null : (ls.get('alianza-api') || window.ALIANZA_API || null);
  const TKEY = 'alianza-token';

  const store = {
    enabled: !!API,
    api: API,
    token: ls.get(TKEY),
    user: null,
    status: API ? 'idle' : 'local',
    detail: '',
    push: () => {},            // lo reemplaza start() cuando hay API y es la planner
    onStatus: null,            // (status, detail) => void
    onRemote: null,            // ({ all } | { replace }) => void
    onConflict: null,          // (weddingsDelServidor) => void
  };
  window.Alianza = store;
  if (!API) return;

  const setStatus = (s, detail = '') => {
    store.status = s; store.detail = detail;
    try { store.onStatus?.(s, detail); } catch { /* la UI no frena la sincronización */ }
  };

  class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }
  async function call(path, { method = 'GET', body, keepalive = false, auth = true } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method, keepalive,
        headers: {
          'Content-Type': 'application/json',
          ...(auth && store.token ? { Authorization: `Bearer ${store.token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'Sin conexión con el servidor');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) { store.token = null; ls.del(TKEY); }
    if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`);
    return data;
  }
  store.call = call;

  /* ---- login ---- */
  let loginOpen = null;
  function askLogin(again = false) {
    if (loginOpen) return loginOpen;
    loginOpen = new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<form class="modal" novalidate aria-labelledby="l_t">
        <h2 id="l_t">${again ? 'Tu sesión venció' : 'Alianza Wedding Studio'}</h2>
        <p class="muted modal-lead">${again
          ? 'Entrá de nuevo y seguimos guardando donde quedaste. No se perdió nada.'
          : 'Entrá con tu cuenta para ver tus bodas.'}</p>
        <div class="field"><label for="l_mail">Mail</label><input class="input" id="l_mail" type="email" autocomplete="username" required></div>
        <div class="field"><label for="l_pass">Contraseña</label><input class="input" id="l_pass" type="password" autocomplete="current-password" required></div>
        <div class="err" role="alert"></div>
        <div class="foot">${again ? '' : '<button type="button" class="btn" data-local>Seguir en modo demo</button>'}<button class="btn pri">Entrar</button></div>
      </form>`;
      document.body.appendChild(ov);
      const form = ov.querySelector('form');
      const err = ov.querySelector('.err');
      const done = (v) => { ov.remove(); loginOpen = null; resolve(v); };

      ov.querySelector('[data-local]')?.addEventListener('click', () => {
        ls.set('alianza-mode', 'local');
        done(null);
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn.pri');
        const email = ov.querySelector('#l_mail').value.trim(), password = ov.querySelector('#l_pass').value;
        if (!email || !password) { err.textContent = 'Completá el mail y la contraseña.'; return; }
        btn.disabled = true; btn.textContent = 'Entrando…'; err.textContent = '';
        try {
          const out = await call('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
          store.token = out.token;
          store.user = out.user;
          ls.set(TKEY, out.token);
          done(out.user);
        } catch (e2) {
          err.textContent = e2.status === 0 ? 'No hay conexión con el servidor. Probá de nuevo en un rato.' : e2.message;
          btn.disabled = false; btn.textContent = 'Entrar';
        }
      });
      setTimeout(() => ov.querySelector('#l_mail').focus(), 20);
    });
    return loginOpen;
  }

  store.logout = () => { ls.del(TKEY); location.reload(); };

  /* ---- sincronización ---- */
  const ser = (w) => JSON.stringify(w, (k, v) => (k === 'rev' ? undefined : v));
  const synced = new Map();          // id -> la boda tal como la confirmó el servidor
  const blocked = new Set();         // bodas en conflicto, esperando que la planner elija
  let state = null, timer = null, saving = false, attempt = 0;

  const markSynced = (weddings) => weddings.forEach((w) => synced.set(w.id, ser(w)));
  function diff() {
    if (!state) return { dirty: [], deleted: [] };
    const ids = new Set(state.weddings.map((w) => w.id));
    return {
      dirty: state.weddings.filter((w) => !blocked.has(w.id) && synced.get(w.id) !== ser(w)),
      deleted: [...synced.keys()].filter((id) => !ids.has(id) && !blocked.has(id)),
    };
  }
  const pendingChanges = () => { const d = diff(); return d.dirty.length + d.deleted.length > 0; };
  store.hasPending = pendingChanges;

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }

  async function flush() {
    if (saving || !state) return;
    if (!store.token) { if (!(await askLogin(true))) return; }
    const { dirty, deleted } = diff();
    if (!dirty.length && !deleted.length) { setStatus(blocked.size ? 'conflict' : 'saved'); return; }
    saving = true;
    setStatus('saving');
    const sent = new Map(dirty.map((w) => [w.id, ser(w)]));
    try {
      const out = await call('/api/state', { method: 'PUT', body: { weddings: dirty, deleted } });
      attempt = 0;
      const byId = (id) => state.weddings.find((w) => w.id === id);
      for (const { id, rev } of out.saved) {
        const w = byId(id);
        if (w) w.rev = rev;
        synced.set(id, sent.get(id));
      }
      deleted.forEach((id) => synced.delete(id));

      const fresh = new Map((out.fresh || []).map((w) => [w.id, w]));
      // respuestas nuevas de invitados: si no hubo cambios mientras viajaba, se toma la del servidor
      const replace = (out.merged || []).map((id) => fresh.get(id))
        .filter((fw) => fw && byId(fw.id) && ser(byId(fw.id)) === sent.get(fw.id));
      if (replace.length) { markSynced(replace); store.onRemote?.({ replace }); }

      const conflicts = (out.conflicts || []).map((id) => fresh.get(id)).filter(Boolean);
      if (conflicts.length) {
        conflicts.forEach((fw) => blocked.add(fw.id));
        setStatus('conflict');
        store.onConflict?.(conflicts);
      }
    } catch (e) {
      attempt++;
      if (e.status === 401) {
        setStatus('auth', 'La sesión venció');
        saving = false;
        if (await askLogin(true)) return flush();
        return;
      }
      const wait = Math.min(60_000, 2000 * 2 ** (attempt - 1));
      setStatus(e.status === 0 ? 'offline' : 'error', e.message);
      console.warn('[alianza] no se pudo guardar, reintento en', wait / 1000, 's:', e.message);
      schedule(wait);
    } finally {
      saving = false;
    }
    if (store.status !== 'offline' && store.status !== 'error' && pendingChanges()) schedule(300);
    else if (store.status === 'saving') setStatus(blocked.size ? 'conflict' : 'saved');
  }
  store.retry = () => { attempt = 0; flush(); };

  /** La planner eligió qué versión queda de una boda en conflicto. */
  store.resolve = (server, keep) => {
    blocked.delete(server.id);
    if (keep === 'server') {
      synced.set(server.id, ser(server));
      store.onRemote?.({ replace: [server] });
    } else {
      // "mantener la mía": se reintenta sobre la revisión actual del servidor
      const mine = state.weddings.find((w) => w.id === server.id);
      if (mine) mine.rev = server.rev;
      synced.set(server.id, ser(server));
    }
    schedule(50);
  };

  /* Traer lo nuevo del servidor (respuestas de invitados, aprobaciones de los
     novios) cuando la pestaña vuelve a primer plano, si no hay nada en vuelo
     ni nadie escribiendo. */
  async function refresh() {
    if (!state || saving || pendingChanges() || blocked.size || !store.token) return;
    if (document.querySelector('.overlay')) return;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== 'mselect') return;
    try {
      const remote = await call('/api/state');
      if (pendingChanges() || saving) return;
      const changed = remote.weddings.length !== synced.size
        || remote.weddings.some((w) => synced.get(w.id) !== ser(w));
      if (!changed) return;
      synced.clear(); markSynced(remote.weddings);
      store.onRemote?.({ all: remote.weddings });
    } catch { /* se intenta en la próxima */ }
  }

  /* ---- novios: escriben puntual, no el estado entero ---- */
  async function act(path, body, method = 'POST') {
    setStatus('saving');
    try {
      const w = await call(path, { method, body });
      markSynced([w]);
      store.onRemote?.({ replace: [w] });
      setStatus('saved');
      return w;
    } catch (e) {
      setStatus(e.status === 0 ? 'offline' : 'error', e.message);
      refresh();
      throw e;
    }
  }
  store.decide = (wid, vid, decision) => act(`/api/weddings/${encodeURIComponent(wid)}/vendors/${encodeURIComponent(vid)}/decision`, { decision });
  store.taskDone = (wid, tid, done) => act(`/api/weddings/${encodeURIComponent(wid)}/tasks/${encodeURIComponent(tid)}`, { done }, 'PATCH');

  /* ---- RSVP público: sin sesión ---- */
  const enc = encodeURIComponent;
  store.publicGet = (key) => call(`/api/public/rsvp/${enc(key)}`, { auth: false });
  store.publicSearch = (key, text) => call(`/api/public/rsvp/${enc(key)}/search?q=${enc(text)}`, { auth: false });
  store.publicConfirm = (key, body) => call(`/api/public/rsvp/${enc(key)}/confirm`, { method: 'POST', body, auth: false });

  store.start = async (onState) => {
    try {
      if (!store.token) { if (!(await askLogin())) { setStatus('local'); store.enabled = false; return; } }
      if (!store.user) store.user = await call('/api/me').catch(() => null);
      if (!store.user) { if (!(await askLogin(true))) return; }

      if (store.user.role === 'planner') {
        store.push = (s) => { state = s; if (pendingChanges()) { setStatus('pending'); schedule(1200); } };
      } else {
        store.push = (s) => { state = s; };
      }
      setStatus('saving', 'Trayendo tus bodas');
      const remote = await call('/api/state');
      setStatus('saved');
      if (remote.weddings?.length) {
        markSynced(remote.weddings);
        onState(remote);
      } else if (store.user.role === 'planner') {
        // base vacía: lo que hay en el navegador es el punto de partida y se sube en el primer guardado
        const local = JSON.parse(ls.get('alianza-demo-v1') || 'null');
        if (local?.weddings?.length) onState(local);
      }

      window.addEventListener('beforeunload', (e) => {
        if (store.user?.role !== 'planner' || !pendingChanges()) return;
        const { dirty, deleted } = diff();
        // keepalive deja que el pedido termine aunque se cierre la pestaña (hasta 64 KB)
        call('/api/state', { method: 'PUT', body: { weddings: dirty, deleted }, keepalive: true }).catch(() => {});
        e.preventDefault();
        e.returnValue = '';
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
      setInterval(() => { if (!document.hidden) refresh(); }, 45_000);
      window.addEventListener('online', () => store.retry());
    } catch (e) {
      console.warn('[alianza] sigo en modo local:', e.message);
      setStatus('error', `No se pudo conectar: ${e.message}`);
    }
  };
})();
