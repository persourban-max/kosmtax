import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
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
  const body = await request.json()
  const { data, error } = await supabase
    .from("accounting_entries")
    .insert({
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
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
