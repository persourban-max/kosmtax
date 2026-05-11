-- ============================================================
-- KOSMTAX — Correcciones de seguridad (Supabase Security Advisor)
-- ============================================================

-- ── 1. Fijar search_path en funciones (Function Search Path Mutable) ─

-- set_updated_at: sin referencias a tablas, fix trivial
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- auth_tenant_id: tabla calificada con esquema explícito
create or replace function public.auth_tenant_id()
returns uuid language sql stable
set search_path = ''
as $$
  select tenant_id from public.tenant_users
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- auth_is_tenant_admin: tabla calificada con esquema explícito
create or replace function public.auth_is_tenant_admin()
returns boolean language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- generate_order_number: tabla calificada con esquema explícito
create or replace function public.generate_order_number()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  year_part text := to_char(now(), 'YYYY');
  seq_num   int;
begin
  select coalesce(max(
    (regexp_match(order_number, 'ORD-\d{4}-(\d+)'))[1]::int
  ), 0) + 1
  into seq_num
  from public.work_orders
  where tenant_id = new.tenant_id
    and order_number like 'ORD-' || year_part || '-%';

  new.order_number := 'ORD-' || year_part || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$;

-- update_inventory_stock: tabla calificada con esquema explícito
create or replace function public.update_inventory_stock()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.stock_before := (
    select stock_current from public.inventory_items where id = new.item_id
  );

  if new.type = 'in' then
    new.stock_after := new.stock_before + new.quantity;
  elsif new.type = 'out' then
    new.stock_after := new.stock_before - new.quantity;
  else
    new.stock_after := new.quantity;
  end if;

  update public.inventory_items
  set stock_current = new.stock_after, updated_at = now()
  where id = new.item_id;

  return new;
end;
$$;

-- ── 2. Revocar ejecución pública de is_system_admin() ────────────────
-- (Public/Signed-In Users Can Execute SECURITY DEFINER Function)

revoke execute on function public.is_system_admin() from public;
revoke execute on function public.is_system_admin() from authenticated;
-- Solo service_role (backend) puede llamarla
grant execute on function public.is_system_admin() to service_role;

-- También fijar search_path con nombres calificados
create or replace function public.is_system_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.system_admins sa
    join auth.users u on u.email = sa.email
    where u.id = auth.uid()
  );
$$;

-- ── 3. Leaked Password Protection ────────────────────────────────────
-- No se puede activar con SQL. Ir a:
-- Supabase Dashboard → Authentication → Settings →
-- "Enable leaked password protection" → Activar → Save
