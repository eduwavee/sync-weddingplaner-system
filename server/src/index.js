import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { q, tx, migrate } from './db.js';
import { login, issueToken, requireAuth, requireRole, canSee } from './auth.js';
import {
  loadWeddings, saveState, forCouple, bumpRev, ownerOf, newToken, HttpError,
} from './wedding-repo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const front = path.join(here, '..', '..');
const app = express();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
  next();
});
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '4mb' }));   // el estado completo de una planner son ~1 MB

const ok = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const view = (user, w) => (user.role === 'planner' ? w : forCouple(w));

/* ---------------- sesión ---------------- */
app.post('/api/auth/login',
  rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true }),
  ok(async (req, res) => {
    const user = await login(req.body?.email, req.body?.password);
    if (!user) return res.status(401).json({ error: 'Mail o contraseña incorrectos' });
    res.json({
      token: issueToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, weddingId: user.wedding_id },
    });
  }));

app.get('/api/me', requireAuth, ok(async (req, res) => {
  const { rows } = await q('select id, name, email, role, wedding_id from users where id = $1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuario inexistente' });
  const u = rows[0];
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, weddingId: u.wedding_id });
}));

/* ---------------- estado ----------------
   La planner ve todas sus bodas; los novios, sólo la suya y sin la trastienda
   (bitácora, notas internas, mensajes). */
async function weddingsFor(user, ids) {
  if (user.role === 'planner') return loadWeddings(user.sub, ids ? { ids } : {});
  const owner = await ownerOf(user.wid);
  if (!owner) return [];
  return (await loadWeddings(owner, { ids: [user.wid] })).map(forCouple);
}

app.get('/api/state', requireAuth, ok(async (req, res) => {
  res.json({ weddings: await weddingsFor(req.user), v: 5 });
}));

/* La planner manda sólo las bodas que cambiaron, cada una con la revisión que
   conoce, y las bajas explícitas en `deleted`. */
app.put('/api/state', requireAuth, requireRole('planner'), ok(async (req, res) => {
  const { weddings, deleted = [], force = false } = req.body || {};
  if (!Array.isArray(weddings) || !Array.isArray(deleted)) {
    return res.status(400).json({ error: 'Formato inválido: hacen falta weddings[] y deleted[]' });
  }
  if (weddings.some((w) => !w?.id || !w.couple || !/^\d{4}-\d{2}-\d{2}$/.test(w.date || ''))) {
    return res.status(400).json({ error: 'Hay una boda sin id, nombre o fecha' });
  }
  res.json(await saveState(req.user.sub, { weddings, deleted, force: !!force }));
}));

app.get('/api/weddings/:id', requireAuth, ok(async (req, res) => {
  if (!canSee(req.user, req.params.id)) return res.status(403).json({ error: 'No es tu boda' });
  const [w] = await weddingsFor(req.user, [req.params.id]);
  if (!w) return res.status(404).json({ error: 'No existe esa boda' });
  res.json(w);
}));

/* Una planner sólo toca sus bodas; los novios, la suya. */
async function guardWedding(user, weddingId) {
  if (!canSee(user, weddingId)) throw new HttpError(403, 'No es tu boda');
  const owner = await ownerOf(weddingId);
  if (!owner || (user.role === 'planner' && owner !== user.sub)) throw new HttpError(404, 'No existe esa boda');
  return owner;
}

