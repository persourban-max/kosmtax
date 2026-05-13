import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await request.json()

  const admin = createAdminClient()
  const { data: tenantUser } = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()
  if (!tenantUser) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: board, error } = await sb
    .from("production_boards")
    .insert({
      name,
      description: description || null,
      is_active: true,
      is_default: false,
      created_by: user.id,
      tenant_id: tenantUser.tenant_id,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const defaultColumns = [
    { name: "Recibido", color: "#94A3B8", position: 0 },
    { name: "En Proceso", color: "#2563EB", position: 1 },
    { name: "Terminado", color: "#10B981", position: 2 },
  ]
  await sb.from("production_columns").insert(
    defaultColumns.map((c) => ({
      ...c,
      board_id: board.id,
      tenant_id: (tenantUser as { tenant_id: string }).tenant_id,
    }))
  )

  return NextResponse.json(board, { status: 201 })
}
