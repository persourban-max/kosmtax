-- ============================================================
-- KOSMTAX — Esquema inicial de base de datos
-- Multi-tenant B2B SaaS
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type plan_type as enum ('trial', 'basic', 'pro', 'full');
create type subscription_status as enum ('trial', 'active', 'expired', 'suspended', 'cancelled');
create type tenant_role as enum ('owner', 'admin', 'member');
create type order_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type accounting_type as enum ('income', 'expense');
create type payment_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type movement_type as enum ('in', 'out', 'adjustment');

-- ============================================================
-- PLANS TABLE (global, no tenant_id)
-- ============================================================

create table plans (
  id           uuid primary key default uuid_generate_v4(),
  name         plan_type not null unique,
  display_name text not null,
  description  text,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly  numeric(10, 2) not null default 0,
  modules      text[] not null default '{}',
  limits       jsonb not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into plans (name, display_name, description, price_monthly, price_yearly, modules, limits) values
('trial', 'Trial Gratuito', '7 días gratis sin tarjeta de crédito', 0, 0,
  array['dashboard','orders','inventory','customers'],
  '{"orders":50,"customers":50,"products":100,"days":7}'::jsonb
),
('basic', 'Plan Básico', 'Dashboard, Órdenes, Inventario y Clientes', 49900, 499000,
  array['dashboard','orders','inventory','customers'],
  '{"orders":50,"customers":50,"products":100}'::jsonb
),
('pro', 'Plan Pro', 'Todo lo básico más Producción, Documentos y Contabilidad', 99900, 999000,
  array['dashboard','orders','production','inventory','customers','documents','accounting'],
  '{}'::jsonb
),
('full', 'Plan Full', 'Sin restricciones + White Label con dominio propio', 199900, 1999000,
  array['dashboard','orders','production','inventory','customers','documents','accounting'],
  '{"white_label":true}'::jsonb
);

-- ============================================================
-- TENANTS TABLE
-- ============================================================

create table tenants (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,
  logo_url        text,
  -- White label config (Plan Full)
  custom_domain   text unique,
  brand_color     text default '#2563EB',
  -- Vocabulary customization
  vocabulary      jsonb not null default '{
    "order": "Orden de trabajo",
    "orders": "Órdenes de trabajo",
    "customer": "Cliente",
    "customers": "Clientes",
    "product": "Producto",
    "products": "Productos"
  }'::jsonb,
  -- Contact
  email           text,
  phone           text,
  address         text,
  city            text,
  country         text default 'CO',
  timezone        text default 'America/Bogota',
  -- Status
  is_active       boolean not null default true,
  suspended_at    timestamptz,
  suspension_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================

create table subscriptions (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  plan_id             uuid not null references plans(id),
  status              subscription_status not null default 'trial',
  -- Trial
  trial_starts_at     timestamptz,
  trial_ends_at       timestamptz,
  -- Billing
  current_period_start timestamptz,
  current_period_end   timestamptz,
  -- MercadoPago
  mp_subscription_id  text unique,
  mp_payer_id         text,
  -- Cancellation
  cancelled_at        timestamptz,
  cancel_reason       text,
  -- Grace period after expiration (data retention)
  data_expires_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Cada tenant tiene una sola suscripción activa
create unique index idx_subscriptions_tenant_active
  on subscriptions(tenant_id)
  where status in ('trial', 'active');

-- ============================================================
-- FEATURE FLAGS (módulos activos por tenant)
-- ============================================================

create table feature_flags (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  module      text not null,
  is_enabled  boolean not null default false,
  enabled_by  uuid,  -- admin user who enabled it
  enabled_at  timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, module)
);

-- ============================================================
-- TENANT USERS
-- ============================================================

create table tenant_users (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        tenant_role not null default 'member',
  full_name   text,
  avatar_url  text,
  is_active   boolean not null default true,
  invited_at  timestamptz,
  joined_at   timestamptz default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, user_id)
);

-- ============================================================
-- CUSTOMERS (clientes del negocio)
-- ============================================================

