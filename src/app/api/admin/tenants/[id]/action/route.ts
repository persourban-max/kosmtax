// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const ALL_MODULES = ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"]
const PLAN_MODULES: Record<string, string[]> = {
  trial: ["dashboard", "orders", "inventory", "customers"],
  basic: ALL_MODULES,
  pro: ALL_MODULES,
  full: ALL_MODULES,
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const body = await request.json()
  const { action, plan, module, days } = body
  const tenantId = params.id

  if (action === "change_plan") {
    const planModules: string[] = PLAN_MODULES[plan] ?? ALL_MODULES
    const now = new Date().toISOString()

    // Verificar qué módulos ya existen en la tabla
    const { data: existing } = await admin
      .from("feature_flags")
      .select("id, module")
      .eq("tenant_id", tenantId)

    const existingModules = new Set((existing ?? []).map((f: { module: string }) => f.module))

    // Para cada módulo: update si existe, insert si no existe
    for (const m of ALL_MODULES) {
      const shouldEnable = planModules.includes(m)
      if (existingModules.has(m)) {
        await admin.from("feature_flags")
          .update({ is_enabled: shouldEnable, enabled_at: now })
          .eq("tenant_id", tenantId)
          .eq("module", m)
      } else {
        await admin.from("feature_flags")
          .insert({ tenant_id: tenantId, module: m, is_enabled: shouldEnable, enabled_at: now })
      }
    }

    // Actualizar suscripción si existe el plan en la DB
    const { data: planData } = await admin.from("plans").select("id").eq("name", plan).single()
    if (planData?.id) {
      await admin.from("subscriptions").update({ plan_id: planData.id, status: "active" }).eq("tenant_id", tenantId)
    }

    return NextResponse.json({ success: true })
  }

  if (action === "extend_trial") {
    const daysToAdd = Number(days) || 7
    const { data: sub } = await admin.from("subscriptions").select("trial_ends_at").eq("tenant_id", tenantId).single()
    const currentEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : new Date()
    if (currentEnd < new Date()) currentEnd.setTime(Date.now())
    currentEnd.setDate(currentEnd.getDate() + daysToAdd)
    await admin.from("subscriptions").update({ trial_ends_at: currentEnd.toISOString(), status: "trial" }).eq("tenant_id", tenantId)
    return NextResponse.json({ success: true })
  }

  if (action === "suspend") {
    await admin.from("tenants").update({ is_active: false, suspended_at: new Date().toISOString() }).eq("id", tenantId)
    await admin.from("subscriptions").update({ status: "suspended" }).eq("tenant_id", tenantId)
    return NextResponse.json({ success: true })
  }

  if (action === "reactivate") {
    await admin.from("tenants").update({ is_active: true, suspended_at: null }).eq("id", tenantId)
    await admin.from("subscriptions").update({ status: "active" }).eq("tenant_id", tenantId)
    return NextResponse.json({ success: true })
  }

  if (action === "enable_module") {
    await admin.from("feature_flags").upsert(
      { tenant_id: tenantId, module, is_enabled: true, enabled_at: new Date().toISOString() },
      { onConflict: "tenant_id,module" }
    )
    return NextResponse.json({ success: true })
  }

  if (action === "disable_module") {
    await admin.from("feature_flags").update({ is_enabled: false }).eq("tenant_id", tenantId).eq("module", module)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
}
