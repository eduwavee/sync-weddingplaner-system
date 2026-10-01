/* Pruebas punta a punta contra un Postgres real, por HTTP.
   Necesitan una base descartable (se borra entera al empezar):

     TEST_DATABASE_URL=postgres://localhost:5432/alianza_test npm run test:db

   Sin TEST_DATABASE_URL se saltean. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const URL_DB = process.env.TEST_DATABASE_URL;
if (!URL_DB) {
  test('integración con Postgres', { skip: 'falta TEST_DATABASE_URL' }, () => {});
} else {
  process.env.DATABASE_URL = URL_DB;
  process.env.JWT_SECRET = 'secreto-de-prueba-integracion';

  const { pool, q, migrate } = await import('../src/db.js');
  const { hash } = await import('../src/auth.js');
  const { default: app } = await import('../src/index.js');

  let server, base;
  const call = async (path, { token, method = 'GET', body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* html o js */ }
    return { status: res.status, json, text };
  };
  const loginAs = async (email) =>
    (await call('/api/auth/login', { method: 'POST', body: { email, password: 'clave-de-prueba-1' } })).json.token;

  const boda = (over = {}) => ({
    id: 'w1', slug: 'ana-y-juan', status: 'activa', couple: 'Ana & Juan', date: '2027-03-20',
    venue: 'Finca', city: 'Tafí', target: 4, budget: 1000, style: 'x', tables: 2, tableMeta: [],
    profile: { notes: 'secreto de la planner', palette: 'verde', faq: { dress: 'Elegante' } },
    contract: { plan: 'Full planning', fee: 100, signed: null, installments: [] },
    partners: [{ id: 'p1', role: 'Novia', name: 'Ana Paz' }, { id: 'p2', role: 'Novio', name: 'Juan Sal' }],
    guests: [
      { id: 'g1', name: 'Pedro Gómez', side: 'Novia', group: 'Amigos', rsvp: 'pendiente', plus: true, token: 'tokpedro0001' },
      { id: 'g2', name: 'Lola Díaz', side: 'Novio', group: 'Amigos', rsvp: 'si', plus: true, table: 1, token: 'toklola00001' },
      { id: 'g3', name: 'Acompañante de Lola', side: 'Novio', group: 'Amigos', rsvp: 'si', plusOf: 'g2', token: 'tokacomp0001' },
      { id: 'g4', name: 'Rita Sin Plus', side: 'Novia', group: 'Familia', rsvp: 'pendiente', plus: false, token: 'tokrita00001' },
    ],
    vendors: [{ id: 'v1', name: 'DJ Fran', cat: 'DJ / Música', status: 'presupuestado', amount: 50 }],
    expenses: [], tasks: [
      { id: 't1', title: 'Elegir menú', due: '2027-01-10', owner: 'novios', cat: 'Catering', done: false },
      { id: 't2', title: 'Contratar foto', due: '2026-12-10', owner: 'planner', cat: 'Proveedores', done: false },
    ],
    timeline: [{ id: 'x1', time: '19:30', title: 'Ceremonia', place: 'Jardín', who: 'Todos', key: true }],
    meetings: [], log: [{ id: 'l1', date: '2026-09-01', kind: 'Nota', title: 'Interna', body: 'no para novios' }],
    docs: [], messages: [],
    ...over,
  });

  let A, B, N;
  const stateOf = async (token) => (await call('/api/state', { token })).json.weddings;

  before(async () => {
    await pool.query('drop schema public cascade; create schema public;');
    await migrate();
    await migrate();   // la segunda no hace nada
    const pw = await hash('clave-de-prueba-1');
    await q(`insert into users (id, email, password_hash, name, role) values
      ('ua','a@test','${pw}','Planner A','planner'), ('ub','b@test','${pw}','Planner B','planner')`);
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    A = await loginAs('a@test');
    B = await loginAs('b@test');
  });
  after(async () => { server?.close(); await pool.end(); });

  test('las migraciones quedan registradas una sola vez', async () => {
    const { rows } = await q('select version from schema_migrations order by version');
    assert.deepEqual(rows.map((r) => r.version), ['001_init.sql', '002_sync_rsvp.sql']);
  });

  test('guardar y volver a leer devuelve lo mismo, con rev', async () => {
    const r = await call('/api/state', { token: A, method: 'PUT', body: { weddings: [boda()], deleted: [] } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.saved, [{ id: 'w1', rev: 1 }]);
    const [w] = await stateOf(A);
    assert.equal(w.rev, 1);
    assert.equal(w.guests.length, 4);
    assert.equal(w.guests.find((g) => g.id === 'g3').plusOf, 'g2');
    assert.equal(w.profile.notes, 'secreto de la planner');
  });

  test('revisión vieja: conflicto con la versión de la base, sin pisar', async () => {
    const r = await call('/api/state', { token: A, method: 'PUT',
      body: { weddings: [boda({ rev: 0, couple: 'Pisado' })], deleted: [] } });
    assert.deepEqual(r.json.conflicts, ['w1']);
    assert.equal(r.json.fresh[0].couple, 'Ana & Juan');
    assert.equal((await stateOf(A))[0].couple, 'Ana & Juan');
  });

  test('otra planner no puede pisar ni vaciar una boda ajena', async () => {
    const r = await call('/api/state', { token: B, method: 'PUT',
      body: { weddings: [boda({ guests: [], couple: 'Hackeada' })], deleted: [] } });
    assert.equal(r.status, 403);
    const [w] = await stateOf(A);
    assert.equal(w.guests.length, 4);
    assert.equal(w.couple, 'Ana & Juan');
    const d = await call('/api/state', { token: B, method: 'PUT', body: { weddings: [], deleted: ['w1'] } });
    assert.equal(d.json.deleted, 0);
    assert.equal((await stateOf(A)).length, 1);
  });

  test('borrar un invitado y dejar a su acompañante huérfano ya no traba el guardado', async () => {
    const [w] = await stateOf(A);
    w.guests = w.guests.filter((g) => g.id !== 'g2');        // el bug viejo: g3 queda colgado
    const r = await call('/api/state', { token: A, method: 'PUT', body: { weddings: [w], deleted: [] } });
    assert.equal(r.status, 200);
    const [after] = await stateOf(A);
    assert.ok(!after.guests.some((g) => g.id === 'g3'));
    assert.equal(after.rev, 2);
  });

  test('una boda que no viene en el PUT no se borra; sólo las de deleted', async () => {
    const extra = boda({ id: 'w2', slug: 'otra', couple: 'Sol & Leo', partners: [], guests: [], vendors: [],
      tasks: [], timeline: [], log: [] });
    await call('/api/state', { token: A, method: 'PUT', body: { weddings: [extra], deleted: [] } });
    await call('/api/state', { token: A, method: 'PUT', body: { weddings: [], deleted: [] } });
    assert.equal((await stateOf(A)).length, 2);
    await call('/api/state', { token: A, method: 'PUT', body: { weddings: [], deleted: ['w2'] } });
    assert.deepEqual((await stateOf(A)).map((w) => w.id), ['w1']);
  });

  test('RSVP público: el link personal no expone la lista ni datos internos', async () => {
    const r = await call('/api/public/rsvp/tokpedro0001');
    assert.equal(r.status, 200);
    assert.equal(r.json.guest.name, 'Pedro Gómez');
    assert.equal(r.json.wedding.couple, 'Ana & Juan');
    assert.ok(!('guests' in r.json.wedding));
    assert.ok(!r.text.includes('secreto de la planner'));
    assert.ok(!r.text.includes('DJ Fran'));
  });

  test('RSVP público: el link general sólo busca, con 3 letras o más y sin tildes', async () => {
    assert.deepEqual((await call('/api/public/rsvp/w1/search?q=pe')).json.guests, []);
    const r = await call('/api/public/rsvp/w1/search?q=gomez');
    assert.deepEqual(r.json.guests.map((g) => g.name), ['Pedro Gómez']);
    assert.equal((await call('/api/public/rsvp/nada-que-ver')).status, 404);
  });

  test('sin acompañante habilitado no se puede sumar uno', async () => {
    const r = await call('/api/public/rsvp/w1/confirm', { method: 'POST',
      body: { guestId: 'g4', rsvp: 'si', companion: 'Colado' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.guest.companion, '');
    const { rows } = await q("select 1 from guests where name = 'Colado'");
    assert.equal(rows.length, 0);
  });

  test('la respuesta del invitado sobrevive a un guardado de la planner que no la vio', async () => {
    const [vieja] = await stateOf(A);                       // la planner bajó esto antes
    const c = await call('/api/public/rsvp/tokpedro0001/confirm', { method: 'POST',
      body: { rsvp: 'si', diet: 'Vegano', companion: 'Marta Ruiz' } });
    assert.equal(c.json.guest.companion, 'Marta Ruiz');

    vieja.venue = 'Finca Los Álamos';                       // la planner edita otra cosa y guarda
    const r = await call('/api/state', { token: A, method: 'PUT', body: { weddings: [vieja], deleted: [] } });
    assert.deepEqual(r.json.merged, ['w1']);
    const [w] = await stateOf(A);
    const pedro = w.guests.find((g) => g.id === 'g1');
    assert.equal(w.venue, 'Finca Los Álamos');
    assert.equal(pedro.rsvp, 'si');
    assert.equal(pedro.diet, 'Vegano');
    assert.ok(w.guests.some((g) => g.plusOf === 'g1' && g.name === 'Marta Ruiz'));

    // y si después la planner lo cambia a mano sobre la copia que ya la vio, gana ella
    pedro.rsvp = 'no';
    await call('/api/state', { token: A, method: 'PUT', body: { weddings: [w], deleted: [] } });
    assert.equal((await stateOf(A))[0].guests.find((g) => g.id === 'g1').rsvp, 'no');
  });

  test('novios: ven su boda sin la trastienda y no pueden escribir el estado', async () => {
    const pw = await hash('clave-de-prueba-1');
    await q(`insert into users (id, email, password_hash, name, role, wedding_id)
             values ('un','n@test','${pw}','Ana & Juan','novios','w1')`);
    N = await loginAs('n@test');
    const [w] = await stateOf(N);
    assert.equal(w.log.length, 0);
    assert.ok(!('notes' in w.profile));
    assert.equal((await call('/api/state', { token: N, method: 'PUT', body: { weddings: [w], deleted: [] } })).status, 403);
    assert.equal((await call('/api/weddings/otra', { token: N })).status, 403);
  });

  test('novios: aprobar un presupuesto se guarda, crea el gasto y sube la rev', async () => {
    const [antes] = await stateOf(A);
    const r = await call('/api/weddings/w1/vendors/v1/decision', { token: N, method: 'POST', body: { decision: 'approve' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.vendors[0].status, 'aprobado');
    assert.equal(r.json.expenses[0].total, 50);
    assert.equal(r.json.expenses[0].due, '2027-03-10');
    assert.equal(r.json.log.length, 0);
    const again = await call('/api/weddings/w1/vendors/v1/decision', { token: N, method: 'POST', body: { decision: 'approve' } });
    assert.equal(again.status, 409);
    // la copia de la planner quedó vieja: su próximo guardado avisa en vez de pisar la aprobación
    const p = await call('/api/state', { token: A, method: 'PUT', body: { weddings: [antes], deleted: [] } });
    assert.deepEqual(p.json.conflicts, ['w1']);
  });

  test('novios: marcan sus tareas, no las de la planner', async () => {
    const ok = await call('/api/weddings/w1/tasks/t1', { token: N, method: 'PATCH', body: { done: true } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.tasks.find((t) => t.id === 't1').done, true);
    const no = await call('/api/weddings/w1/tasks/t2', { token: N, method: 'PATCH', body: { done: true } });
    assert.equal(no.status, 403);
  });

  test('el servidor sirve el front y nada más', async () => {
    assert.equal((await call('/')).status, 200);
    assert.match((await call('/config.js')).text, /ALIANZA_API/);
    assert.equal((await call('/js/app.js')).status, 200);
    for (const p of ['/server/src/auth.js', '/server/package.json', '/server/.env', '/CLAUDE.md']) {
      assert.equal((await call(p)).status, 404, p);
    }
  });

  test('payload inválido: 400 con mensaje, no 500', async () => {
    const r = await call('/api/state', { token: A, method: 'PUT', body: { weddings: [{ id: 'x' }], deleted: [] } });
    assert.equal(r.status, 400);
    assert.ok(r.json.error);
  });
}
