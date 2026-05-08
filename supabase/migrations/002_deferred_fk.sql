-- ============================================================
-- KOSMTAX — Foreign keys diferidas + tabla work_order_items
-- (ejecutar después de 001_initial_schema.sql)
-- ============================================================

-- work_order_items separada para evitar referencia circular
-- (inventory_items se crea después de work_orders en la migración anterior)

create table if not exists work_order_items (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  work_order_id     uuid not null references work_orders(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id) on delete set null,
  description       text not null,
  quantity          numeric(10, 3) not null default 1,
  unit_cost         numeric(12, 2) default 0,
  unit_price        numeric(12, 2) default 0,
  created_at        timestamptz not null default now()
);

create index idx_work_order_items_order on work_order_items(work_order_id);

alter table work_order_items enable row level security;

create policy "work_order_items: crud para miembros del tenant"
  on work_order_items for all
  using (tenant_id = auth_tenant_id());
