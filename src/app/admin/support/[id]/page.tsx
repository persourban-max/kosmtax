import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { notFound } from "next/navigation"
import AdminReplyForm from "./admin-reply-form"

type Message = { id: string; content: string; is_admin: boolean; user_id: string | null; created_at: string }

export default async function AdminSupportTicketPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: ticketRaw } = await supabase
    .from("support_tickets")
    .select("*, tenants(name, email)")
    .eq("id", params.id)
    .single()
  if (!ticketRaw) notFound()

  const ticket = ticketRaw as { id: string; subject: string; status: string; priority: string; created_at: string; tenants: { name: string; email: string | null } | null }

  const { data: messagesRaw } = await supabase
    .from("support_messages")
    .select("id, content, is_admin, user_id, created_at")
    .eq("ticket_id", params.id)
    .order("created_at")

  const messages = (messagesRaw ?? []) as Message[]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/support" className="text-gray-400 hover:text-gray-300 text-sm">← Soporte</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{ticket.subject}</h1>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400">Empresa: </span>
            <span className="text-white font-medium">{ticket.tenants?.name ?? "—"}</span>
            {ticket.tenants?.email && <span className="text-gray-400 ml-2">({ticket.tenants.email})</span>}
          </div>
          <div className="flex gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </div>

      {/* Messages thread */}
      <div className="space-y-4 mb-6">
        {!messages.length && (
          <p className="text-gray-500 text-sm text-center py-8">Sin mensajes aún</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              m.is_admin
                ? "bg-[#2563EB] text-white"
                : "bg-white/10 text-gray-200 border border-white/10"
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className={`text-xs mt-1.5 ${m.is_admin ? "text-blue-200" : "text-gray-500"}`}>
                {m.is_admin ? "Admin" : "Cliente"} · {new Date(m.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <AdminReplyForm ticketId={params.id} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    open: { label: "Abierto", class: "bg-yellow-500/20 text-yellow-400" },
    in_progress: { label: "En proceso", class: "bg-blue-500/20 text-blue-400" },
    resolved: { label: "Resuelto", class: "bg-green-500/20 text-green-400" },
    closed: { label: "Cerrado", class: "bg-gray-500/20 text-gray-400" },
  }
  const s = map[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.class}`}>{s.label}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400", low: "bg-gray-500/20 text-gray-400",
  }
  const labels: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[priority] ?? "bg-gray-500/20 text-gray-400"}`}>{labels[priority] ?? priority}</span>
}
