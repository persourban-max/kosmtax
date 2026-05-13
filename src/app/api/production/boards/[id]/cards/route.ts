import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: tenantRow } = await adminAny
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single() as { data: { tenant_id: string } | null }

  if (!tenantRow) return NextResponse.json({ error: "Sin tenant" }, { status: 403 })

  const { column_id, title } = await request.json()

  // Obtener posición
  const { data: existing } = await adminAny
    .from("production_cards")
    .select("id")
    .eq("column_id", column_id)

  const { data, error } = await adminAny
    .from("production_cards")
    .insert({
      board_id: params.id,
      column_id,
      title,
      position: (existing ?? []).length,
      tenant_id: tenantRow.tenant_id,
      labels: [],
    })
    .select("id, title, description, position, column_id, due_date, labels, work_order_id, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
