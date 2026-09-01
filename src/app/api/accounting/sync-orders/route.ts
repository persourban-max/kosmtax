import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type WorkOrderRow = {
  id: string
  order_number: string
  title: string
  price: number
  customer_id: string | null
  created_at: string
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const tenantId: string | null = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
    .then(({ data }) => (data as { tenant_id: string } | null)?.tenant_id ?? null)
  if (!tenantId) return NextResponse.json({ error: "Sin tenant asignado" }, { status: 403 })

  // Obtener todas las órdenes con precio > 0 del tenant
  const { data: rawOrders, error: ordersError } = await admin
    .from("work_orders")
    .select("id, order_number, title, price, customer_id, created_at")
    .eq("tenant_id", tenantId)
    .gt("price", 0)

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 400 })

  const orders = (rawOrders ?? []) as WorkOrderRow[]
  if (!orders.length) return NextResponse.json({ synced: 0, total_with_price: 0 })

  // Obtener IDs de órdenes que ya tienen entrada contable
  const { data: existing } = await admin
    .from("accounting_entries")
    .select("work_order_id")
    .eq("tenant_id", tenantId)
    .eq("type", "income")
    .not("work_order_id", "is", null)

  const existingIds = new Set((existing ?? []).map((e: { work_order_id: string }) => e.work_order_id))

  // Filtrar órdenes sin entrada contable
  const toInsert = orders.filter((o) => !existingIds.has(o.id))
  if (!toInsert.length) return NextResponse.json({ synced: 0, total_with_price: orders.length })

  const entries = toInsert.map((o) => ({
    tenant_id: tenantId,
    type: "income" as const,
    amount: Number(o.price),
    description: `Ingreso orden ${o.order_number} — ${o.title}`,
    date: o.created_at.split("T")[0],
    work_order_id: o.id,
    customer_id: o.customer_id || null,
    created_by: user.id,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin as any).from("accounting_entries").insert(entries)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  return NextResponse.json({ synced: toInsert.length, total_with_price: orders.length })
}
