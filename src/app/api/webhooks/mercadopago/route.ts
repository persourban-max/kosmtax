import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { type, data } = body

  if (type === "payment") {
    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: false }, { status: 400 })

    // Fetch payment details from MercadoPago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    })

    if (!mpRes.ok) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    const payment = await mpRes.json()
    const externalRef = payment.external_reference // format: "tenant_id:plan_id"

    if (!externalRef) return NextResponse.json({ ok: true })

    const [tenantId, planId] = externalRef.split(":")

    // Record payment
    await supabase.from("payments").upsert({
      tenant_id: tenantId,
      plan_id: planId,
      mp_payment_id: String(paymentId),
      status: payment.status === "approved" ? "approved" : payment.status === "rejected" ? "rejected" : "pending",
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      payment_method: payment.payment_method_id,
      mp_raw: payment,
    }, { onConflict: "mp_payment_id" })

    // Activate subscription on approval
    if (payment.status === "approved") {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await supabase.from("subscriptions")
        .update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          plan_id: planId,
        })
        .eq("tenant_id", tenantId)

      // Enable modules for the plan
      const { data: plan } = await supabase.from("plans").select("modules").eq("id", planId).single()
      if (plan?.modules) {
        const flags = plan.modules.map((module: string) => ({
          tenant_id: tenantId,
          module,
          is_enabled: true,
          enabled_at: now.toISOString(),
        }))
        await supabase.from("feature_flags").upsert(flags, { onConflict: "tenant_id,module" })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
