import crypto from 'node:crypto';
import { q, tx } from './db.js';

/* El front trabaja con un documento por boda. Acá se arma desde las tablas
   y se vuelve a desarmar al guardar. La base queda normalizada; el cliente,
   simple. */

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const newToken = () => crypto.randomBytes(9).toString('base64url').slice(0, 12);

const rowsBy = (rows, key) => {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r[key])) out.set(r[key], []);
    out.get(r[key]).push(r);
  }
  return out;
};
const iso = (d) => (d ? new Date(d).toISOString() : null);

const CHILDREN = [
  ['partners',  'select * from partners where wedding_id = any($1)'],
  ['fees',      'select * from fee_installments where wedding_id = any($1) order by due'],
  ['guests',    'select * from guests where wedding_id = any($1) order by name'],
  ['vendors',   'select * from vendors where wedding_id = any($1)'],
  ['expenses',  'select * from expenses where wedding_id = any($1) order by due'],
  ['tasks',     'select * from tasks where wedding_id = any($1) order by due'],
  ['timeline',  'select * from timeline where wedding_id = any($1)'],
  ['meetings',  'select * from meetings where wedding_id = any($1) order by date'],
  ['log',       'select * from wedding_log where wedding_id = any($1) order by date desc'],
  ['docs',      'select * from docs where wedding_id = any($1) order by date desc'],
  ['messages',  'select * from messages where wedding_id = any($1) order by date desc'],
];

/** Las bodas de una planner. Con `ids`, sólo esas. */
export async function loadWeddings(ownerId, { ids } = {}) {
  const { rows: ws } = ids
    ? await q('select * from weddings where owner_id = $1 and id = any($2) order by date', [ownerId, ids])
    : await q('select * from weddings where owner_id = $1 order by date', [ownerId]);
  if (!ws.length) return [];
  const wids = ws.map((w) => w.id);

  const parts = {};
  await Promise.all(CHILDREN.map(async ([name, sql]) => {
    parts[name] = rowsBy((await q(sql, [wids])).rows, 'wedding_id');
  }));
  const planRows = (await q(
    `select p.* from expense_plan p join expenses e on e.id = p.expense_id
      where e.wedding_id = any($1) order by p.due`, [wids])).rows;
  const planBy = rowsBy(planRows, 'expense_id');

  return ws.map((w) => ({
    id: w.id, rev: w.rev, slug: w.slug, status: w.status, couple: w.couple, date: w.date,
    venue: w.venue, city: w.city, target: w.target, budget: w.budget,
    style: w.style, tables: w.tables, tableMeta: w.table_meta || [],
    profile: w.profile || {},
    ...(w.lead ? { lead: w.lead } : {}),
    contract: {
      plan: w.plan, fee: w.fee, signed: w.signed,
      installments: (parts.fees.get(w.id) || []).map((i) => ({
        id: i.id, label: i.label, amount: i.amount, due: i.due, paid: i.paid, paidOn: i.paid_on,
      })),
    },
    partners: (parts.partners.get(w.id) || []).map((p) => ({
      id: p.id, role: p.role, name: p.name, phone: p.phone, email: p.email, ig: p.ig,
    })),
    guests: (parts.guests.get(w.id) || []).map((g) => ({
      id: g.id, name: g.name, side: g.side, group: g.grp, rsvp: g.rsvp, diet: g.diet,
      table: g.table_n, kind: g.kind, plus: g.plus, plusOf: g.plus_of, phone: g.phone,
      token: g.token, rsvpAt: iso(g.rsvp_at),
    })),
    vendors: (parts.vendors.get(w.id) || []).map((v) => ({
      id: v.id, name: v.name, cat: v.cat, contact: v.contact, phone: v.phone,
      status: v.status, amount: v.amount,
    })),
    expenses: (parts.expenses.get(w.id) || []).map((e) => ({
      id: e.id, concept: e.concept, cat: e.cat, vendorId: e.vendor_id,
      total: e.total, paid: e.paid, due: e.due,
      plan: (planBy.get(e.id) || []).map((c) => ({
        id: c.id, label: c.label, amount: c.amount, due: c.due, paid: c.paid,
      })),
    })),
    tasks: (parts.tasks.get(w.id) || []).map((t) => ({
      id: t.id, title: t.title, due: t.due, owner: t.owner, cat: t.cat, done: t.done,
    })),
    timeline: (parts.timeline.get(w.id) || []).map((x) => ({
      id: x.id, time: x.time, title: x.title, place: x.place, who: x.who, key: x.is_key,
    })),
    meetings: (parts.meetings.get(w.id) || []).map((m) => ({
      id: m.id, date: m.date, time: m.time, title: m.title, place: m.place, kind: m.kind, done: m.done,
    })),
    log: (parts.log.get(w.id) || []).map((l) => ({
      id: l.id, date: l.date, kind: l.kind, title: l.title, body: l.body,
    })),
    docs: (parts.docs.get(w.id) || []).map((d) => ({
      id: d.id, name: d.name, kind: d.kind, url: d.url, date: d.date,
    })),
    messages: (parts.messages.get(w.id) || []).map((m) => ({
      id: m.id, date: m.date, channel: m.channel, to: m.to_name, toId: m.to_id,
      template: m.template, tplLabel: m.tpl_label, title: m.title, body: m.body,
    })),
  }));
}

