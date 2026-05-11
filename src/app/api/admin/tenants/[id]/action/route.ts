import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { action, plan, module, days } = await request.json()
  const tenantId = params.id

  if (action === "change_plan") {
    const { data: planData } = await admin.from("plans").select("id, modules").eq("name", plan).single()
    if (!planData) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })

    await admin.from("subscriptions").update({ plan_id: planData.id, status: "active" }).eq("tenant_id", tenantId)
    await admin.from("feature_flags").delete().eq("tenant_id", tenantId)
    await admin.from("feature_flags").insert(
      (planData.modules as string[]).map((m: string) => ({
        tenant_id: tenantId,
        module: m,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
      }))
    )
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