/* Los novios aprueban un presupuesto o piden otra opción desde su portal. */
app.post('/api/weddings/:id/vendors/:vid/decision', requireAuth, ok(async (req, res) => {
  const { decision } = req.body || {};
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Decisión inválida' });
  const owner = await guardWedding(req.user, req.params.id);
  await tx(async (c) => {
    const { rows: [v] } = await c.query(
      'select * from vendors where wedding_id = $1 and id = $2 for update', [req.params.id, req.params.vid]);
    if (!v) throw new HttpError(404, 'No existe ese proveedor');
    if (v.status !== 'presupuestado') throw new HttpError(409, 'Ese presupuesto ya no espera respuesta');
    if (decision === 'approve') {
      await c.query("update vendors set status = 'aprobado' where id = $1", [v.id]);
      // mismo criterio que syncExpense en el front: el gasto nace al aprobar
      const { rows: has } = await c.query('select 1 from expenses where vendor_id = $1', [v.id]);
      if (!has.length && v.amount > 0) {
        await c.query(
          `insert into expenses (id, wedding_id, concept, cat, vendor_id, total, paid, due)
           select $1, $2, $3, $4, $5, $6, 0, w.date - 10 from weddings w where w.id = $2`,
          [crypto.randomUUID().slice(0, 8), req.params.id, v.name, v.cat, v.id, v.amount]);
      }
    } else {
      await c.query("update vendors set status = 'contactado' where id = $1", [v.id]);
    }
    await bumpRev(c, req.params.id);
  });
  const [w] = await loadWeddings(owner, { ids: [req.params.id] });
  res.json(view(req.user, w));
}));

/* Tareas: los novios sólo marcan las suyas. */
app.patch('/api/weddings/:id/tasks/:tid', requireAuth, ok(async (req, res) => {
  const owner = await guardWedding(req.user, req.params.id);
  const done = !!req.body?.done;
  await tx(async (c) => {
    const { rows: [t] } = await c.query(
      'select owner from tasks where wedding_id = $1 and id = $2', [req.params.id, req.params.tid]);
    if (!t) throw new HttpError(404, 'No existe esa tarea');
    if (req.user.role !== 'planner' && t.owner !== 'novios') throw new HttpError(403, 'Esa tarea es de la planner');
    await c.query('update tasks set done = $1 where id = $2', [done, req.params.tid]);
    await bumpRev(c, req.params.id);
  });
  const [w] = await loadWeddings(owner, { ids: [req.params.id] });
  res.json(view(req.user, w));
}));

/* ---------------- RSVP público ----------------
   Sin sesión: lo abre el invitado desde el link. La clave del link es el token
   personal del invitado (#rsvp/<slug>/<token>) o el id de la boda para el link
   general. Nunca devuelve presupuestos, proveedores, teléfonos ni la lista
   completa de invitados: el link general sólo permite buscar por nombre. */
const rsvpLimit = rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: true });
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const DIETS = ['', 'Vegetariano', 'Vegano', 'Celíaco'];

async function publicTarget(key) {
  key = String(key || '').slice(0, 80);
  const { rows: [g] } = await q('select * from guests where token = $1', [key]);
  let { rows: [w] } = await q(
    "select * from weddings where id = $1 and status <> 'lead'", [g ? g.wedding_id : key]);
  if (!w && !g) {
    // links viejos, sólo con el slug: valen si no hay dos bodas que se llamen igual
    const { rows } = await q("select * from weddings where slug = $1 and status <> 'lead' limit 2", [key]);
    if (rows.length === 1) w = rows[0];
  }
  if (!w) return null;
  return { w, guest: g && !g.plus_of ? g : null };
}

async function guestView(g) {
  const { rows: [comp] } = await q('select name from guests where plus_of = $1 limit 1', [g.id]);
  return { id: g.id, name: g.name, rsvp: g.rsvp, diet: g.diet || '', plus: g.plus, companion: comp?.name || '' };
}

app.get('/api/public/rsvp/:key', rsvpLimit, ok(async (req, res) => {
  const t = await publicTarget(req.params.key);
  if (!t) return res.status(404).json({ error: 'Ese link de confirmación no existe' });
  const { w } = t;
  const [{ rows: timeline }, { rows: partners }, { rows: [n] }] = await Promise.all([
    q('select time, title, place, is_key from timeline where wedding_id = $1', [w.id]),
    q('select role, name from partners where wedding_id = $1', [w.id]),
    q('select count(*)::int as n from guests where wedding_id = $1', [w.id]),
  ]);
  res.json({
    wedding: {
      id: w.id, slug: w.slug, couple: w.couple, date: w.date, venue: w.venue, city: w.city, style: w.style,
      profile: { palette: w.profile?.palette || '', faq: w.profile?.faq || {} },
      partners: partners.map((p) => ({ role: p.role, name: String(p.name || '').split(' ')[0] })),
      timeline: timeline.map((x) => ({ time: x.time, title: x.title, place: x.place, key: x.is_key })),
      hasGuests: n.n > 0,
    },
    guest: t.guest ? await guestView(t.guest) : null,
  });
}));

