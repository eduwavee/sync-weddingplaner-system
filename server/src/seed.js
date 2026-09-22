import crypto from 'node:crypto';
import fs from 'node:fs';
import { pool, q, migrate } from './db.js';
import { hash } from './auth.js';
import { saveState } from './wedding-repo.js';

/* Crea la cuenta de la planner y, si le pasás un JSON exportado del navegador,
   carga también sus bodas:
     npm run seed
     npm run seed -- estado.json                                      */

const id = () => crypto.randomBytes(5).toString('hex');

async function main() {
  await migrate();

  const email = (process.env.SEED_PLANNER_EMAIL || 'planner@alianza.test').toLowerCase();
  // si no ponés una contraseña en .env, se genera una y se imprime una sola vez
  const generated = !process.env.SEED_PLANNER_PASSWORD;
  const password = process.env.SEED_PLANNER_PASSWORD || crypto.randomBytes(9).toString('base64url');

  const { rows: existing } = await q('select id from users where email = $1', [email]);
  let plannerId = existing[0]?.id;

  if (plannerId) {
    console.log(`La planner ${email} ya existía, no toco su contraseña.`);
  } else {
    plannerId = id();
    await q(
      `insert into users (id, email, password_hash, name, role) values ($1,$2,$3,$4,'planner')`,
      [plannerId, email, await hash(password), 'Alianza Wedding Studio']);
    console.log(`Planner creada: ${email}`);
    if (generated) console.log(`Contraseña (guardala, no se vuelve a mostrar): ${password}`);
  }

  const file = process.argv[2];
  if (file) {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const n = await saveState(plannerId, state.weddings || []);
    console.log(`${n} bodas cargadas desde ${file}`);

    // una cuenta por pareja, para que entren a su portal
    for (const w of state.weddings || []) {
      const mail = w.partners?.find((p) => p.email)?.email;
      if (!mail || w.status === 'lead') continue;
      const pass = crypto.randomBytes(6).toString('base64url');
      await q(
        `insert into users (id, email, password_hash, name, role, wedding_id)
         values ($1,$2,$3,$4,'novios',$5) on conflict (email) do nothing`,
        [id(), mail.toLowerCase(), await hash(pass), w.couple, w.id]);
      console.log(`  novios ${w.couple}: ${mail} / ${pass}`);
    }
  } else {
    console.log('Sin archivo de datos. Entrá a la app, logueate y se sincroniza sola.');
  }
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => pool.end());
