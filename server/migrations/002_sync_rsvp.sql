-- Sincronización sin pisarse y RSVP con link propio por invitado.

-- Cada guardado de la planner (o decisión de los novios) sube la revisión.
-- El front manda la que conoce; si no coincide, alguien cambió la boda en el medio.
alter table weddings add column if not exists rev integer not null default 0;

-- El slug es sólo cosmético en los links: dos bodas pueden llamarse igual.
alter table weddings drop constraint if exists weddings_owner_id_slug_key;
create index if not exists weddings_slug_idx on weddings(slug);

-- Link personal del invitado: #rsvp/<slug>/<token>
alter table guests add column if not exists token text;
update guests set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) where token is null;
create unique index if not exists guests_token_uq on guests(token);

-- Cuándo respondió el invitado desde su link. Si la planner guarda una copia
-- que no vio esa respuesta, gana la del invitado.
alter table guests add column if not exists rsvp_at timestamptz;
