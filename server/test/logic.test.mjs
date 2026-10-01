/* Pruebas de la lógica que no toca la base: sesiones, contraseñas y el SQL
   que arma saveWedding (con un cliente simulado). Corren con `npm test`,
   sin Postgres. Lo que sí necesita base se prueba a mano por ahora. */
process.env.JWT_SECRET = 'test-secret-para-la-prueba';
process.env.DATABASE_URL = 'postgres://x:x@localhost:5432/x';

const { issueToken, verifyToken, hash, check } = await import('../src/auth.js');
const repo = await import('../src/wedding-repo.js');

const out = [];
const t = (name, cond) => out.push(`${cond ? 'ok  ' : 'FALLA'} ${name}`);

// --- tokens ---
const tok = issueToken({ id: 'u1', role: 'planner', wedding_id: null });
const p = verifyToken(tok);
t('firma y verifica', p && p.sub === 'u1' && p.role === 'planner');
t('rechaza token manipulado', verifyToken(tok.slice(0, -3) + 'aaa') === null);
t('rechaza basura', verifyToken('no.es.un.token') === null);
t('rechaza vacío', verifyToken('') === null);
const viejo = issueToken({ id: 'u2', role: 'novios', wedding_id: 'w1' }, -1);
t('rechaza vencido', verifyToken(viejo) === null);
const nov = verifyToken(issueToken({ id: 'u2', role: 'novios', wedding_id: 'w1' }));
t('guarda la boda de los novios', nov.wid === 'w1');

// --- contraseñas ---
const h = await hash('una-clave-larga');
t('hash no es la clave', h !== 'una-clave-larga' && h.startsWith('$2'));
t('verifica bien', await check('una-clave-larga', h));
t('rechaza mal', !(await check('otra-clave', h)));

// --- SQL que arma saveWedding (con un cliente de mentira) ---
const sent = [];
const fake = { query: async (sql, params) => { sent.push({ sql, params }); return { rows: [] }; } };
const w = {
  id: 'w1', slug: 'ana-y-juan', status: 'activa', couple: 'Ana & Juan', date: '2026-10-17',
  venue: 'Finca', city: 'Tafí', target: 2, budget: 100, style: 'x', tables: 1, tableMeta: [],
  profile: { faq: {} },
  contract: { plan: 'Full planning', fee: 10, signed: null, installments: [{ id: 'i1', label: 'Seña', amount: 10, due: '2026-01-01', paid: true, paidOn: '2026-01-02' }] },
  partners: [{ id: 'p1', role: 'Novia', name: 'Ana' }, { id: 'p2', role: 'Novio', name: 'Juan' }],
  guests: [
    { id: 'g2', name: 'Acompañante', group: 'Amigos', rsvp: 'si', plusOf: 'g1' },
    { id: 'g1', name: 'Pedro', group: 'Amigos', rsvp: 'si', table: 1, plus: true },
  ],
  vendors: [{ id: 'v1', name: 'DJ', cat: 'DJ', status: 'confirmado', amount: 5 }],
  expenses: [{ id: 'e1', concept: 'DJ', cat: 'DJ', vendorId: 'v1', total: 5, paid: 2, due: '2026-09-01', plan: [{ id: 'c1', label: 'Seña', amount: 2, due: '2026-05-01', paid: true }] }],
  tasks: [{ id: 't1', title: 'Tarea', due: '2026-02-01', owner: 'planner', cat: 'x', done: false }],
  timeline: [{ id: 'x1', time: '19:30', title: 'Ceremonia', place: 'Jardín', who: 'Todos', key: true }],
  meetings: [], log: [], docs: [], messages: [],
};
await repo.saveWedding(fake, 'owner1', w);

const inserts = sent.filter((s) => s.sql.startsWith('insert into'));
const guestIns = inserts.find((s) => s.sql.includes('insert into guests'));
const gi = guestIns.params;
t('el acompañante se inserta después del titular', gi.indexOf('g1') < gi.indexOf('g2'));
t('plus_of viaja', gi.includes('g1') && gi.includes('g2'));
t('borra hijos antes de insertar', sent.findIndex((s) => s.sql.startsWith('delete')) < sent.findIndex((s) => s.sql.startsWith('insert into partners')));
t('el upsert filtra por dueño', sent.find((s) => s.sql.includes('insert into weddings')).sql.includes('where weddings.owner_id = $2'));
t('antes de guardar mira de quién es la boda', sent[0].sql.includes('select owner_id, rev from weddings'));
t('las cuotas del gasto van a expense_plan', inserts.some((s) => s.sql.includes('expense_plan') && s.params.includes('c1')));
t('paid nunca supera a total', (() => { const e = inserts.find((s) => s.sql.includes('insert into expenses')); return e.params.includes(2); })());
t('placeholders bien numerados', inserts.every((s) => {
  const max = Math.max(...[...s.sql.matchAll(/\$(\d+)/g)].map((m) => +m[1]));
  return max === s.params.length;
}));
t('timeline mapea key -> is_key', inserts.find((s) => s.sql.includes('insert into timeline')).params.includes(true));

