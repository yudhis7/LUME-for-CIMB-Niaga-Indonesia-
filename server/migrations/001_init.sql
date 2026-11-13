-- Lume engine schema v1
-- Workspace content (posts, tasks, inbox, tickets ...) is stored as versioned JSON documents so the
-- console can evolve quickly during the pilot; everything that faces the outside world (people,
-- sessions, platform tokens, outbound calls, inbound events, audit) has its own relational table.

create table if not exists users (
  id            bigserial primary key,
  ws            text not null,
  uid           text not null,
  name          text not null,
  title         text not null default '',
  role          text not null,
  admin         boolean not null default false,
  email         text,
  password_hash text,
  sso_subject   text,
  disabled      boolean not null default false,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  unique (ws, uid)
);

create table if not exists sessions (
  id          text primary key,             -- sha256 of the cookie value; the raw value is never stored
  user_id     bigint not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  last_seen   timestamptz not null default now(),
  ip          text,
  user_agent  text,
  remember    boolean not null default false
);
create index if not exists sessions_user on sessions(user_id);

create table if not exists login_attempts (
  key         text primary key,             -- uid|ip
  fails       int not null default 0,
  locked_until timestamptz
);

-- Workspace documents: one row per entity (collection + id)
create table if not exists docs (
  ws          text not null,
  col         text not null,
  id          text not null,
  data        jsonb not null,
  ver         int not null default 1,
  pos         double precision not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'system',
  primary key (ws, col, id)
);
create index if not exists docs_col_pos on docs(ws, col, pos);
create index if not exists docs_post_due on docs(ws, ((data->>'at')::double precision)) where col = 'posts' and data->>'status' = 'scheduled';
create index if not exists docs_ticket_open on docs(ws) where col = 'tickets' and data->>'closedAt' is null;
create index if not exists docs_inbox_at on docs(ws, ((data->>'at')::double precision)) where col = 'inbox';

-- Platform credentials per connected account (encrypted with DATA_KEY / KMS)
create table if not exists channel_credentials (
  ws           text not null,
  account_id   text not null,
  platform     text not null,
  external_id  text not null,               -- IG user id, FB page id, X user id ...
  token_enc    text not null,
  scopes       text not null default '',
  expires_at   timestamptz,
  connected_by text not null,
  connected_at timestamptz not null default now(),
  primary key (ws, account_id)
);

-- Every call Lume makes to the outside world: publish, reply, hide, notify, CMS, verify
create table if not exists deliveries (
  id          bigserial primary key,
  ws          text not null,
  kind        text not null,
  target      text not null,
  ref_col     text,
  ref_id      text,
  status      text not null default 'queued',  -- queued | sent | failed | manual
  attempts    int not null default 0,
  request     jsonb,
  response    jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists deliveries_ref on deliveries(ws, ref_col, ref_id);
create index if not exists deliveries_status on deliveries(ws, status, created_at desc);

-- Raw inbound webhook events (kept for RAW_EVENT_RETENTION_DAYS, then purged)
create table if not exists inbound_events (
  id          bigserial primary key,
  ws          text not null,
  source      text not null,
  dedupe_key  text,
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  processed   boolean not null default false,
  error       text,
  unique (ws, source, dedupe_key)
);

-- Tamper-evident audit log: each row carries the hash of the previous one
create table if not exists audit_log (
  seq         bigserial primary key,
  ws          text not null,
  at          timestamptz not null default now(),
  actor       text not null,
  role        text,
  action      text not null,
  col         text,
  entity_id   text,
  detail      jsonb,
  prev_hash   text not null,
  hash        text not null
);
create index if not exists audit_entity on audit_log(ws, col, entity_id);

create table if not exists meta (
  ws    text not null,
  key   text not null,
  value jsonb not null,
  primary key (ws, key)
);

-- Advocate app sign-in links (magic links sent by WhatsApp / email); only the hash is stored
create table if not exists advocate_tokens (
  id          text primary key,
  ws          text not null,
  adv_id      text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists advocate_tokens_adv on advocate_tokens(ws, adv_id);
