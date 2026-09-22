/* Capa de datos.
   Por defecto la demo trabaja contra localStorage y no necesita nada más.
   Si hay backend, se enciende así (consola del navegador, una vez):

     localStorage.setItem('alianza-api','http://localhost:3000')

   y desde ahí la app pide el estado a la API, guarda contra ella y pide
   usuario y contraseña. Para volver a la demo local:

     localStorage.removeItem('alianza-api')
*/
(() => {
  const API = window.ALIANZA_API || localStorage.getItem('alianza-api') || null;
  const TKEY = 'alianza-token';

  const store = {
    enabled: !!API,
    api: API,
    token: localStorage.getItem(TKEY) || null,
    user: null,
    push: () => {},          // lo reemplaza start() cuando hay API
  };
  window.Alianza = store;
  if (!API) return;

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(store.token ? { Authorization: `Bearer ${store.token}` } : {}),
  });

  async function call(path, opts = {}) {
    const res = await fetch(API + path, { ...opts, headers: headers() });
    if (res.status === 401) { store.token = null; localStorage.removeItem(TKEY); throw new Error('sesión vencida'); }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
    return res.json();
  }

  /* ---- login ---- */
  function askLogin() {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<form class="modal" novalidate>
        <h2>Alianza Wedding Studio</h2>
        <p class="muted" style="margin:-8px 0 18px;font-size:13px">Entrá con tu cuenta para ver tus bodas.</p>
        <div class="field"><label for="l_mail">Mail</label><input class="input" id="l_mail" type="email" autocomplete="username" required></div>
        <div class="field"><label for="l_pass">Contraseña</label><input class="input" id="l_pass" type="password" autocomplete="current-password" required></div>
        <div class="err" style="color:var(--bad);font-size:12.5px;min-height:1em"></div>
        <div class="foot"><button type="button" class="btn" data-local>Seguir en modo demo</button><button class="btn pri">Entrar</button></div>
      </form>`;
      document.body.appendChild(ov);
      const form = ov.querySelector('form');
      const err = ov.querySelector('.err');

      ov.querySelector('[data-local]').addEventListener('click', () => {
        localStorage.removeItem('alianza-api');
        ov.remove();
        resolve(null);
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn.pri');
        btn.disabled = true; err.textContent = '';
        try {
          const out = await call('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: ov.querySelector('#l_mail').value.trim(),
              password: ov.querySelector('#l_pass').value,
            }),
          });
          store.token = out.token;
          store.user = out.user;
          localStorage.setItem(TKEY, out.token);
          ov.remove();
          resolve(out.user);
        } catch (e2) {
          err.textContent = e2.message;
          btn.disabled = false;
        }
      });
      setTimeout(() => ov.querySelector('#l_mail').focus(), 20);
    });
  }

  /* ---- sincronización ----
     Se guarda el estado completo con un respiro de 1,2 s para no disparar
     una escritura por cada tecla. El servidor lo normaliza en sus tablas. */
  let timer = null, pending = null, saving = false;
  async function flush() {
    if (saving || !pending || !store.token) return;
    saving = true;
    const snapshot = pending; pending = null;
    try {
      await call('/api/state', { method: 'PUT', body: JSON.stringify({ weddings: snapshot.weddings }) });
    } catch (e) {
      console.warn('[alianza] no se pudo guardar en el servidor:', e.message);
    } finally {
      saving = false;
      if (pending) flush();
    }
  }

  store.start = async (onState) => {
    try {
      if (!store.token) { if (!(await askLogin())) return; }
      if (!store.user) store.user = await call('/api/me').catch(() => null);

      const remote = await call('/api/state');
      if (remote.weddings?.length) {
        onState(remote);
      } else if (store.user?.role === 'planner') {
        // base vacía: subimos lo que hay en el navegador como punto de partida
        const local = JSON.parse(localStorage.getItem('alianza-demo-v1') || 'null');
        if (local?.weddings?.length) {
          await call('/api/state', { method: 'PUT', body: JSON.stringify({ weddings: local.weddings }) });
        }
      }
      store.push = (state) => { pending = state; clearTimeout(timer); timer = setTimeout(flush, 1200); };
      window.addEventListener('beforeunload', () => { if (pending) flush(); });
    } catch (e) {
      console.warn('[alianza] sigo en modo local:', e.message);
    }
  };
})();
