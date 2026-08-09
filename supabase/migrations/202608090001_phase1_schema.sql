-- Project Chronicle canonical schema from zero.
-- Framework compatibility: digital-boardgame-framework 0.42.0.
-- Apply migrations in lexical order; do not edit an already-populated database by hand.

create table if not exists dbf_games (
  game_id       text primary key,
  players       jsonb not null,
  tokens        jsonb not null,
  emails        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  resolved      boolean not null default false,
  reminder      jsonb,
  identities    jsonb not null default '{}'::jsonb,
  ranked_report jsonb
);
create index if not exists dbf_games_active on dbf_games(game_id) where resolved = false;

create table if not exists dbf_snapshots (
  game_id     text not null references dbf_games(game_id) on delete cascade,
  turn        integer not null check (turn >= 0),
  state       text not null,
  created_at  timestamptz not null default now(),
  primary key (game_id, turn)
);
create index if not exists dbf_snapshots_latest on dbf_snapshots(game_id, turn desc);

create table if not exists dbf_messages (
  id          bigint generated always as identity primary key,
  game_id     text not null references dbf_games(game_id) on delete cascade,
  seat        text not null,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists dbf_messages_game on dbf_messages(game_id, created_at);

create table if not exists dbf_reports (
  report_id        text primary key,
  game_id          text,
  reporter_side    text,
  turn_number      integer not null check (turn_number >= 0),
  server_snapshot  text not null,
  reporter_view    text not null,
  client_log       jsonb not null default '[]'::jsonb,
  message          text not null,
  severity         text not null,
  category         text,
  app_id           text,
  client_build     text,
  user_agent       text,
  created_at       timestamptz not null default now(),
  resolution       jsonb
);
create index if not exists dbf_reports_created on dbf_reports(created_at desc);
create index if not exists dbf_reports_severity on dbf_reports(severity);
create index if not exists dbf_reports_category on dbf_reports(category);
create index if not exists dbf_reports_app on dbf_reports(app_id);
create index if not exists dbf_reports_unresolved on dbf_reports(report_id) where resolution is null;
create index if not exists dbf_reports_game on dbf_reports(game_id);

-- Server-only tables. Supabase's service_role bypasses RLS; anon and
-- authenticated clients receive no table grants or policies.
alter table dbf_games enable row level security;
alter table dbf_snapshots enable row level security;
alter table dbf_messages enable row level security;
alter table dbf_reports enable row level security;

revoke all on table dbf_games, dbf_snapshots, dbf_messages, dbf_reports from anon, authenticated;
grant all on table dbf_games, dbf_snapshots, dbf_messages, dbf_reports to service_role;
grant usage, select on sequence dbf_messages_id_seq to service_role;
