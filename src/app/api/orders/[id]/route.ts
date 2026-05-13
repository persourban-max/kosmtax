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
  const body = await request.json()
  const { data, error } = await supabase
    .from("work_orders")
    .update(body)
    .eq("id", params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from("work_orders").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
