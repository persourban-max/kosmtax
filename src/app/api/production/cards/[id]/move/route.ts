import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { column_id, position } = await request.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adm = admin as any

  // Fetch card data before updating to get work_order_id and board_id
  const { data: card } = await adm
    .from("production_cards")
    .select("work_order_id, board_id")
    .eq("id", params.id)
    .single()

  const { data, error } = await adm
    .from("production_cards")
    .update({ column_id, position: position ?? 0 })
    .eq("id", params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sync work_order status when card moves to a different column
  if (card?.work_order_id) {
    try {
      const { data: cols } = await adm
        .from("production_columns")
        .select("id, position")
        .eq("board_id", card.board_id)
        .order("position")

      if (cols && cols.length > 0) {
        const colIndex = cols.findIndex((c: { id: string }) => c.id === column_id)
        let newStatus: string
        if (colIndex === 0) {
          newStatus = "pending"
        } else if (colIndex === cols.length - 1) {
          newStatus = "completed"
        } else {
          newStatus = "in_progress"
        }

        await adm
          .from("work_orders")
          .update({ status: newStatus })
          .eq("id", card.work_order_id)
      }
    } catch {
      // No fallar el movimiento si falla la sincronización con la orden
    }
  }

  return NextResponse.json(data)
}
