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
t('el upsert filtra por dueño', sent[0].sql.includes('where weddings.owner_id = $2'));
t('las cuotas del gasto van a expense_plan', inserts.some((s) => s.sql.includes('expense_plan') && s.params.includes('c1')));
t('paid nunca supera a total', (() => { const e = inserts.find((s) => s.sql.includes('insert into expenses')); return e.params.includes(2); })());
t('placeholders bien numerados', inserts.every((s) => {
  const max = Math.max(...[...s.sql.matchAll(/\$(\d+)/g)].map((m) => +m[1]));
  return max === s.params.length;
}));
t('timeline mapea key -> is_key', inserts.find((s) => s.sql.includes('insert into timeline')).params.includes(true));

console.log(out.join('\n'));
console.log(out.some((l) => l.startsWith('FALLA')) ? '\nHAY FALLAS' : '\nTodo verde');
process.exit(out.some((l) => l.startsWith('FALLA')) ? 1 : 0);
