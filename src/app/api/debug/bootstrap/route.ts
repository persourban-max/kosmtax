import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Endpoint de configuración inicial — protegido por ADMIN_SECRET_KEY
// Uso: GET /api/debug/bootstrap?key=kosmtax-admin-2024
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")

  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const results: Record<string, unknown> = {}

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
  const ADMIN_PASSWORD = searchParams.get("password") || "Kosmtax2024!"

  // ── 1. Crear o actualizar usuario admin ──────────────────────────
  const { data: userList } = await admin.auth.admin.listUsers()
  const existingAdmin = userList?.users?.find((u) => u.email === ADMIN_EMAIL)

  if (existingAdmin) {
    const { error } = await admin.auth.admin.updateUserById(existingAdmin.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    results.admin = error
      ? { status: "error", detail: error.message }
      : { status: "password_updated", email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  } else {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    results.admin = error
      ? { status: "error", detail: error.message }
      : { status: "created", email: newUser.user?.email, password: ADMIN_PASSWORD }
  }

  // ── 2. Crear tenant para persourban@gmail.com si no tiene ────────
  const APP_USER_EMAIL = "persourban@gmail.com"
  const appUser = userList?.users?.find((u) => u.email === APP_USER_EMAIL)

  if (!appUser) {
    results.tenant = { status: "skipped", reason: `${APP_USER_EMAIL} no existe en Supabase Auth` }
  } else {
    const { data: existing } = await admin
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", appUser.id)
      .eq("is_active", true)
      .single()

    if (existing) {
      results.tenant = { status: "already_exists", tenant_id: existing.tenant_id }
    } else {
      const slug = "perso-urban-" + Math.random().toString(36).slice(2, 6)
      const companyName = (appUser.user_metadata?.company_name as string) || "PERSO URBAN"

      const { data: tenant, error: tenantError } = await admin
        .from("tenants")
        .insert({
          name: companyName,
          slug,
          email: appUser.email,
          country: "CO",
          timezone: "America/Bogota",
          vocabulary: {
            order: "Orden de trabajo",
            orders: "Órdenes de trabajo",
            customer: "Cliente",
            customers: "Clientes",
            product: "Producto",
            products: "Productos",
          },
        })
        .select()
        .single()

      if (tenantError || !tenant) {
        results.tenant = { status: "error", detail: tenantError?.message }
      } else {
        await admin.from("tenant_users").insert({
          tenant_id: tenant.id,
          user_id: appUser.id,
          role: "owner",
          full_name: (appUser.user_metadata?.full_name as string) || "Jean Moreno",
          is_active: true,
          joined_at: new Date().toISOString(),
        })

        const { data: plan } = await admin.from("plans").select("id").eq("name", "trial").single()
        if (plan) {
          const trialEnd = new Date()
          trialEnd.setDate(trialEnd.getDate() + 30)
          await admin.from("subscriptions").insert({
            tenant_id: tenant.id,
            plan_id: plan.id,
            status: "trial",
            trial_starts_at: new Date().toISOString(),
            trial_ends_at: trialEnd.toISOString(),
          })
          await admin.from("feature_flags").insert(
            ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"].map((m) => ({
              tenant_id: tenant.id,
              module: m,
              is_enabled: true,
              enabled_at: new Date().toISOString(),
            }))
          )
        }

        results.tenant = { status: "created", tenant_id: tenant.id, company: companyName }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    instructions: {
      admin_login: `Ve a /admin/login y entra con: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`,
      app_login: `${APP_USER_EMAIL} ya puede entrar a /app/login y usar el sistema`,
    },
    results,
  })
}
