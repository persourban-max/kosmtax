import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Si ya tiene tenant, ir directo al dashboard
  const { data: existing } = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (existing) return NextResponse.json({ ok: true, already: true })

  const { companyName, city, phone, vocabulary } = await request.json()

  const slug =
    (companyName || "empresa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)

  // Crear tenant con admin client (bypasa RLS)
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: companyName || user.user_metadata?.company_name || "Mi Empresa",
      slug,
      email: user.email,
      phone: phone || null,
      city: city || null,
      vocabulary: vocabulary || {
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
    return NextResponse.json({ error: tenantError?.message ?? "Error creando tenant" }, { status: 500 })
  }

  // Asociar usuario como owner
  await admin.from("tenant_users").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
    full_name: user.user_metadata?.full_name || null,
    is_active: true,
    joined_at: new Date().toISOString(),
  })

  // Crear suscripción trial
  const { data: plan } = await admin.from("plans").select("id").eq("name", "trial").single()
  if (plan) {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 7)

    await admin.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      status: "trial",
      trial_starts_at: new Date().toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    })

    // Habilitar módulos del trial
    const trialModules = ["dashboard", "orders", "inventory", "customers"]
    await admin.from("feature_flags").insert(
      trialModules.map((m) => ({
        tenant_id: tenant.id,
        module: m,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
      }))
    )
  }

  return NextResponse.json({ ok: true, tenant_id: tenant.id })
}
