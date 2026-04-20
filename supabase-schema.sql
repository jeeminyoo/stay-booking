-- =============================================================================
-- 스테이픽 Supabase 스키마 v2
-- Supabase → SQL Editor → 전체 복사 후 "Run" 버튼 클릭
-- =============================================================================

-- ─── Properties (숙소) ───────────────────────────────────────────────────────
-- rooms 필드: RoomDraft[] 배열을 JSON으로 저장 (요금·시즌요금 포함)

create table if not exists properties (
  id           text primary key,
  host_id      text not null,
  name         text not null,
  description  text not null default '',
  address      text not null default '',
  lat          float not null default 0,
  lng          float not null default 0,
  image_url    text not null default '',
  slug         text unique not null,
  is_draft     boolean not null default true,
  bank_name    text not null default '',
  bank_account text not null default '',
  bank_holder  text not null default '',
  rooms        jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

create index if not exists idx_properties_slug on properties(slug);
create index if not exists idx_properties_host on properties(host_id);

-- ─── Bookings (예약) ─────────────────────────────────────────────────────────

create table if not exists bookings (
  id               text primary key,
  property_id      text not null,
  room_id          text not null,
  property_name    text not null,
  room_name        text not null,
  check_in         date not null,
  check_out        date not null,
  adults           integer not null default 1 check (adults >= 1),
  children         integer not null default 0 check (children >= 0),
  infants          integer not null default 0 check (infants >= 0),
  total_price      integer not null check (total_price >= 0),
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','cancelled','expired')),
  created_at       timestamptz not null default now(),
  payment_deadline timestamptz not null,
  guest_name       text not null,
  guest_phone      text not null,
  guest_message    text,
  payment_notified boolean not null default false,
  bank_name        text not null,
  bank_account     text not null,
  bank_holder      text not null,
  constraint chk_dates check (check_in < check_out)
);

create index if not exists idx_bookings_property on bookings(property_id);
create index if not exists idx_bookings_status   on bookings(status);

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────
-- 현재는 전체 허용 (카카오 로그인 연동 후 host_id 기반으로 교체 예정)

alter table properties enable row level security;
alter table bookings   enable row level security;

create policy "allow_all" on properties for all using (true) with check (true);
create policy "allow_all" on bookings   for all using (true) with check (true);

-- ─── Realtime (예약 변경 실시간 수신) ────────────────────────────────────────

alter publication supabase_realtime add table bookings;

-- ─── 마이그레이션: 예약 상태 확장 ────────────────────────────────────────────
-- 기존 테이블이 있다면 constraint 교체, 없으면 위 CREATE TABLE 이 적용됨

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('waiting_for_deposit','deposit_requested','confirmed','auto_cancelled','cancelled'));

-- ─── Host Settings (호스트별 예약 처리 설정) ─────────────────────────────────

create table if not exists host_settings (
  host_id                              text primary key,
  auto_cancel_after_deposit_requested  boolean not null default true,
  waiting_deposit_minutes              integer not null default 30,
  unavailable_start                    text not null default '21:00',
  unavailable_end                      text not null default '08:00',
  updated_at                           timestamptz not null default now()
);

-- bookings에 입금확인요청 메시지 컬럼 추가
alter table bookings add column if not exists payment_note text;
-- host_settings에 입금대기 시간 컬럼 추가 (기존 테이블 마이그레이션)
alter table host_settings add column if not exists waiting_deposit_minutes integer not null default 30;

alter table host_settings enable row level security;

create policy "allow_all" on host_settings for all using (true) with check (true);

-- ─── Manual Blocks (수동 블락) ────────────────────────────────────────────────

create table if not exists manual_blocks (
  id           text primary key,
  property_id  text not null,
  room_id      text not null,
  date         date not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (property_id, room_id, date)
);

create index if not exists idx_manual_blocks_room on manual_blocks(property_id, room_id);

alter table manual_blocks enable row level security;
create policy "allow_all" on manual_blocks for all using (true) with check (true);

-- ─── Weekly Blocks (정기 요일 블락) ──────────────────────────────────────────

create table if not exists weekly_blocks (
  id           text primary key,
  property_id  text not null,
  room_id      text not null,
  day_of_week  integer not null check (day_of_week >= 0 and day_of_week <= 6),
  created_at   timestamptz not null default now(),
  unique (property_id, room_id, day_of_week)
);

create index if not exists idx_weekly_blocks_room on weekly_blocks(property_id, room_id);

alter table weekly_blocks enable row level security;
create policy "allow_all" on weekly_blocks for all using (true) with check (true);

-- ─── Weekly Block Exceptions (특정 날짜 정기블락 제외) ────────────────────────

create table if not exists weekly_block_exceptions (
  id           text primary key,
  property_id  text not null,
  room_id      text not null,
  date         date not null,
  created_at   timestamptz not null default now(),
  unique (property_id, room_id, date)
);

create index if not exists idx_weekly_block_exceptions_room on weekly_block_exceptions(property_id, room_id);

alter table weekly_block_exceptions enable row level security;
create policy "allow_all" on weekly_block_exceptions for all using (true) with check (true);