app.get('/api/public/rsvp/:key/search', rsvpLimit, ok(async (req, res) => {
  const needle = norm(String(req.query.q || '').trim());
  if (needle.length < 3) return res.json({ guests: [] });
  const t = await publicTarget(req.params.key);
  if (!t) return res.status(404).json({ error: 'Ese link de confirmación no existe' });
  const { rows } = await q(
    'select id, name, rsvp, plus from guests where wedding_id = $1 and plus_of is null', [t.w.id]);
  res.json({
    guests: rows.filter((g) => norm(g.name).includes(needle)).slice(0, 5)
      .map((g) => ({ id: g.id, name: g.name, rsvp: g.rsvp, plus: g.plus })),
  });
}));

app.post('/api/public/rsvp/:key/confirm', rsvpLimit, ok(async (req, res) => {
  const { guestId, rsvp, diet = '', companion = '' } = req.body || {};
  if (!['si', 'no'].includes(rsvp)) return res.status(400).json({ error: 'Respuesta inválida' });
  if (!DIETS.includes(diet)) return res.status(400).json({ error: 'Menú inválido' });
  const t = await publicTarget(req.params.key);
  if (!t) return res.status(404).json({ error: 'Ese link de confirmación no existe' });

  const guest = await tx(async (c) => {
    const id = t.guest ? t.guest.id : guestId;
    const { rows: [g] } = await c.query(
      'select * from guests where wedding_id = $1 and id = $2 and plus_of is null for update', [t.w.id, id]);
    if (!g) throw new HttpError(404, 'No encontramos tu nombre en la lista');
    const { rows: [upd] } = await c.query(
      `update guests set rsvp = $2, diet = $3, rsvp_at = now(),
         table_n = case when $2 = 'si' then table_n else null end
       where id = $1 returning *`, [g.id, rsvp, diet]);

    const name = String(companion || '').trim().slice(0, 80);
    const { rows: [prev] } = await c.query('select id from guests where plus_of = $1 limit 1', [g.id]);
    if (rsvp === 'si' && name && g.plus) {
      if (prev) await c.query('update guests set name = $2, rsvp_at = now() where id = $1', [prev.id, name]);
      else {
        await c.query(
          `insert into guests (id, wedding_id, name, side, grp, rsvp, kind, plus_of, token, rsvp_at)
           values ($1, $2, $3, $4, $5, 'si', 'adulto', $6, $7, now())`,
          [crypto.randomUUID().slice(0, 8), t.w.id, name, g.side, g.grp, g.id, newToken()]);
      }
    } else if (prev) {
      await c.query('delete from guests where id = $1', [prev.id]);
    }
    await c.query('update weddings set updated_at = now() where id = $1', [t.w.id]);
    return upd;
  });
  res.json({ ok: true, guest: await guestView(guest) });
}));

/* ---------------- el front ----------------
   Sólo lo que el navegador necesita, no la raíz del repo: antes se podían
   bajar /server/src/*.js, el esquema y el package.json. */
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').send('window.ALIANZA_API = location.origin;\n');
});
app.use('/css', express.static(path.join(front, 'css')));
app.use('/js', express.static(path.join(front, 'js')));
app.get('/', (_req, res) => res.sendFile(path.join(front, 'index.html')));

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Demasiados datos en un solo guardado' });
  console.error(err);
  res.status(500).json({ error: 'Algo se rompió de este lado' });
});

export default app;

/* Se levanta sólo si se corre directo (npm start); los tests lo importan. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.PORT || 3000;
  migrate()
    .then(() => app.listen(port, () => console.log(`Alianza API en http://localhost:${port}`)))
    .catch((err) => { console.error('No se pudo preparar la base:', err.message); process.exit(1); });
}
