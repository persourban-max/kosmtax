import { createAdminClient } from "@/lib/supabase/admin"

type Payment = {
  id: string; amount: number; currency: string; status: string
  payment_method: string | null; mp_payment_id: string | null; created_at: string
  tenants: { name: string } | null; plans: { display_name: string } | null
}

export default async function AdminPaymentsPage() {
  const supabase = createAdminClient()

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select("id, amount, currency, status, payment_method, mp_payment_id, created_at, tenants(name), plans!payments_plan_id_fkey(display_name)")
    .order("created_at", { ascending: false })
    .limit(200)

  const payments = (paymentsRaw ?? []) as Payment[]

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonth = payments.filter((p) => p.created_at >= monthStart && p.status === "approved")
  const totalApproved = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0)
  const monthTotal = thisMonth.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <p className="text-gray-400 text-sm mt-1">{payments.length} registros</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-1">Total cobrado</div>
          <div className="text-2xl font-bold text-green-400">${totalApproved.toLocaleString("es-CO")}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-1">Este mes</div>
          <div className="text-2xl font-bold text-white">${monthTotal.toLocaleString("es-CO")}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-1">Pagos aprobados</div>
          <div className="text-2xl font-bold text-white">{payments.filter((p) => p.status === "approved").length}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 font-medium text-gray-400">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Plan</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400">Monto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">ID MercadoPago</th>
            </tr>
          </thead>
          <tbody>
            {!payments.length && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Sin pagos aún</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString("es-CO")}</td>
                <td className="px-4 py-3 text-white">{p.tenants?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{p.plans?.display_name ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium text-white">${Number(p.amount).toLocaleString("es-CO")}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.mp_payment_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    approved: { label: "Aprobado", class: "bg-green-500/20 text-green-400" },
    pending: { label: "Pendiente", class: "bg-yellow-500/20 text-yellow-400" },
    rejected: { label: "Rechazado", class: "bg-red-500/20 text-red-400" },
    refunded: { label: "Reembolsado", class: "bg-purple-500/20 text-purple-400" },
  }
  const s = map[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.class}`}>{s.label}</span>
}
