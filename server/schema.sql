-- Alianza Wedding Studio · esquema
-- Los ids son texto porque los genera el front (uid()), así el mismo objeto
-- viaja del navegador a la base sin traducción.

create table if not exists users (
  id            text primary key,
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  role          text not null check (role in ('planner','novios')),
  wedding_id    text,                       -- los novios ven una sola boda
  created_at    timestamptz not null default now()
);

create table if not exists weddings (
  id          text primary key,
  owner_id    text not null references users(id) on delete cascade,
  slug        text not null,
  status      text not null default 'activa' check (status in ('lead','activa','finalizada')),
  couple      text not null,
  date        date not null,
  venue       text,
  city        text,
  target      integer default 0,
  budget      bigint  default 0,
  style       text,
  tables      integer default 0,
  table_meta  jsonb   not null default '[]'::jsonb,
  profile     jsonb   not null default '{}'::jsonb,   -- how, palette, song, witnesses, address, notes, faq
  lead        jsonb,                                   -- source, first, quoted (solo si status='lead')
  plan        text,                                    -- tipo de contrato del estudio
  fee         bigint  default 0,
  signed      date,
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);
create index if not exists weddings_owner_idx on weddings(owner_id, status, date);

create table if not exists partners (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  role       text not null,
  name       text not null,
  phone      text default '',
  email      text default '',
  ig         text default ''
);

-- honorarios del estudio: plata de la planner, nunca se mezcla con expenses
create table if not exists fee_installments (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  label      text not null,
  amount     bigint not null default 0,
  due        date   not null,
  paid       boolean not null default false,
  paid_on    date
);
create index if not exists fee_due_idx on fee_installments(wedding_id, due);

create table if not exists guests (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  name       text not null,
  side       text,
  grp        text,
  rsvp       text not null default 'pendiente' check (rsvp in ('si','no','pendiente')),
  diet       text default '',
  table_n    integer,
  kind       text not null default 'adulto' check (kind in ('adulto','niño')),
  plus       boolean not null default false,
  plus_of    text references guests(id) on delete cascade,
  phone      text default ''
);
create index if not exists guests_wedding_idx on guests(wedding_id, rsvp);

create table if not exists vendors (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  name       text not null,
  cat        text,
  contact    text,
  phone      text,
  status     text not null default 'contactado'
             check (status in ('contactado','presupuestado','aprobado','senado','confirmado')),
  amount     bigint default 0
);

-- plata de los novios
create table if not exists expenses (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  concept    text not null,
  cat        text,
  vendor_id  text references vendors(id) on delete set null,
  total      bigint not null default 0,
  paid       bigint not null default 0,
  due        date,
  constraint paid_no_mayor_que_total check (paid <= total)
);

create table if not exists expense_plan (
  id         text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  label      text not null,
  amount     bigint not null default 0,
  due        date   not null,
  paid       boolean not null default false
);

create table if not exists tasks (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  title      text not null,
  due        date not null,
  owner      text not null check (owner in ('planner','novios')),
  cat        text,
  done       boolean not null default false
);
create index if not exists tasks_due_idx on tasks(wedding_id, done, due);

create table if not exists timeline (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  time       text not null,
  title      text not null,
  place      text,
  who        text,
  is_key     boolean not null default false
);

create table if not exists meetings (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  date       date not null,
  time       text,
  title      text not null,
  place      text,
  kind       text,
  done       boolean not null default false
);

create table if not exists wedding_log (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  date       date not null,
  kind       text,
  title      text not null,
  body       text
);
create index if not exists log_date_idx on wedding_log(wedding_id, date desc);

create table if not exists docs (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  name       text not null,
  kind       text,
  url        text not null,
  date       date
);

create table if not exists messages (
  id         text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  date       date not null,
  channel    text not null check (channel in ('whatsapp','mail')),
  to_name    text,
  to_id      text,
  template   text,
  tpl_label  text,
  title      text,
  body       text
);
create index if not exists messages_idx on messages(wedding_id, date desc);
