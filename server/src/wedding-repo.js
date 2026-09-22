import { q, tx } from './db.js';

/* El front trabaja con un documento por boda. Acá se arma desde las tablas
   y se vuelve a desarmar al guardar. La base queda normalizada; el cliente,
   simple. */

const rowsBy = (rows, key) => {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r[key])) out.set(r[key], []);
    out.get(r[key]).push(r);
  }
  return out;
};

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

export async function loadWeddings(ownerId, { weddingId } = {}) {
  const { rows: ws } = weddingId
    ? await q('select * from weddings where owner_id = $1 and id = $2', [ownerId, weddingId])
    : await q('select * from weddings where owner_id = $1 order by date', [ownerId]);
  if (!ws.length) return [];
  const ids = ws.map((w) => w.id);

  const parts = {};
  for (const [name, sql] of CHILDREN) parts[name] = rowsBy((await q(sql, [ids])).rows, 'wedding_id');

  const planRows = (await q(
    `select p.* from expense_plan p join expenses e on e.id = p.expense_id
      where e.wedding_id = any($1) order by p.due`, [ids])).rows;
  const planBy = rowsBy(planRows, 'expense_id');

  return ws.map((w) => ({
    id: w.id, slug: w.slug, status: w.status, couple: w.couple, date: w.date,
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

/* Guardar: la boda es la unidad. Se reemplazan los hijos en bloque dentro de
   una transacción, que para este volumen (cientos de filas) es más simple y
   más seguro que diferenciar fila por fila. */
async function insertMany(c, table, cols, rows) {
  if (!rows.length) return;
  const values = [];
  const tuples = rows.map((r, i) =>
    `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`);
  for (const r of rows) for (const col of cols) values.push(r[col]);
  await c.query(`insert into ${table} (${cols.join(',')}) values ${tuples.join(',')}`, values);
}

export async function saveWedding(c, ownerId, w) {
  await c.query(
    `insert into weddings (id, owner_id, slug, status, couple, date, venue, city, target, budget,
        style, tables, table_meta, profile, lead, plan, fee, signed, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now())
     on conflict (id) do update set
       slug=excluded.slug, status=excluded.status, couple=excluded.couple, date=excluded.date,
       venue=excluded.venue, city=excluded.city, target=excluded.target, budget=excluded.budget,
       style=excluded.style, tables=excluded.tables, table_meta=excluded.table_meta,
       profile=excluded.profile, lead=excluded.lead, plan=excluded.plan, fee=excluded.fee,
       signed=excluded.signed, updated_at=now()
     where weddings.owner_id = $2`,
    [w.id, ownerId, w.slug, w.status, w.couple, w.date, w.venue, w.city, w.target || 0,
     w.budget || 0, w.style, w.tables || 0, JSON.stringify(w.tableMeta || []),
     JSON.stringify(w.profile || {}), w.lead ? JSON.stringify(w.lead) : null,
     w.contract?.plan || null, w.contract?.fee || 0, w.contract?.signed || null]);

  for (const t of ['partners', 'fee_installments', 'guests', 'vendors', 'expenses',
                   'tasks', 'timeline', 'meetings', 'wedding_log', 'docs', 'messages']) {
    await c.query(`delete from ${t} where wedding_id = $1`, [w.id]);
  }

  await insertMany(c, 'partners', ['id', 'wedding_id', 'role', 'name', 'phone', 'email', 'ig'],
    (w.partners || []).map((p) => ({ ...p, wedding_id: w.id, phone: p.phone || '', email: p.email || '', ig: p.ig || '' })));

  await insertMany(c, 'fee_installments', ['id', 'wedding_id', 'label', 'amount', 'due', 'paid', 'paid_on'],
    (w.contract?.installments || []).map((i) => ({ ...i, wedding_id: w.id, paid_on: i.paidOn || null })));

  // primero los invitados sin acompañante: plus_of apunta a otra fila de la misma tabla
  const guests = (w.guests || []).slice().sort((a, b) => (a.plusOf ? 1 : 0) - (b.plusOf ? 1 : 0));
  await insertMany(c, 'guests',
    ['id', 'wedding_id', 'name', 'side', 'grp', 'rsvp', 'diet', 'table_n', 'kind', 'plus', 'plus_of', 'phone'],
    guests.map((g) => ({ id: g.id, wedding_id: w.id, name: g.name, side: g.side, grp: g.group,
      rsvp: g.rsvp, diet: g.diet || '', table_n: g.table ?? null, kind: g.kind || 'adulto',
      plus: !!g.plus, plus_of: g.plusOf || null, phone: g.phone || '' })));

  await insertMany(c, 'vendors', ['id', 'wedding_id', 'name', 'cat', 'contact', 'phone', 'status', 'amount'],
    (w.vendors || []).map((v) => ({ ...v, wedding_id: w.id })));

  await insertMany(c, 'expenses', ['id', 'wedding_id', 'concept', 'cat', 'vendor_id', 'total', 'paid', 'due'],
    (w.expenses || []).map((e) => ({ id: e.id, wedding_id: w.id, concept: e.concept, cat: e.cat,
      vendor_id: e.vendorId || null, total: e.total || 0, paid: Math.min(e.paid || 0, e.total || 0), due: e.due })));

  await insertMany(c, 'expense_plan', ['id', 'expense_id', 'label', 'amount', 'due', 'paid'],
    (w.expenses || []).flatMap((e) => (e.plan || []).map((p) => ({ ...p, expense_id: e.id }))));

  await insertMany(c, 'tasks', ['id', 'wedding_id', 'title', 'due', 'owner', 'cat', 'done'],
    (w.tasks || []).map((t) => ({ ...t, wedding_id: w.id })));

  await insertMany(c, 'timeline', ['id', 'wedding_id', 'time', 'title', 'place', 'who', 'is_key'],
    (w.timeline || []).map((x) => ({ ...x, wedding_id: w.id, is_key: !!x.key })));

  await insertMany(c, 'meetings', ['id', 'wedding_id', 'date', 'time', 'title', 'place', 'kind', 'done'],
    (w.meetings || []).map((m) => ({ ...m, wedding_id: w.id })));

  await insertMany(c, 'wedding_log', ['id', 'wedding_id', 'date', 'kind', 'title', 'body'],
    (w.log || []).map((l) => ({ ...l, wedding_id: w.id })));

  await insertMany(c, 'docs', ['id', 'wedding_id', 'name', 'kind', 'url', 'date'],
    (w.docs || []).map((d) => ({ ...d, wedding_id: w.id })));

  await insertMany(c, 'messages',
    ['id', 'wedding_id', 'date', 'channel', 'to_name', 'to_id', 'template', 'tpl_label', 'title', 'body'],
    (w.messages || []).map((m) => ({ ...m, wedding_id: w.id, to_name: m.to, to_id: m.toId || null,
      tpl_label: m.tplLabel || null })));
}

/** Sincroniza el estado completo de una planner. Lo que no viene, se borra. */
export async function saveState(ownerId, weddings) {
  return tx(async (c) => {
    const keep = weddings.map((w) => w.id);
    await c.query(
      `delete from weddings where owner_id = $1 ${keep.length ? 'and id <> all($2)' : ''}`,
      keep.length ? [ownerId, keep] : [ownerId]);
    for (const w of weddings) await saveWedding(c, ownerId, w);
    return keep.length;
  });
}
