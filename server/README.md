# API de Alianza Wedding Studio

Backend opcional. **La demo del front anda sin esto**: abrís `index.html` y trabaja contra `localStorage`. El servidor existe para cuando el sistema deja de ser demo y pasa a tener varias planners, novios entrando a su portal y datos que no pueden vivir en un solo navegador.

## Levantarlo

```bash
cd server
npm install
cp .env.example .env        # completá DATABASE_URL y JWT_SECRET
npm run seed                # crea la cuenta de la planner
npm start
```

`npm start` corre las migraciones pendientes de `migrations/` (cada una una sola vez, en orden y en su transacción) y sirve además el front, así que con el servidor arriba tenés todo en `http://localhost:3000`. Sólo expone `index.html`, `css/`, `js/` y un `config.js` propio: nunca el código del servidor.

Para generar la clave de firma:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Conectar el front

Si la página la sirve este servidor, el front ya sabe dónde está la API: el servidor reemplaza `config.js` por uno que define `window.ALIANZA_API`. Si el front está en otro dominio, poné la URL en el `config.js` de la raíz, o una vez desde la consola del navegador:

```js
localStorage.setItem('alianza-api','http://localhost:3000')
```

Desde ahí pide usuario y contraseña, trae el estado del servidor y guarda contra él. **Seguir en modo demo** en el login vuelve a `localStorage`; para reintentar con el servidor: `localStorage.removeItem('alianza-mode')`.

El front manda sólo las bodas que cambiaron, cada una con la revisión que conoce. Si falla la red reintenta solo, y nada se descarta hasta que el servidor confirma.

Si la base está vacía y entrás como planner, el front sube lo que tenga en el navegador como punto de partida. Podés también cargar un export:

```bash
npm run seed -- estado.json
```

## Endpoints

| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| POST | `/api/auth/login` | público | Devuelve el token de sesión |
| GET | `/api/me` | con sesión | Datos del usuario |
| GET | `/api/state` | con sesión | La planner recibe todas sus bodas; los novios, sólo la suya |
| PUT | `/api/state` | planner | Guarda las bodas que cambiaron, cada una con su `rev`. Si alguna está vieja responde 409 con la versión de la base |
| GET | `/api/weddings/:id` | con sesión | Una boda |
| POST | `/api/weddings/:id/vendors/:vid/decision` | con sesión | Los novios aprueban un presupuesto o piden otra opción. Al aprobar se crea el gasto |
| PATCH | `/api/weddings/:id/tasks/:tid` | con sesión | Marca una tarea. Los novios, sólo las suyas |
| GET | `/api/public/rsvp/:key` | público | Lo que necesita el invitado para confirmar |
| GET | `/api/public/rsvp/:key/search?q=` | público | Busca un nombre en la lista (3 letras o más, sin importar tildes; hasta 5 resultados) |
| POST | `/api/public/rsvp/:key/confirm` | público | Confirma asistencia, menú y acompañante |

`:key` es el token personal del invitado (link `#rsvp/<slug>/<token>`, entra directo a su respuesta) o el id de la boda (link general, hay que buscarse). Los links viejos con sólo el slug siguen andando mientras no haya dos bodas que se llamen igual.

Las rutas públicas devuelven nombre de la pareja, fecha, lugar, cronograma y preguntas frecuentes. Nunca presupuestos, proveedores, honorarios, teléfonos ni la lista de invitados.

## Por qué cada boda se guarda entera

El front trabaja con un documento por boda y el servidor lo desarma en tablas normalizadas (`wedding-repo.js`). Guardar la boda completa dentro de una transacción es más simple y más seguro que diferenciar fila por fila, y para el volumen real —cientos de filas por boda— no se nota.

Lo que sí hace falta es no pisarse, y para eso está la revisión (`weddings.rev`): cada guardado de la planner y cada decisión de los novios la sube. Si el front manda una revisión que ya no es la última, el servidor no toca nada y devuelve la versión actual; la app avisa y deja elegir. Con `force` se guarda igual.

Las respuestas de los invitados son el caso especial: llegan por su cuenta, en cualquier momento. Cada una queda con su hora (`guests.rsvp_at`), y si la planner guarda una copia que no la vio, gana la del invitado. Si la planner borró a ese invitado, sigue borrado.

## Decisiones

- **Contraseñas** con bcrypt, factor 12. El login compara igual cuando el mail no existe, para no delatar qué direcciones están registradas.
- **Sesiones** con JWT HS256 firmado a mano (30 líneas en `auth.js`) en vez de sumar otra dependencia.
- **Roles**: `planner` ve y edita todas sus bodas; `novios` sólo la suya, y no puede escribir el estado completo.
- **Rate limit** en login (10 cada 15 min) y en las rutas públicas de RSVP (30 por minuto).
- **Las fechas** viajan como texto `YYYY-MM-DD`, sin huso horario. Una boda pasa el mismo día en Tucumán que en Madrid.
- **Los ids** los genera el front. El mismo objeto viaja del navegador a la base sin traducción.
- **El slug no es único**: dos bodas pueden llamarse igual. Los links públicos usan el token del invitado o el id de la boda.
- **Lo que entra se limpia**: ids repetidos, acompañantes huérfanos, links que no son http, pagos mayores al total o proveedores inexistentes se corrigen o se descartan antes de guardar, y un payload inválido devuelve 400 con mensaje, no 500.
- **Migraciones con lock** (`pg_advisory_lock`) para que dos instancias que arrancan juntas no apliquen la misma.

## Pruebas

```bash
npm test
```

Cubre sesiones, contraseñas, el SQL que arma `saveWedding` contra un cliente simulado, la limpieza del payload y el merge de respuestas de invitados.

```bash
createdb alianza_test
TEST_DATABASE_URL=postgres://localhost:5432/alianza_test npm run test:db
```

Punta a punta contra un Postgres real, por HTTP: migraciones, guardar y releer, conflicto por revisión vieja, una planner que intenta pisar la boda de otra, el portal de novios (qué ven, qué pueden aprobar y marcar) y el RSVP público (qué expone, la búsqueda, el acompañante, la respuesta que sobrevive al guardado de la planner). **La base se borra entera al empezar**: usá una descartable. Sin `TEST_DATABASE_URL` se saltean.

## Pendiente

- Deploy (Railway o Render) con base administrada.
- Endpoints granulares por entidad, para que dos personas editen la misma boda a la vez sin el aviso de conflicto.
- Webhooks de WhatsApp Cloud API e Instagram Messaging: acá es donde entran, sobre estas mismas tablas.
- Un servidor MCP sobre esta misma API, para que un agente pueda consultar y operar la agenda.
