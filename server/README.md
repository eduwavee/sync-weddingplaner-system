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

`npm start` corre las migraciones solo (`schema.sql` es idempotente) y sirve además el front estático, así que con el servidor arriba tenés todo en `http://localhost:3000`.

Para generar la clave de firma:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Conectar el front

Por defecto el front ignora la API. Para engancharlo, una vez en la consola del navegador:

```js
localStorage.setItem('alianza-api','http://localhost:3000')
```

Desde ahí pide usuario y contraseña, trae el estado del servidor y guarda contra él. Para volver a la demo: `localStorage.removeItem('alianza-api')`.

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
| PUT | `/api/state` | planner | Sincroniza el estado completo |
| GET | `/api/weddings/:id` | con sesión | Una boda |
| PATCH | `/api/weddings/:id/guests/:gid` | con sesión | Cambia un invitado |
| GET | `/api/public/rsvp/:slug` | público | Lo que necesita el invitado para confirmar |
| POST | `/api/public/rsvp/:slug/confirm` | público | Confirma asistencia |

Las rutas públicas devuelven sólo nombre, fecha, lugar, preguntas frecuentes y la lista de nombres. Nunca presupuestos, proveedores, honorarios ni teléfonos.

## Por qué el estado se guarda entero

El front trabaja con un documento por boda y el servidor lo desarma en tablas normalizadas (`wedding-repo.js`). Guardar la boda completa dentro de una transacción es más simple y más seguro que diferenciar fila por fila, y para el volumen real —cientos de filas por boda— no se nota. Si en algún momento hay edición concurrente de a dos, ahí sí conviene pasar a endpoints granulares por entidad; la estructura ya está.

## Decisiones

- **Contraseñas** con bcrypt, factor 12. El login compara igual cuando el mail no existe, para no delatar qué direcciones están registradas.
- **Sesiones** con JWT HS256 firmado a mano (30 líneas en `auth.js`) en vez de sumar otra dependencia.
- **Roles**: `planner` ve y edita todas sus bodas; `novios` sólo la suya, y no puede escribir el estado completo.
- **Rate limit** en login (10 cada 15 min) y en las rutas públicas de RSVP (30 por minuto).
- **Las fechas** viajan como texto `YYYY-MM-DD`, sin huso horario. Una boda pasa el mismo día en Tucumán que en Madrid.
- **Los ids** los genera el front. El mismo objeto viaja del navegador a la base sin traducción.

## Pruebas

```bash
npm test
```

Cubre sesiones, contraseñas y el SQL que arma `saveWedding` contra un cliente simulado. **Lo que toca Postgres de verdad todavía no está cubierto**: hace falta una base para probar migraciones, endpoints y permisos punta a punta.

## Pendiente

- Tests de integración con Postgres (docker-compose o base de prueba).
- Endpoints granulares por entidad, para editar de a dos sin pisarse.
- Webhooks de WhatsApp Cloud API e Instagram Messaging: acá es donde entran, sobre estas mismas tablas.
- Un servidor MCP sobre esta misma API, para que un agente pueda consultar y operar la agenda.
