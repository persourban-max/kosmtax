import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { column_id, position } = await request.json()
  const { data, error } = await supabase
    .from("production_cards")
    .update({ column_id, position: position ?? 0 })
    .eq("id", params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
