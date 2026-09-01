-- ============================================================
-- KOSMTAX — Configuración del administrador del sistema
-- ============================================================
--
-- INSTRUCCIONES DE USO:
-- ─────────────────────────────────────────────────────────────
-- 1. Ejecuta este script completo en el SQL Editor de Supabase
--
-- 2. Crea tu cuenta admin en Supabase Dashboard:
--    Dashboard → Authentication → Users → "Add user" (invitar)
--    Usa el mismo email que tienes en ADMIN_EMAIL de tu .env.local
--    Activa "Auto Confirm User" para no necesitar verificar email
--
-- 3. Una vez creado el usuario, registra el email aquí:
--    Reemplaza 'tu@email.com' al final del script y ejecuta ese INSERT
--
-- ============================================================

-- ── Tabla de administradores del sistema ─────────────────────
create table if not exists system_admins (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  notes      text,
  created_at timestamptz not null default now()
);

-- Sólo service_role puede leer/escribir (RLS cierra acceso a usuarios normales)
alter table system_admins enable row level security;

-- Eliminar política previa si existe (idempotente)
drop policy if exists "system_admins: sin acceso a usuarios regulares" on system_admins;

create policy "system_admins: sin acceso a usuarios regulares"
  on system_admins for all
  using (false);

-- ── Función helper: ¿el usuario actual es admin del sistema? ─
create or replace function is_system_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from system_admins sa
    join auth.users u on u.email = sa.email
    where u.id = auth.uid()
  );
$$;

-- ── Tabla de configuración global (para futuras settings) ────
create table if not exists system_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table system_config enable row level security;

drop policy if exists "system_config: sin acceso a usuarios regulares" on system_config;

create policy "system_config: sin acceso a usuarios regulares"
  on system_config for all
  using (false);

-- ── Registrar el admin principal ─────────────────────────────
INSERT INTO system_admins (email, notes)
VALUES ('jeanmb1020@hotmail.com', 'Administrador principal KOSMTAX')
ON CONFLICT (email) DO NOTHING;

-- ── Verificar que quedó bien ──────────────────────────────────
-- SELECT * FROM system_admins;
