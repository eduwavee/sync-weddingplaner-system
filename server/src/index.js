import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { q, migrate } from './db.js';
import { login, issueToken, requireAuth, requireRole, canSee } from './auth.js';
import { loadWeddings, saveState } from './wedding-repo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '4mb' }));   // el estado completo de una planner son ~1 MB

const ok = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
  res.json(rows[0]);
}));

/* ---------------- estado ----------------
   La planner ve todas sus bodas; los novios, sólo la suya. */
app.get('/api/state', requireAuth, ok(async (req, res) => {
  const ownerId = req.user.role === 'planner' ? req.user.sub : await plannerOf(req.user.wid);
  const weddings = await loadWeddings(ownerId, req.user.role === 'planner' ? {} : { weddingId: req.user.wid });
  res.json({ weddings, v: 4 });
}));

app.put('/api/state', requireAuth, requireRole('planner'), ok(async (req, res) => {
  const weddings = req.body?.weddings;
  if (!Array.isArray(weddings)) return res.status(400).json({ error: 'Falta el arreglo de bodas' });
  const n = await saveState(req.user.sub, weddings);
  res.json({ saved: n });
}));

app.get('/api/weddings/:id', requireAuth, ok(async (req, res) => {
  if (!canSee(req.user, req.params.id)) return res.status(403).json({ error: 'No es tu boda' });
  const ownerId = req.user.role === 'planner' ? req.user.sub : await plannerOf(req.params.id);
  const [w] = await loadWeddings(ownerId, { weddingId: req.params.id });
  if (!w) return res.status(404).json({ error: 'No existe esa boda' });
  res.json(w);
}));

app.patch('/api/weddings/:id/guests/:gid', requireAuth, ok(async (req, res) => {
  if (!canSee(req.user, req.params.id)) return res.status(403).json({ error: 'No es tu boda' });
  const g = await updateGuest(req.params.id, req.params.gid, req.body || {});
  if (!g) return res.status(404).json({ error: 'No existe ese invitado' });
  res.json(g);
}));

/* ---------------- RSVP público ----------------
   Sin sesión: lo abre el invitado desde el link. Devuelve sólo lo necesario
   para confirmar, nunca presupuestos, proveedores ni teléfonos ajenos. */
const rsvpLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true });

app.get('/api/public/rsvp/:slug', rsvpLimit, ok(async (req, res) => {
  const w = await publicWedding(req.params.slug);
  if (!w) return res.status(404).json({ error: 'Ese link de confirmación no existe' });
  const { rows: guests } = await q(
    'select id, name, rsvp, diet, plus, plus_of from guests where wedding_id = $1 order by name', [w.id]);
  res.json({
    couple: w.couple, date: w.date, venue: w.venue, city: w.city,
    faq: w.profile?.faq || {},
    timeline: (await q('select time, title, place from timeline where wedding_id = $1', [w.id])).rows,
    guests: guests.map((g) => ({ id: g.id, name: g.name, rsvp: g.rsvp, diet: g.diet, plus: g.plus, plusOf: g.plus_of })),
  });
}));

app.post('/api/public/rsvp/:slug/confirm', rsvpLimit, ok(async (req, res) => {
  const { guestId, rsvp, diet, companion } = req.body || {};
  if (!['si', 'no'].includes(rsvp)) return res.status(400).json({ error: 'Respuesta inválida' });
  const w = await publicWedding(req.params.slug);
  if (!w) return res.status(404).json({ error: 'Ese link de confirmación no existe' });

  const guest = await updateGuest(w.id, guestId, { rsvp, diet: diet || '' });
  if (!guest) return res.status(404).json({ error: 'No encontramos tu nombre en la lista' });

  await q('delete from guests where wedding_id = $1 and plus_of = $2', [w.id, guestId]);
  if (rsvp === 'si' && companion?.trim()) {
    await q(
      `insert into guests (id, wedding_id, name, side, grp, rsvp, kind, plus_of)
       select $1, $2, $3, side, grp, 'si', 'adulto', id from guests where id = $4`,
      [crypto.randomUUID().slice(0, 8), w.id, companion.trim().slice(0, 80), guestId]);
  }
  res.json({ ok: true, guest });
}));

/* ---------------- la demo estática ---------------- */
app.use(express.static(path.join(here, '..', '..')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Algo se rompió de este lado' });
});

/* ---------------- helpers ---------------- */
async function plannerOf(weddingId) {
  const { rows } = await q('select owner_id from weddings where id = $1', [weddingId]);
  return rows[0]?.owner_id;
}
async function publicWedding(slug) {
  const { rows } = await q(
    "select * from weddings where slug = $1 and status <> 'lead' limit 1", [slug]);
  return rows[0];
}
async function updateGuest(weddingId, guestId, patch) {
  const fields = { rsvp: patch.rsvp, diet: patch.diet, table_n: patch.table, kind: patch.kind };
  // quien no viene no ocupa mesa, mande lo que mande el cliente
  if (fields.rsvp && fields.rsvp !== 'si') fields.table_n = null;
  const set = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!set.length) return null;
  const cols = set.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const { rows } = await q(
    `update guests set ${cols} where wedding_id = $1 and id = $2 returning *`,
    [weddingId, guestId, ...set.map(([, v]) => v)]);
  return rows[0] || null;
}

const port = process.env.PORT || 3000;
migrate()
  .then(() => app.listen(port, () => console.log(`Alianza API en http://localhost:${port}`)))
  .catch((err) => { console.error('No se pudo preparar la base:', err.message); process.exit(1); });

export default app;