// --- una boda ajena no se toca ---
const ajena = { query: async (sql) => (sql.includes('select owner_id') ? { rows: [{ owner_id: 'otra', rev: 3 }] } : { rows: [] }) };
let err = null;
try { await repo.saveWedding(ajena, 'owner1', w); } catch (e) { err = e; }
t('boda de otra planner: 403 y no borra nada', err?.status === 403);

// --- revisión vieja: conflicto, sin escribir ---
const writes = [];
const vieja = { query: async (sql) => { if (!sql.startsWith('select')) writes.push(sql);
  return sql.includes('select owner_id') ? { rows: [{ owner_id: 'owner1', rev: 5 }] } : { rows: [] }; } };
const r1 = await repo.saveWedding(vieja, 'owner1', { ...w, rev: 4 });
t('rev vieja devuelve conflicto', r1.conflict === true && writes.length === 0);
const r2 = await repo.saveWedding(vieja, 'owner1', { ...w, rev: 4 }, { force: true });
t('con force guarda y sube la rev', r2.rev === 6 && writes.length > 0);

// --- limpieza: lo que antes trababa la sincronización para siempre ---
const sucia = repo.sanitize({
  ...w,
  guests: [
    { id: 'a', name: 'Ana', rsvp: 'si', table: 2 },
    { id: 'b', name: 'Acomp. de alguien borrado', rsvp: 'si', plusOf: 'zzz' },
    { id: 'a', name: 'Ana duplicada' },
    { id: 'c', name: 'Carlos', rsvp: 'quizas', table: 4 },
    { id: 'd', name: 'Dora', token: 'tok1' }, { id: 'e', name: 'Eva', token: 'tok1' },
  ],
  expenses: [{ id: 'x', concept: 'DJ', vendorId: 'no-existe', total: 10, paid: 50, plan: [] }],
  docs: [{ id: 'k', name: 'malo', url: 'javascript:alert(1)' }, { id: 'l', name: 'bueno', url: 'https://drive.google.com/x' }],
});
t('descarta acompañantes huérfanos', !sucia.guests.some((g) => g.id === 'b'));
t('descarta ids duplicados', sucia.guests.filter((g) => g.id === 'a').length === 1);
t('rsvp inválido pasa a pendiente y pierde la mesa', (() => { const c = sucia.guests.find((g) => g.id === 'c'); return c.rsvp === 'pendiente' && c.table === null; })());
t('tokens repetidos se regeneran', new Set(sucia.guests.map((g) => g.token)).size === sucia.guests.length);
t('gasto con proveedor inexistente queda sin proveedor', sucia.expenses[0].vendorId === null);
t('paid se recorta al total', sucia.expenses[0].paid === 10);
t('links que no son http se descartan', sucia.docs.length === 1 && sucia.docs[0].id === 'l');

// --- respuestas de invitados contra la copia de la planner ---
const ayer = '2026-09-30T10:00:00.000Z', hoy = new Date('2026-10-01T10:00:00Z');
const cliente = [
  { id: 'g1', name: 'Pedro', rsvp: 'pendiente', diet: '', table: 3, rsvpAt: null },
  { id: 'g2', name: 'Lola', rsvp: 'si', diet: '', rsvpAt: ayer },
  { id: 'g9', name: 'Acomp. viejo', plusOf: 'g1', rsvp: 'si' },
];
const base = [
  { id: 'g1', name: 'Pedro', rsvp: 'no', diet: 'Vegano', rsvp_at: hoy, plus_of: null },
  { id: 'g2', name: 'Lola', rsvp: 'si', diet: '', rsvp_at: new Date(ayer), plus_of: null },
  { id: 'g7', name: 'Ya no está', rsvp: 'si', rsvp_at: hoy, plus_of: null },
];
const m = repo.mergeGuestAnswers(cliente.map((g) => ({ ...g })), base);
const p1 = m.guests.find((g) => g.id === 'g1');
t('gana la respuesta del invitado que la planner no vio', m.merged && p1.rsvp === 'no' && p1.diet === 'Vegano');
t('si no viene, pierde la mesa', p1.table === null);
t('el acompañante del cliente se reemplaza por el de la base', !m.guests.some((g) => g.id === 'g9'));
t('lo que la planner ya vio no se toca', m.guests.find((g) => g.id === 'g2').rsvpAt === ayer);
t('si la planner lo borró, sigue borrado', !m.guests.some((g) => g.id === 'g7'));
t('sin respuestas nuevas no hay merge', repo.mergeGuestAnswers([{ id: 'g2', rsvpAt: ayer }], base.slice(1, 2)).merged === false);

// --- lo que ven los novios ---
const nov2 = repo.forCouple({ ...w, log: [{ id: 'l' }], messages: [{ id: 'm' }], profile: { notes: 'interna', faq: {} }, lead: { a: 1 } });
t('los novios no ven bitácora, mensajes ni notas internas', !nov2.log.length && !nov2.messages.length && !('notes' in nov2.profile) && !nov2.lead);

console.log(out.join('\n'));
console.log(out.some((l) => l.startsWith('FALLA')) ? '\nHAY FALLAS' : '\nTodo verde');
process.exit(out.some((l) => l.startsWith('FALLA')) ? 1 : 0);
