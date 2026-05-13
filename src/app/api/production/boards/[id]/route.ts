import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Verificar tenant del usuario
  const { data: tenantRow } = await adminAny
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single() as { data: { tenant_id: string } | null }

  if (!tenantRow) return NextResponse.json({ error: "Sin tenant" }, { status: 403 })

  const boardId = params.id

  const [boardRes, colsRes, cardsRes] = await Promise.all([
    adminAny
      .from("production_boards")
      .select("id, name")
      .eq("id", boardId)
      .eq("tenant_id", tenantRow.tenant_id)
      .single(),
    adminAny
      .from("production_columns")
      .select("id, name, color, position")
      .eq("board_id", boardId)
      .eq("tenant_id", tenantRow.tenant_id)
      .order("position"),
    adminAny
      .from("production_cards")
      .select("id, title, description, position, column_id, due_date, labels, work_order_id, created_at, work_orders(order_number, title, description, price, status, priority, due_date, created_at, customers(full_name, phone))")
      .eq("board_id", boardId)
      .eq("tenant_id", tenantRow.tenant_id)
      .order("position"),
  ])

  return NextResponse.json({
    board: boardRes.data,
    columns: colsRes.data ?? [],
    cards: cardsRes.data ?? [],
  })
}