/** Lo que ven los novios: su boda sin la trastienda de la planner. */
export function forCouple(w) {
  const { log, messages, lead, ...rest } = w;
  const { notes, ...profile } = w.profile || {};
  return { ...rest, profile, log: [], messages: [] };
}

/* ---------------- limpieza del payload ----------------
   El front puede mandar algo inconsistente (un acompañante cuyo titular se
   borró, un gasto que apunta a un proveedor que ya no está). Antes eso hacía
   fallar la transacción en cada guardado, para siempre. Ahora se corrige acá. */
const oneOf = (v, opts, def) => (opts.includes(v) ? v : def);
const uniq = (arr) => {
  const seen = new Set();
  return (arr || []).filter((x) => x && x.id && !seen.has(x.id) && seen.add(x.id));
};

export function sanitize(w) {
  const guests = uniq(w.guests).filter((g) => g.name);
  const titulares = new Set(guests.filter((g) => !g.plusOf).map((g) => g.id));
  const vendors = uniq(w.vendors).filter((v) => v.name);
  const vendorIds = new Set(vendors.map((v) => v.id));
  const tokens = new Set();
  const tokenFor = (t) => { if (!t || tokens.has(t)) t = newToken(); tokens.add(t); return t; };
  return {
    ...w,
    status: oneOf(w.status, ['lead', 'activa', 'finalizada'], 'activa'),
    partners: uniq(w.partners).filter((p) => p.name != null),
    guests: guests
      .filter((g) => !g.plusOf || titulares.has(g.plusOf))
      .map((g) => ({
        ...g,
        rsvp: oneOf(g.rsvp, ['si', 'no', 'pendiente'], 'pendiente'),
        kind: oneOf(g.kind, ['adulto', 'niño'], 'adulto'),
        table: g.rsvp === 'si' && Number.isInteger(g.table) ? g.table : null,
        token: tokenFor(g.token),
      })),
    vendors: vendors.map((v) => ({
      ...v,
      status: oneOf(v.status, ['contactado', 'presupuestado', 'aprobado', 'senado', 'confirmado'], 'contactado'),
      amount: Math.max(0, +v.amount || 0),
    })),
    expenses: uniq(w.expenses).filter((e) => e.concept).map((e) => {
      const total = Math.max(0, +e.total || 0);
      return {
        ...e, total, paid: Math.min(Math.max(0, +e.paid || 0), total),
        vendorId: vendorIds.has(e.vendorId) ? e.vendorId : null,
        plan: uniq(e.plan).filter((c) => c.due),
      };
    }),
    tasks: uniq(w.tasks).filter((t) => t.title && t.due)
      .map((t) => ({ ...t, owner: oneOf(t.owner, ['planner', 'novios'], 'planner'), done: !!t.done })),
    timeline: uniq(w.timeline).filter((x) => x.time && x.title),
    meetings: uniq(w.meetings).filter((m) => m.date && m.title),
    log: uniq(w.log).filter((l) => l.date && l.title),
    docs: uniq(w.docs).filter((d) => d.name && /^https?:\/\//i.test(d.url || '')),
    messages: uniq(w.messages).filter((m) => m.date)
      .map((m) => ({ ...m, channel: oneOf(m.channel, ['whatsapp', 'mail'], 'whatsapp') })),
    contract: {
      ...(w.contract || {}),
      installments: uniq(w.contract?.installments).filter((i) => i.label && i.due),
    },
  };
}

/* ---------------- respuestas de invitados ----------------
   Los invitados confirman desde su link directo contra la base, mientras la
   planner trabaja sobre la copia que bajó antes. Si guarda una copia que no
   vio una respuesta (su rsvpAt es más viejo que el de la base), la respuesta
   del invitado gana: rsvp, menú y acompañante. */
const ms = (d) => (d ? new Date(d).getTime() : 0);

export function mergeGuestAnswers(clientGuests, serverRows) {
  const answered = serverRows.filter((r) => !r.plus_of && r.rsvp_at);
  const byId = new Map(clientGuests.map((g) => [g.id, g]));
  const winners = new Set();
  for (const r of answered) {
    const c = byId.get(r.id);
    if (!c) continue;                                   // la planner lo borró: gana el borrado
    if (ms(c.rsvpAt) >= ms(r.rsvp_at)) continue;        // ya la vio
    Object.assign(c, { rsvp: r.rsvp, diet: r.diet, rsvpAt: iso(r.rsvp_at) });
    if (r.rsvp !== 'si') c.table = null;
    winners.add(r.id);
  }
  if (!winners.size) return { guests: clientGuests, merged: false };
  // los acompañantes de esos invitados son los de la base, no los del cliente
  const companions = serverRows.filter((r) => r.plus_of && winners.has(r.plus_of)).map((r) => ({
    id: r.id, name: r.name, side: r.side, group: r.grp, rsvp: r.rsvp, diet: r.diet,
    table: r.table_n, kind: r.kind, plus: false, plusOf: r.plus_of, phone: r.phone || '',
    token: r.token, rsvpAt: iso(r.rsvp_at),
  }));
  const companionIds = new Set(companions.map((x) => x.id));
  const guests = clientGuests
    .filter((g) => !(g.plusOf && winners.has(g.plusOf)) && !companionIds.has(g.id))
    .concat(companions);
  return { guests, merged: true };
}

/* ---------------- guardar ----------------
   La boda es la unidad. Se reemplazan los hijos en bloque dentro de una
   transacción, que para este volumen (cientos de filas) es más simple y más
   seguro que diferenciar fila por fila. */
async function insertMany(c, table, cols, rows) {
  if (!rows.length) return;
  const values = [];
  const tuples = rows.map((r, i) =>
    `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`);
  for (const r of rows) for (const col of cols) values.push(r[col]);
  await c.query(`insert into ${table} (${cols.join(',')}) values ${tuples.join(',')}`, values);
}

/**
 * Guarda una boda. Devuelve { rev } o { conflict: true } si la revisión que
 * mandó el cliente no es la de la base (y no pidió forzar).
 * Tira HttpError 403 si la boda existe y es de otra planner.
 */
export async function saveWedding(c, ownerId, raw, { force = false } = {}) {
  const { rows: [cur] } = await c.query(
    'select owner_id, rev from weddings where id = $1 for update', [raw.id]);
  if (cur && cur.owner_id !== ownerId) throw new HttpError(403, 'Esa boda no es tuya');
  if (cur && !force && (raw.rev ?? null) !== cur.rev) return { conflict: true, rev: cur.rev };
  const rev = (cur?.rev ?? 0) + 1;

  const w = sanitize(raw);
  let merged = false;
  if (cur) {
    const { rows } = await c.query('select * from guests where wedding_id = $1', [w.id]);
    ({ guests: w.guests, merged } = mergeGuestAnswers(w.guests, rows));
  }

  await c.query(
    `insert into weddings (id, owner_id, slug, status, couple, date, venue, city, target, budget,
        style, tables, table_meta, profile, lead, plan, fee, signed, rev, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now())
     on conflict (id) do update set
       slug=excluded.slug, status=excluded.status, couple=excluded.couple, date=excluded.date,
       venue=excluded.venue, city=excluded.city, target=excluded.target, budget=excluded.budget,
       style=excluded.style, tables=excluded.tables, table_meta=excluded.table_meta,
       profile=excluded.profile, lead=excluded.lead, plan=excluded.plan, fee=excluded.fee,
       signed=excluded.signed, rev=excluded.rev, updated_at=now()
     where weddings.owner_id = $2`,
    [w.id, ownerId, w.slug, w.status, w.couple, w.date, w.venue, w.city, w.target || 0,
     w.budget || 0, w.style, w.tables || 0, JSON.stringify(w.tableMeta || []),
     JSON.stringify(w.profile || {}), w.lead ? JSON.stringify(w.lead) : null,
     w.contract?.plan || null, w.contract?.fee || 0, w.contract?.signed || null, rev]);

  for (const t of ['partners', 'fee_installments', 'guests', 'vendors', 'expenses',
                   'tasks', 'timeline', 'meetings', 'wedding_log', 'docs', 'messages']) {
    await c.query(`delete from ${t} where wedding_id = $1`, [w.id]);
  }

  await insertMany(c, 'partners', ['id', 'wedding_id', 'role', 'name', 'phone', 'email', 'ig'],
    w.partners.map((p) => ({ ...p, wedding_id: w.id, phone: p.phone || '', email: p.email || '', ig: p.ig || '' })));

  await insertMany(c, 'fee_installments', ['id', 'wedding_id', 'label', 'amount', 'due', 'paid', 'paid_on'],
    w.contract.installments.map((i) => ({ ...i, wedding_id: w.id, amount: +i.amount || 0, paid: !!i.paid, paid_on: i.paidOn || null })));

  // primero los invitados sin acompañante: plus_of apunta a otra fila de la misma tabla
  const guests = w.guests.slice().sort((a, b) => (a.plusOf ? 1 : 0) - (b.plusOf ? 1 : 0));
  await insertMany(c, 'guests',
    ['id', 'wedding_id', 'name', 'side', 'grp', 'rsvp', 'diet', 'table_n', 'kind', 'plus', 'plus_of', 'phone', 'token', 'rsvp_at'],
    guests.map((g) => ({ id: g.id, wedding_id: w.id, name: g.name, side: g.side, grp: g.group,
      rsvp: g.rsvp, diet: g.diet || '', table_n: g.table ?? null, kind: g.kind,
      plus: !!g.plus, plus_of: g.plusOf || null, phone: g.phone || '', token: g.token,
      rsvp_at: g.rsvpAt || null })));

  await insertMany(c, 'vendors', ['id', 'wedding_id', 'name', 'cat', 'contact', 'phone', 'status', 'amount'],
    w.vendors.map((v) => ({ ...v, wedding_id: w.id })));

  await insertMany(c, 'expenses', ['id', 'wedding_id', 'concept', 'cat', 'vendor_id', 'total', 'paid', 'due'],
    w.expenses.map((e) => ({ id: e.id, wedding_id: w.id, concept: e.concept, cat: e.cat,
      vendor_id: e.vendorId, total: e.total, paid: e.paid, due: e.due || null })));

  await insertMany(c, 'expense_plan', ['id', 'expense_id', 'label', 'amount', 'due', 'paid'],
    w.expenses.flatMap((e) => e.plan.map((p) => ({ ...p, expense_id: e.id, amount: +p.amount || 0, paid: !!p.paid }))));

  await insertMany(c, 'tasks', ['id', 'wedding_id', 'title', 'due', 'owner', 'cat', 'done'],
    w.tasks.map((t) => ({ ...t, wedding_id: w.id })));

  await insertMany(c, 'timeline', ['id', 'wedding_id', 'time', 'title', 'place', 'who', 'is_key'],
    w.timeline.map((x) => ({ ...x, wedding_id: w.id, is_key: !!x.key })));

  await insertMany(c, 'meetings', ['id', 'wedding_id', 'date', 'time', 'title', 'place', 'kind', 'done'],
    w.meetings.map((m) => ({ ...m, wedding_id: w.id, done: !!m.done })));

  await insertMany(c, 'wedding_log', ['id', 'wedding_id', 'date', 'kind', 'title', 'body'],
    w.log.map((l) => ({ ...l, wedding_id: w.id })));

  await insertMany(c, 'docs', ['id', 'wedding_id', 'name', 'kind', 'url', 'date'],
    w.docs.map((d) => ({ ...d, wedding_id: w.id, date: d.date || null })));

  await insertMany(c, 'messages',
    ['id', 'wedding_id', 'date', 'channel', 'to_name', 'to_id', 'template', 'tpl_label', 'title', 'body'],
    w.messages.map((m) => ({ ...m, wedding_id: w.id, to_name: m.to, to_id: m.toId || null,
      tpl_label: m.tplLabel || null })));

  return { rev, merged };
}

/**
 * Guarda las bodas que cambiaron. Lo que no viene, no se toca: las bajas van
 * explícitas en `deleted`. Antes una pestaña vieja o un "restablecer" podían
 * borrar bodas reales por omisión.
 */
export async function saveState(ownerId, { weddings = [], deleted = [], force = false } = {}) {
  const out = await tx(async (c) => {
    const res = { saved: [], conflicts: [], merged: [], deleted: 0 };
    if (deleted.length) {
      res.deleted = (await c.query(
        'delete from weddings where owner_id = $1 and id = any($2)', [ownerId, deleted])).rowCount;
    }
    for (const w of weddings) {
      const r = await saveWedding(c, ownerId, w, { force });
      if (r.conflict) res.conflicts.push(w.id);
      else {
        res.saved.push({ id: w.id, rev: r.rev });
        if (r.merged) res.merged.push(w.id);
      }
    }
    return res;
  });
  // a quien guardó se le devuelve la versión de la base de lo que no pudo
  // guardar tal cual: conflictos y bodas con respuestas nuevas de invitados
  const ids = [...out.conflicts, ...out.merged];
  out.fresh = ids.length ? await loadWeddings(ownerId, { ids }) : [];
  return out;
}

/* ---------------- operaciones puntuales ---------------- */
export async function bumpRev(c, weddingId) {
  await c.query('update weddings set rev = rev + 1, updated_at = now() where id = $1', [weddingId]);
}

export async function ownerOf(weddingId) {
  const { rows } = await q('select owner_id from weddings where id = $1', [weddingId]);
  return rows[0]?.owner_id || null;
}
