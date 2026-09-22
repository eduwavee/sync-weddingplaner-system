# Alianza Wedding Studio

Demo de portfolio de **Sync Solutions** (Edu): sistema de gestión para wedding planners.
El front es estático (HTML + CSS + JS vanilla, sin build ni dependencias) y anda solo contra `localStorage`.
En `server/` hay un backend opcional (Node + Express + PostgreSQL) que el front usa **sólo** si se lo configura. La demo nunca depende de él.

## Idioma y estilo
- UI y copy en español rioplatense (voseo: "Mové", "Completá"). Moneda ARS con `Intl.NumberFormat('es-AR')`.
- Tema **claro únicamente** (no agregar modo oscuro salvo que se pida). Colores en tokens CSS en `:root` (`css/styles.css`).
- Tipografías: Cormorant Garamond (nombres de novios / títulos), Figtree (UI), DM Mono (números).

## Estructura
- `index.html` — shell; monta todo en `#app`. Carga `store.js` y después `app.js`.
- `css/styles.css` — tokens + componentes (panel, pill, btn, kanban, task, mesa, timeline, modal, bot, cuotas) + `@media print`.
- `js/store.js` — capa de datos. Sin configurar, no hace nada. Con `localStorage['alianza-api']` apuntando al backend, pide sesión, trae el estado de la API y sincroniza con debounce.
- `server/` — API opcional. Ver `server/README.md`.
- `js/app.js` — IIFE con todo:
  - utilidades de fecha/dinero (`fmtISO`, `parse`, `daysUntil`, `money`, `moneyK`)
  - `seed()` / `buildWedding()` / `buildLead()` → datos de ejemplo. Las fechas son **relativas a hoy** para que el demo nunca quede viejo.
  - estado `S` (persistido en `localStorage`, clave `alianza-demo-v1`, versión `v:2`) y `ui` (vista, boda, tab, filtros, RSVP)
  - `migrate(S)` completa los campos nuevos sobre datos guardados de una versión anterior en vez de borrarlos. **Si agregás campos al modelo, subí `v` y extendé `migrate`.**
  - `render()` re-dibuja todo con template strings; cada tab es una función (`resumen`, `pareja`, `invitados`, `mesas`, `presupuesto`, `proveedores`, `checklist`, `dia`, `mensajes`, `portal`, `studio`, `leadsView`, `negocio`, `rsvpPage`)
  - `TPL` → plantillas de mensajes; `waLink`/`mailLink` arman deep links a WhatsApp y mail. **No se manda nada solo**: se abre la app del usuario con el texto escrito.
  - `BOT` → asistente de invitados. Sin modelo de lenguaje: matchea palabras contra `profile.faq` y los datos de la boda. Si no sabe, lo dice.
  - ruteo por hash: `#portal` (portal de novios) y `#rsvp/<slug>` (página pública del invitado, se dibuja sin sidebar)
  - acciones por delegación de eventos: `data-a="..."` (click) y `data-c="..."` (change)
  - `form(title, fields, onOk)` → modal genérico para altas (tipos: text, number, date, time, email, select, textarea)

## Modelo de datos
Todo vive en `S.weddings[]`. El `status` decide dónde aparece: `lead` en Consultas, `activa` en Bodas en curso, `finalizada` en Archivo.
```
Wedding { id, slug, status:'lead'|'activa'|'finalizada', couple, date, venue, city,
  target, budget, style, tables,
  partners[] { id, role:'Novia'|'Novio', name, phone, email, ig }        // la ficha de la pareja
  profile    { how, palette, song, witnesses, address, notes }
  contract   { plan, fee, signed|null,
               installments[] { id, label, amount, due, paid, paidOn } } // honorarios del estudio
  log[]      { id, date, kind:'Reunión'|'Llamada'|'WhatsApp'|'Mail'|'Nota', title, body }
  meetings[] { id, date, time, title, place, kind, done }
  docs[]     { id, name, kind, url, date }                               // links, no archivos
  messages[] { id, date, channel:'whatsapp'|'mail', to, toId, template, tplLabel, title, body }
  tableMeta[]{ name, seats }                                             // por mesa, indexado desde 0
  lead       { source, first, quoted }                                   // solo si status==='lead'
  guests[]   { id, name, side, group, rsvp:'si'|'no'|'pendiente', diet, table|null,
               kind:'adulto'|'niño', plus:boolean, plusOf:guestId|null, phone }
  vendors[]  { id, name, cat, contact, phone, status, amount }
             status: contactado → presupuestado → aprobado → senado → confirmado
  expenses[] { id, concept, cat, vendorId|null, total, paid, due,
               plan[] { id, label, amount, due, paid } }                 // seña / 2º pago / saldo
  tasks[]    { id, title, due, owner:'planner'|'novios', cat, done }
  timeline[] { id, time:'HH:MM', title, place, who, key:boolean } }
```
Reglas de negocio:
- Cuando un proveedor llega a `aprobado` o más, se crea su gasto (`syncExpense`). Los novios aprueban presupuestos desde el portal.
- `expenses[]` es la plata **de los novios**; `contract.installments[]` es lo que cobra **la planner**. No se mezclan en ningún total (`stats()` vs. `fees()`).
- `activateLead(w)` convierte una consulta en boda: le carga checklist base, cronograma del día y proveedores a contactar.
- En el RSVP público el acompañante se crea como un invitado más con `plusOf`, así cuenta solo para catering y mesas.
- `e.total` y `e.paid` siguen siendo la verdad de un gasto; `e.plan[]` es el calendario. Pagar una cuota suma a `e.paid` y corre `e.due` a la siguiente.

## Cómo correrlo
Abrir `index.html` en el navegador, o `npx serve .`

## Mensajería
No hay integración con APIs de mensajería y **no hace falta para que funcione**: el sistema arma el texto y abre WhatsApp (`wa.me`) o el correo (`mailto:`) del usuario. Los móviles argentinos se normalizan a `549…` en `waDigits`.

El camino a la API real, cuando haga falta:
1. WhatsApp Cloud API: cuenta de Meta Business, verificación, número dedicado (no se puede compartir con la app de WhatsApp Business) y plantillas aprobadas para iniciar conversación fuera de la ventana de 24 h. Un BSP (360dialog, Twilio) acorta el arranque.
2. Instagram Messaging: cuenta profesional vinculada a una página de Facebook y App Review para leer DMs. Encaja con la vista de Consultas.
3. Mail: Resend o Postmark para enviar; recibir y enlazar respuestas a cada boda es otro trabajo.
Todo eso necesita el backend andando: sin servidor no hay webhook que reciba nada.

## Roadmap sugerido
1. Tests de integración del backend con Postgres. Hoy `npm test` cubre sesiones, contraseñas y armado de SQL, pero nada contra una base real.
2. Deploy en Railway/Render + base administrada.
3. Endpoints granulares por entidad, para que dos personas editen sin pisarse.
4. Subir archivos de verdad a la ficha; hoy `docs[]` guarda links.
5. Recordatorios automáticos: es lo que la mensajería habilita y lo que más trabajo le ahorra a la planner.
6. Servidor MCP sobre la misma API, para operar la agenda desde un agente.
7. Frontend a React si crece la complejidad: `js/app.js` ya pasó las 1300 líneas.
