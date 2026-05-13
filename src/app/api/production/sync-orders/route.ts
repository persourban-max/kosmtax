import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const tenantId: string | null = await adminAny
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
    .then(({ data }: { data: { tenant_id: string } | null }) => data?.tenant_id ?? null)

  if (!tenantId) return NextResponse.json({ error: "Sin tenant" }, { status: 403 })

  // Todas las órdenes no canceladas del tenant
  const { data: orders } = await adminAny
    .from("work_orders")
    .select("id, order_number, title, description, priority")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .order("created_at")

  if (!orders?.length) return NextResponse.json({ created: 0, message: "No hay órdenes" })

  // Tarjetas que ya tienen orden vinculada
  const { data: existingCards } = await adminAny
    .from("production_cards")
    .select("work_order_id")
    .eq("tenant_id", tenantId)
    .not("work_order_id", "is", null)

  const linkedIds = new Set((existingCards ?? []).map((c: { work_order_id: string }) => c.work_order_id))
  const unlinked = (orders as { id: string; order_number: string; title: string; description: string | null; priority: string }[])
    .filter((o) => !linkedIds.has(o.id))

  if (!unlinked.length) return NextResponse.json({ created: 0, message: "Todas las órdenes ya tienen tarjeta en producción" })

  // Obtener o crear tablero activo
  let boardId: string | null = null
  const { data: board } = await adminAny
    .from("production_boards")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .single()

  boardId = board?.id ?? null

  if (!boardId) {
    const { data: newBoard } = await adminAny
      .from("production_boards")
      .insert({ tenant_id: tenantId, name: "Producción", is_default: true, is_active: true, created_by: user.id })
      .select()
      .single()
    boardId = newBoard?.id ?? null

    if (boardId) {
      await adminAny.from("production_columns").insert([
        { tenant_id: tenantId, board_id: boardId, name: "Recibido", color: "#94A3B8", position: 0 },
        { tenant_id: tenantId, board_id: boardId, name: "En Proceso", color: "#2563EB", position: 1 },
        { tenant_id: tenantId, board_id: boardId, name: "Terminado", color: "#10B981", position: 2 },
      ])
    }
  }

  if (!boardId) return NextResponse.json({ error: "No se pudo crear tablero" }, { status: 500 })

  // Primera columna (Recibido)
  const { data: firstCol } = await adminAny
    .from("production_columns")
    .select("id")
    .eq("board_id", boardId)
    .order("position")
    .limit(1)
    .single()

  if (!firstCol) return NextResponse.json({ error: "Sin columnas en el tablero" }, { status: 500 })

  // Crear tarjetas para órdenes sin tarjeta
  const cards = unlinked.map((order, idx) => {
    const labels: string[] = []
    if (order.priority === "urgent") labels.push("urgente")
    return {
      tenant_id: tenantId,
      board_id: boardId,
      column_id: firstCol.id,
      work_order_id: order.id,
      title: `${order.order_number} — ${order.title}`,
      description: order.description || null,
      position: idx,
      labels,
    }
  })

  const { error } = await adminAny.from("production_cards").insert(cards)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ created: unlinked.length, boardId })
}
