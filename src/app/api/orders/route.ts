import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("work_orders")
    .select("*, customers(full_name)")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
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

  const body = await request.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertValues: any = {
    tenant_id: tenantId,
    title: body.title,
    customer_id: body.customer_id || null,
    description: body.description || null,
    status: body.status ?? "pending",
    priority: body.priority ?? "normal",
    due_date: body.due_date || null,
    price: body.price ? Number(body.price) : null,
    notes: body.notes || null,
    created_by: user.id,
  }
  const { data, error } = await admin
    .from("work_orders")
    .insert(insertValues)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Auto-crear tarjeta en tablero de producción
  try {
    await autoCreateProductionCard(admin, tenantId, user.id, data, body)
  } catch {
    // No fallar la orden si falla la tarjeta
  }

  // Auto-registrar en contabilidad si tiene precio
  if (data.price && Number(data.price) > 0) {
    try {
      const today = new Date().toISOString().split("T")[0]
      await admin.from("accounting_entries").insert({
        tenant_id: tenantId,
        type: "income",
        amount: Number(data.price),
        description: `Ingreso orden ${data.order_number} — ${data.title}`,
        date: today,
        work_order_id: data.id,
        customer_id: data.customer_id || null,
        created_by: user.id,
      })
    } catch {
      // No fallar la orden si falla la contabilidad
    }
  }

  return NextResponse.json(data, { status: 201 })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoCreateProductionCard(admin: any, tenantId: string, userId: string, order: any, body: any) {
  // Buscar tablero activo del tenant
  const { data: board } = await admin
    .from("production_boards")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .single()

  let boardId: string | null = board?.id ?? null

  // Si no hay tablero, crear uno por defecto
  if (!boardId) {
    const { data: newBoard } = await admin
      .from("production_boards")
      .insert({
        tenant_id: tenantId,
        name: "Producción",
        is_default: true,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single()
    boardId = newBoard?.id ?? null

    if (boardId) {
      await admin.from("production_columns").insert([
        { tenant_id: tenantId, board_id: boardId, name: "Recibido", color: "#94A3B8", position: 0 },
        { tenant_id: tenantId, board_id: boardId, name: "En Proceso", color: "#2563EB", position: 1 },
        { tenant_id: tenantId, board_id: boardId, name: "Terminado", color: "#10B981", position: 2 },
      ])
    }
  }

  if (!boardId) return

  // Buscar primera columna del tablero
  const { data: firstCol } = await admin
    .from("production_columns")
    .select("id")
    .eq("board_id", boardId)
    .order("position")
    .limit(1)
    .single()

  if (!firstCol) return

  const labels: string[] = []
  if (body.priority === "urgent") labels.push("urgente")

  await admin.from("production_cards").insert({
    tenant_id: tenantId,
    board_id: boardId,
    column_id: firstCol.id,
    work_order_id: order.id,
    title: `${order.order_number} — ${order.title}`,
    description: body.description || null,
    position: 0,
    labels,
  })
}
