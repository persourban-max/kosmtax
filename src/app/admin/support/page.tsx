import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

type Ticket = {
  id: string; subject: string; status: string; priority: string; created_at: string
  tenants: { name: string } | null
  support_messages: { id: string }[]
}

export default async function AdminSupportPage() {
  const supabase = createAdminClient()

  const { data: ticketsRaw } = await supabase
    .from("support_tickets")
    .select("id, subject, status, priority, created_at, tenants(name), support_messages(id)")
    .order("created_at", { ascending: false })

  const tickets = (ticketsRaw ?? []) as Ticket[]

  const openCount = tickets.filter((t) => t.status === "open").length
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Soporte</h1>
        <p className="text-gray-400 text-sm mt-1">
          {openCount} abiertos · {inProgressCount} en proceso · {resolvedCount} resueltos
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Abiertos", value: openCount, color: "bg-yellow-500/20 text-yellow-400" },
          { label: "En proceso", value: inProgressCount, color: "bg-blue-500/20 text-blue-400" },
          { label: "Resueltos", value: resolvedCount, color: "bg-green-500/20 text-green-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 font-medium text-gray-400">Asunto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Msgs</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {!tickets.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Sin tickets aún</td></tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{t.subject}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{t.tenants?.name ?? "—"}</td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{t.support_messages?.length ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString("es-CO")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/support/${t.id}`} className="text-[#2563EB] text-xs hover:underline">Ver →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400", low: "bg-gray-500/20 text-gray-400",
  }
  const labels: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[priority] ?? "bg-gray-500/20 text-gray-400"}`}>{labels[priority] ?? priority}</span>
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
