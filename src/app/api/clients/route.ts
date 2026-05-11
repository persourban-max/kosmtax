import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("full_name")
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
    full_name: body.full_name,
    email: body.email || null,
    phone: body.phone || null,
    document_type: body.document_type || null,
    document_no: body.document_no || null,
    company_name: body.company_name || null,
    address: body.address || null,
    city: body.city || null,
    notes: body.notes || null,
    is_active: true,
    tags: [],
    created_by: user.id,
  }
  const { data, error } = await supabase
    .from("customers")
    .insert(insertValues)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
