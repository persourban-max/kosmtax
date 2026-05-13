import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const tenantResult = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
  const tenantRow = tenantResult.data as { tenant_id: string } | null
  if (!tenantRow) return NextResponse.json({ error: "Sin tenant" }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (admin as any)
    .from("work_orders")
    .select("*, customers(*), work_order_items(*, inventory_items(name, sku))")
    .eq("id", params.id)
    .eq("tenant_id", tenantRow.tenant_id)
    .single()
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 404 })
  return NextResponse.json(result.data)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
  if (!tenantId) return NextResponse.json({ error: "Sin tenant" }, { status: 403 })

  const body = await request.json()

  // Obtener precio y estado actual para detectar cambios
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentOrder } = await (admin as any)
    .from("work_orders")
    .select("price, order_number, title, customer_id, status")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single() as { data: { price: number | null; order_number: string; title: string; customer_id: string | null; status: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("work_orders")
    .update(body)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sincronizar contabilidad si el precio cambió
  if ("price" in body && currentOrder) {
    const oldPrice = currentOrder.price ? Number(currentOrder.price) : null
    const newPrice = body.price ? Number(body.price) : null

    if (oldPrice !== newPrice) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingEntry } = await (admin as any)
          .from("accounting_entries")
          .select("id")
          .eq("work_order_id", params.id)
          .eq("type", "income")
          .maybeSingle()

        if (newPrice && newPrice > 0) {
          const orderNum = currentOrder.order_number ?? data.order_number
          const orderTitle = currentOrder.title ?? data.title
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const acct = admin as any
          if (existingEntry) {
            await acct.from("accounting_entries").update({
              amount: newPrice,
              description: `Ingreso orden ${orderNum} — ${orderTitle}`,
            }).eq("id", existingEntry.id)
          } else {
            const today = new Date().toISOString().split("T")[0]
            await acct.from("accounting_entries").insert({
              tenant_id: tenantId,
              type: "income",
              amount: newPrice,
              description: `Ingreso orden ${orderNum} — ${orderTitle}`,
              date: today,
              work_order_id: params.id,
              customer_id: body.customer_id || currentOrder.customer_id || null,
              created_by: user.id,
            })
          }
        } else if (existingEntry) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any).from("accounting_entries").delete().eq("id", existingEntry.id)
        }
      } catch {
        // No fallar la orden si falla la contabilidad
      }
    }
  }

  // Sincronizar tarjeta de producción si cambió el estado
  if ("status" in body && currentOrder && body.status !== currentOrder.status) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: card } = await (admin as any)
        .from("production_cards")
        .select("id, board_id")
        .eq("work_order_id", params.id)
        .maybeSingle()

      if (card) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cols } = await (admin as any)
          .from("production_columns")
          .select("id, position")
          .eq("board_id", card.board_id)
          .order("position")

        if (cols && cols.length > 0) {
          let targetColId: string | null = null
          if (body.status === "pending") {
            targetColId = cols[0].id
          } else if (body.status === "in_progress") {
            targetColId = cols.length > 1 ? cols[1].id : cols[0].id
          } else if (body.status === "completed") {
            targetColId = cols[cols.length - 1].id
          }
          // cancelled: no mover la tarjeta de producción

          if (targetColId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (admin as any)
              .from("production_cards")
              .update({ column_id: targetColId })
              .eq("id", card.id)
          }
        }
      }
    } catch {
      // No fallar la orden si falla la sincronización con producción
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from("work_orders").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
