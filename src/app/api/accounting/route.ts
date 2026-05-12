import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("accounting_entries")
    .select("*, accounting_categories(name)")
    .order("date", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
    type: body.type,
    amount: Number(body.amount),
    description: body.description,
    date: body.date,
    category_id: body.category_id || null,
    reference: body.reference || null,
    work_order_id: body.work_order_id || null,
    customer_id: body.customer_id || null,
    notes: body.notes || null,
    created_by: user.id,
  }
  const { data, error } = await admin
    .from("accounting_entries")
    .insert(insertValues)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