create table customers (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  -- Identity
  full_name     text not null,
  document_type text,  -- CC, NIT, Pasaporte
  document_no   text,
  -- Contact
  email         text,
  phone         text,
  address       text,
  city          text,
  -- Business
  company_name  text,
  notes         text,
  tags          text[] default '{}',
  -- Status
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_customers_tenant on customers(tenant_id);
create index idx_customers_search on customers using gin(to_tsvector('spanish', full_name || ' ' || coalesce(email,'') || ' ' || coalesce(company_name,'')));

-- ============================================================
-- WORK ORDERS (órdenes de trabajo)
-- ============================================================

create table work_orders (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  order_number    text not null,  -- auto-generated: ORD-2024-0001
  customer_id     uuid references customers(id) on delete set null,
  -- Details
  title           text not null,
  description     text,
  status          order_status not null default 'pending',
  priority        text default 'normal',  -- low, normal, high, urgent
  -- Assignment
  assigned_to     uuid references auth.users(id),
  -- Dates
  due_date        date,
  started_at      timestamptz,
  completed_at    timestamptz,
  -- Financial
  estimated_cost  numeric(12, 2),
  actual_cost     numeric(12, 2),
  price           numeric(12, 2),
  -- Metadata
  tags            text[] default '{}',
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_work_orders_tenant on work_orders(tenant_id);
create index idx_work_orders_customer on work_orders(customer_id);
create index idx_work_orders_status on work_orders(tenant_id, status);

-- Trigger para generar order_number automáticamente
create or replace function generate_order_number()
returns trigger language plpgsql as $$
declare
  year_part text := to_char(now(), 'YYYY');
  seq_num   int;
begin
  select coalesce(max(
    (regexp_match(order_number, 'ORD-\d{4}-(\d+)'))[1]::int
  ), 0) + 1
  into seq_num
  from work_orders
  where tenant_id = new.tenant_id
    and order_number like 'ORD-' || year_part || '-%';

  new.order_number := 'ORD-' || year_part || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$;

create trigger trg_work_order_number
  before insert on work_orders
  for each row
  when (new.order_number is null or new.order_number = '')
  execute function generate_order_number();

-- work_order_items se crea en 002_deferred_fk.sql (depende de inventory_items)

-- ============================================================
-- PRODUCTION (tablero tipo Trello)
-- ============================================================

create table production_boards (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean default false,
  is_active   boolean default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_production_boards_tenant on production_boards(tenant_id);

create table production_columns (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  board_id    uuid not null references production_boards(id) on delete cascade,
  name        text not null,
  color       text default '#64748B',
  position    int not null default 0,
  wip_limit   int,  -- work in progress limit
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table production_cards (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  board_id         uuid not null references production_boards(id) on delete cascade,
  column_id        uuid not null references production_columns(id) on delete cascade,
  work_order_id    uuid references work_orders(id) on delete set null,
  title            text not null,
  description      text,
  position         int not null default 0,
  assigned_to      uuid references auth.users(id),
  due_date         date,
  labels           text[] default '{}',
  checklist        jsonb default '[]',
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_production_cards_board on production_cards(board_id, column_id, position);

-- ============================================================
-- INVENTORY
-- ============================================================

create table inventory_categories (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table inventory_items (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  category_id     uuid references inventory_categories(id) on delete set null,
  -- Identity
  sku             text,
  name            text not null,
  description     text,
  unit            text default 'unidad',  -- unidad, metro, kg, litro, etc.
  -- Stock
  stock_current   numeric(12, 3) not null default 0,
  stock_minimum   numeric(12, 3) not null default 0,
  stock_maximum   numeric(12, 3),
  -- Pricing
  cost_price      numeric(12, 2) default 0,
  sale_price      numeric(12, 2) default 0,
  -- Media
  image_url       text,
  -- Status
  is_active       boolean not null default true,
  is_service      boolean not null default false,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(tenant_id, sku)
);

create index idx_inventory_tenant on inventory_items(tenant_id);
-- Alerta de stock mínimo
create index idx_inventory_low_stock on inventory_items(tenant_id)
  where stock_current <= stock_minimum and is_active = true;

create table inventory_movements (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  item_id          uuid not null references inventory_items(id) on delete cascade,
  type             movement_type not null,
  quantity         numeric(12, 3) not null,
  stock_before     numeric(12, 3) not null,
  stock_after      numeric(12, 3) not null,
  unit_cost        numeric(12, 2),
  reference        text,  -- orden de trabajo, proveedor, etc.
  work_order_id    uuid references work_orders(id) on delete set null,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

create index idx_inventory_movements_item on inventory_movements(item_id, created_at desc);

-- Trigger para actualizar stock automáticamente
create or replace function update_inventory_stock()
returns trigger language plpgsql as $$
begin
  new.stock_before := (select stock_current from inventory_items where id = new.item_id);

  if new.type = 'in' then
    new.stock_after := new.stock_before + new.quantity;
  elsif new.type = 'out' then
    new.stock_after := new.stock_before - new.quantity;
  else  -- adjustment
    new.stock_after := new.quantity;
  end if;

  update inventory_items
  set stock_current = new.stock_after, updated_at = now()
  where id = new.item_id;

  return new;
end;
$$;

create trigger trg_inventory_movement
  before insert on inventory_movements
  for each row execute function update_inventory_stock();

-- ============================================================
-- DOCUMENTS (fichas técnicas / historial de servicio)
-- ============================================================

create table documents (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  work_order_id   uuid references work_orders(id) on delete set null,
  customer_id     uuid references customers(id) on delete set null,
  type            text not null,  -- technical_sheet, service_history, invoice, receipt
  title           text not null,
  content         jsonb not null default '{}',  -- structured content for printing
  file_url        text,
  is_printed      boolean default false,
  printed_at      timestamptz,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_documents_tenant on documents(tenant_id);
create index idx_documents_work_order on documents(work_order_id);

-- ============================================================
-- ACCOUNTING (contabilidad interna)
-- ============================================================

create table accounting_categories (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  type        accounting_type not null,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table accounting_entries (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  category_id     uuid references accounting_categories(id) on delete set null,
  type            accounting_type not null,
  amount          numeric(12, 2) not null,
  description     text not null,
  reference       text,
  date            date not null default current_date,
  work_order_id   uuid references work_orders(id) on delete set null,
  customer_id     uuid references customers(id) on delete set null,
  receipt_url     text,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_accounting_tenant_date on accounting_entries(tenant_id, date desc);

-- ============================================================
-- RECEIPTS / FACTURAS INTERNAS
-- ============================================================

create table receipts (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  receipt_number    text not null,
  type              text not null default 'receipt',  -- receipt, invoice, credit_note
  customer_id       uuid references customers(id) on delete set null,
  work_order_id     uuid references work_orders(id) on delete set null,
  -- Amounts
  subtotal          numeric(12, 2) not null default 0,
  tax_amount        numeric(12, 2) not null default 0,
  discount_amount   numeric(12, 2) not null default 0,
  total             numeric(12, 2) not null default 0,
  -- Status
  status            text default 'draft',  -- draft, issued, paid, cancelled
  issued_at         timestamptz,
  due_date          date,
  paid_at           timestamptz,
  -- Content
  items             jsonb not null default '[]',
  notes             text,
  -- DIAN (futuro)
  dian_cufe         text,
  dian_status       text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_receipts_tenant on receipts(tenant_id);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

create table support_tickets (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  user_id         uuid references auth.users(id),
  subject         text not null,
  status          ticket_status not null default 'open',
  priority        ticket_priority not null default 'medium',
  assigned_to     uuid references auth.users(id),  -- admin user
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table support_messages (
  id          uuid primary key default uuid_generate_v4(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  user_id     uuid references auth.users(id),
  is_admin    boolean not null default false,
  content     text not null,
  attachments jsonb default '[]',
  created_at  timestamptz not null default now()
);

create index idx_support_tickets_tenant on support_tickets(tenant_id);
create index idx_support_messages_ticket on support_messages(ticket_id, created_at);

-- ============================================================
-- PAYMENTS (historial de pagos MercadoPago)
-- ============================================================

create table payments (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  subscription_id     uuid references subscriptions(id),
  plan_id             uuid references plans(id),
  -- MercadoPago data
  mp_payment_id       text unique,
  mp_preference_id    text,
  mp_external_reference text,
  status              payment_status not null default 'pending',
  amount              numeric(12, 2) not null,
  currency            text default 'COP',
  payment_method      text,
  -- Period
  period_start        timestamptz,
  period_end          timestamptz,
  -- Raw response
  mp_raw              jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_payments_tenant on payments(tenant_id, created_at desc);

-- ============================================================
-- EMAIL LOGS
-- ============================================================

create table email_logs (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id),
  to_email    text not null,
  subject     text not null,
  template    text,
  status      text default 'sent',
  error       text,
  sent_at     timestamptz default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER (reutilizable)
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_tenants_updated_at before update on tenants for each row execute function set_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();
create trigger trg_tenant_users_updated_at before update on tenant_users for each row execute function set_updated_at();
create trigger trg_customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger trg_work_orders_updated_at before update on work_orders for each row execute function set_updated_at();
create trigger trg_production_cards_updated_at before update on production_cards for each row execute function set_updated_at();
create trigger trg_inventory_items_updated_at before update on inventory_items for each row execute function set_updated_at();
create trigger trg_documents_updated_at before update on documents for each row execute function set_updated_at();
create trigger trg_accounting_updated_at before update on accounting_entries for each row execute function set_updated_at();
create trigger trg_receipts_updated_at before update on receipts for each row execute function set_updated_at();
create trigger trg_support_tickets_updated_at before update on support_tickets for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: obtener el tenant_id del usuario autenticado
create or replace function auth_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from tenant_users
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- Helper: verificar si el usuario es admin del tenant
create or replace function auth_is_tenant_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from tenant_users
    where user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- Habilitar RLS en todas las tablas
alter table tenants enable row level security;
alter table subscriptions enable row level security;
alter table feature_flags enable row level security;
alter table tenant_users enable row level security;
alter table customers enable row level security;
alter table work_orders enable row level security;
alter table production_boards enable row level security;
alter table production_columns enable row level security;
alter table production_cards enable row level security;
alter table inventory_categories enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table documents enable row level security;
alter table accounting_categories enable row level security;
alter table accounting_entries enable row level security;
alter table receipts enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table payments enable row level security;

-- ── TENANTS ──────────────────────────────────────────────────
create policy "tenant: member puede ver su tenant"
  on tenants for select
  using (id = auth_tenant_id());

create policy "tenant: owner puede actualizar"
  on tenants for update
  using (
    id = auth_tenant_id()
    and auth_is_tenant_admin()
  );

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
create policy "subscription: member puede ver la propia"
  on subscriptions for select
  using (tenant_id = auth_tenant_id());

-- ── FEATURE FLAGS ────────────────────────────────────────────
create policy "feature_flags: member puede ver"
  on feature_flags for select
  using (tenant_id = auth_tenant_id());

-- ── TENANT USERS ─────────────────────────────────────────────
create policy "tenant_users: ver miembros del propio tenant"
  on tenant_users for select
  using (tenant_id = auth_tenant_id());

create policy "tenant_users: admin puede gestionar"
  on tenant_users for all
  using (tenant_id = auth_tenant_id() and auth_is_tenant_admin());

-- ── CUSTOMERS ────────────────────────────────────────────────
create policy "customers: crud para miembros del tenant"
  on customers for all
  using (tenant_id = auth_tenant_id());

-- ── WORK ORDERS ──────────────────────────────────────────────
create policy "work_orders: crud para miembros del tenant"
  on work_orders for all
  using (tenant_id = auth_tenant_id());

-- ── PRODUCTION ───────────────────────────────────────────────
create policy "production_boards: crud para miembros del tenant"
  on production_boards for all
  using (tenant_id = auth_tenant_id());

create policy "production_columns: crud para miembros del tenant"
  on production_columns for all
  using (tenant_id = auth_tenant_id());

create policy "production_cards: crud para miembros del tenant"
  on production_cards for all
  using (tenant_id = auth_tenant_id());

-- ── INVENTORY ────────────────────────────────────────────────
create policy "inventory_categories: crud para miembros del tenant"
  on inventory_categories for all
  using (tenant_id = auth_tenant_id());

create policy "inventory_items: crud para miembros del tenant"
  on inventory_items for all
  using (tenant_id = auth_tenant_id());

create policy "inventory_movements: crud para miembros del tenant"
  on inventory_movements for all
  using (tenant_id = auth_tenant_id());

-- ── DOCUMENTS ────────────────────────────────────────────────
create policy "documents: crud para miembros del tenant"
  on documents for all
  using (tenant_id = auth_tenant_id());

-- ── ACCOUNTING ───────────────────────────────────────────────
create policy "accounting_categories: crud para miembros del tenant"
  on accounting_categories for all
  using (tenant_id = auth_tenant_id());

create policy "accounting_entries: crud para miembros del tenant"
  on accounting_entries for all
  using (tenant_id = auth_tenant_id());

create policy "receipts: crud para miembros del tenant"
  on receipts for all
  using (tenant_id = auth_tenant_id());

-- ── SUPPORT ──────────────────────────────────────────────────
create policy "support_tickets: ver los propios"
  on support_tickets for select
  using (tenant_id = auth_tenant_id() or user_id = auth.uid());

create policy "support_tickets: crear"
  on support_tickets for insert
  with check (tenant_id = auth_tenant_id());

create policy "support_messages: ver mensajes de tickets propios"
  on support_messages for select
  using (
    ticket_id in (
      select id from support_tickets
      where tenant_id = auth_tenant_id() or user_id = auth.uid()
    )
  );

create policy "support_messages: crear en tickets propios"
  on support_messages for insert
  with check (
    ticket_id in (
      select id from support_tickets
      where tenant_id = auth_tenant_id() or user_id = auth.uid()
    )
    and is_admin = false
  );

-- ── PAYMENTS ─────────────────────────────────────────────────
create policy "payments: ver los propios"
  on payments for select
  using (tenant_id = auth_tenant_id());

-- plans son públicos (lectura)
alter table plans enable row level security;
create policy "plans: lectura pública" on plans for select using (true);
