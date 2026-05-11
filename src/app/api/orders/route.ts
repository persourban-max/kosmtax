import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
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

  const tenantId: string | null = await supabase
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
  const { data, error } = await supabase
    .from("work_orders")
    .insert(insertValues)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
