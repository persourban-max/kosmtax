import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content } = await request.json()
  const { data, error } = await supabase
    .from("support_messages")
    .insert({ ticket_id: params.id, user_id: user.id, is_admin: true, content, attachments: [] })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", params.id)
  return NextResponse.json(data, { status: 201 })
}
