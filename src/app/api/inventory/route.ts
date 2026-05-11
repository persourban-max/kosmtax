import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, inventory_categories(name)")
    .eq("is_active", true)
    .order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
    name: body.name,
    sku: body.sku || null,
    description: body.description || null,
    unit: body.unit || "unidad",
    category_id: body.category_id || null,
    stock_current: Number(body.stock_current ?? 0),
    stock_minimum: Number(body.stock_minimum ?? 0),
    stock_maximum: body.stock_maximum ? Number(body.stock_maximum) : null,
    cost_price: Number(body.cost_price ?? 0),
    sale_price: Number(body.sale_price ?? 0),
    is_service: body.is_service ?? false,
    is_active: true,
    created_by: user.id,
  }
  const { data, error } = await supabase
    .from("inventory_items")
    .insert(insertValues)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
