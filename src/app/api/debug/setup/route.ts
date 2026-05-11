import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Endpoint temporal para crear el tenant del usuario actual
// Visitar: http://localhost:3000/api/debug/setup
export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado — inicia sesión primero en /app/login" }, { status: 401 })
  }

  // Verificar si ya tiene tenant
  const { data: existing } = await admin
    .from("tenant_users")
    .select("tenant_id, tenants(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "Ya tienes un tenant configurado",
      user_email: user.email,
      tenant: existing,
    })
  }

  // Crear tenant
  const slug = "empresa-" + Math.random().toString(36).slice(2, 8)
  const companyName = (user.user_metadata?.company_name as string) || "Mi Empresa"

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: companyName,
      slug,
      email: user.email,
      country: "CO",
      timezone: "America/Bogota",
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: tenantError?.message ?? "Error creando tenant" }, { status: 500 })
  }

  // Asociar usuario como owner
  const { error: tuError } = await admin.from("tenant_users").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
    full_name: (user.user_metadata?.full_name as string) || null,
    is_active: true,
    joined_at: new Date().toISOString(),
  })

  if (tuError) {
    return NextResponse.json({ error: "Tenant creado pero error en tenant_users: " + tuError.message }, { status: 500 })
  }

  // Suscripción trial
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

    const modules = ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"]
    await admin.from("feature_flags").insert(
      modules.map((m) => ({
        tenant_id: tenant.id,
        module: m,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
      }))
    )
  }

  return NextResponse.json({
    ok: true,
    message: "✅ Tenant creado exitosamente. Ya puedes guardar clientes y órdenes.",
    user_email: user.email,
    tenant_id: tenant.id,
    tenant_name: companyName,
  })
}
