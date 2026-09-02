-- ============================================================
-- KOSMTAX — Corrige recursión infinita en políticas RLS
-- ============================================================
--
-- auth_tenant_id() y auth_is_tenant_admin() consultan tenant_users,
-- pero tenant_users tiene políticas RLS que llaman a estas mismas
-- funciones para decidir si se puede leer la fila. Sin SECURITY
-- DEFINER, cada consulta protegida por estas funciones dispara una
-- evaluación recursiva de la misma política sobre tenant_users,
-- lo que cuelga la consulta (o falla con "stack depth limit exceeded").
--
-- SECURITY DEFINER hace que la consulta interna de la función corra
-- con los privilegios de quien la creó (bypasea RLS para esa consulta
-- puntual), cortando la recursión. Es el patrón recomendado por Supabase
-- para este tipo de función auxiliar de autorización.
-- ============================================================

create or replace function public.auth_tenant_id()
returns uuid language sql stable security definer
set search_path = ''
as $$
  select tenant_id from public.tenant_users
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.auth_is_tenant_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;
