# Alianza Wedding Studio

Sistema de gestión para wedding planners, hecho por **Sync Solutions**.

## Funcionalidades
- **Agenda del estudio**: todas las bodas activas con cuenta regresiva, progreso, alertas y lo que vence en los próximos 30 días.
- **Ficha de la pareja**: datos de contacto de cada novio/a, cómo se conocieron, paleta, testigos, contrato del estudio con sus cuotas, agenda de reuniones y una bitácora donde queda registrada cada llamada y cada pedido.
- **Consultas**: las parejas que todavía no son clientas. Se convierten en boda con un clic y arrancan con el checklist base cargado.
- **Honorarios del estudio**: lo que cobra la planner, con cuotas, vencimientos y facturación de la temporada. Aparte del presupuesto de la boda.
- **Invitados + RSVP**: confirmaciones, menú especial (vegetariano, vegano, celíaco), búsqueda y filtros.
- **Página pública de confirmación**: el invitado abre el link, busca su nombre, responde y suma acompañante. Entra directo a la lista de la planner.
- **Mesas**: asignación de invitados confirmados con control de capacidad.
- **Presupuesto y pagos**: comprometido vs. pagado por categoría, registro de pagos y vencimientos.
- **Proveedores**: tablero por etapas (contactado → confirmado).
- **Checklist**: tareas de la planner y de los novios, con vencidas destacadas.
- **Día D**: cronograma del evento, contactos y resumen para catering.
- **Portal de novios**: vista simplificada donde aprueban presupuestos y marcan sus tareas.
- **Centro de mensajes**: plantillas armadas con los datos de cada boda (recordar RSVP, aviso de cuota, hoja de ruta a proveedores) que se abren en WhatsApp o en el correo con el texto listo.
- **Asistente para invitados**: responde dudas en la página de confirmación —horario, cómo llegar, vestimenta, regalos, chicos, alojamiento— con lo que la planner cargó en la ficha.
- **Plan de pagos por gasto**: seña, segundo pago y saldo para cada proveedor, con vencimientos.
- **Documentos**: links al contrato firmado, el plano del salón o el moodboard.
- **Mesas**: nombre propio y capacidad por mesa, con plano imprimible.
- **El negocio**: honorarios contratados, cobrado, ticket promedio e ingresos por mes.
- **Exportables**: lista de invitados y presupuesto a CSV.
- **Archivo**: las bodas que ya pasaron se cierran y salen del día a día sin perder la ficha.

## Uso
Sin dependencias. Abrí `index.html` o serví la carpeta:

```bash
npx serve .
```

Los datos son ficticios y se guardan en el `localStorage` del navegador.

Para ver la página pública de confirmación: entrá a una boda → **Invitados** → **Ver como invitado** (o `#rsvp/lucia-y-tomas`).

## Backend (opcional)
El front anda solo. En `server/` hay una API en Node + Express + PostgreSQL con sesiones, roles (planner y novios) y endpoints públicos para el RSVP, por si el sistema deja de ser demo. Instrucciones en [`server/README.md`](server/README.md).

## Stack
Front: HTML, CSS y JavaScript vanilla, sin build ni dependencias.
Back (opcional): Node + Express + PostgreSQL.

---
Sync Solutions · [@sync.tuc](https://instagram.com/sync.tuc) · [github.com/eduwavee](https://github.com/eduwavee)
