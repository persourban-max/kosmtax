import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MercadoPagoConfig, Preference } from "mercadopago"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { plan_id, tenant_id } = await request.json()

    const { data: plan } = await supabase.from("plans").select("*").eq("id", plan_id).single()
    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })

    const { data: tenant } = await supabase.from("tenants").select("name, email").eq("id", tenant_id).single()

    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! })
    const preferenceClient = new Preference(mpClient)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: plan.id,
            title: `KOSMTAX ${plan.display_name} - Mensual`,
            description: plan.description ?? `Plan ${plan.display_name} mensual`,
            quantity: 1,
            unit_price: plan.price_monthly,
            currency_id: "COP",
          },
        ],
        payer: { email: user.email ?? undefined, name: tenant?.name ?? undefined },
        external_reference: `${tenant_id}:${plan_id}`,
        back_urls: {
          success: `${appUrl}/app/dashboard?payment=success`,
          failure: `${appUrl}/app/plan?payment=failed`,
          pending: `${appUrl}/app/plan?payment=pending`,
        },
        auto_return: "approved",
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        statement_descriptor: "KOSMTAX",
      },
    })

    await supabase.from("payments").insert({
      tenant_id,
      plan_id,
      mp_preference_id: preference.id,
      mp_external_reference: `${tenant_id}:${plan_id}`,
      status: "pending",
      amount: plan.price_monthly,
      currency: "COP",
    })

    return NextResponse.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear preferencia"
    console.error("MP preference error:", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
