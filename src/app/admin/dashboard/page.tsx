import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

type Tenant = { id: string; name: string; email: string | null; city: string | null; created_at: string }
type Ticket = { id: string; subject: string; priority: string; created_at: string; tenants: { name: string } | null }
type Payment = { id: string; amount: number; currency: string; created_at: string; tenants: { name: string } | null; plans: { display_name: string } | null }
type SubWithPlan = { id: string; plans: { price_monthly: number } | null }

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  const { data: activeSubs } = await supabase
    .from("subscriptions")
    .select("id, plans(price_monthly, display_name)")
    .eq("status", "active")

  const { data: trialSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("status", "trial")

  const { data: recentTenantsRaw } = await supabase
    .from("tenants")
    .select("id, name, email, city, created_at")
    .order("created_at", { ascending: false })
    .limit(6)

  const { data: recentPaymentsRaw } = await supabase
    .from("payments")
    .select("id, amount, currency, created_at, tenants(name), plans!payments_plan_id_fkey(display_name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: openTicketsRaw } = await supabase
    .from("support_tickets")
    .select("id, subject, priority, created_at, tenants(name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5)

  const recentTenants = (recentTenantsRaw ?? []) as Tenant[]
  const recentPayments = (recentPaymentsRaw ?? []) as Payment[]
  const openTickets = (openTicketsRaw ?? []) as Ticket[]

  const mrr = ((activeSubs ?? []) as SubWithPlan[]).reduce(
    (sum, s) => sum + (s.plans?.price_monthly ?? 0), 0
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-gray-400 text-sm mt-1">Métricas del negocio en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="MRR" value={`$${mrr.toLocaleString("es-CO")}`} icon="💰" sub="Ingresos recurrentes mensuales" />
        <MetricCard label="Clientes activos" value={String(activeSubs?.length ?? 0)} icon="🏢" sub="Con plan activo pagado" />
        <MetricCard label="Trials activos" value={String(trialSubs?.length ?? 0)} icon="⏱️" sub="En período de prueba" />
        <MetricCard label="Tickets abiertos" value={String(openTickets.length)} icon="🎫" sub="Sin resolver" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Clientes recientes</h2>
            <Link href="/admin/tenants" className="text-[#2563EB] text-xs hover:underline">Ver todos →</Link>
          </div>
          {!recentTenants.length ? (
            <p className="text-gray-500 text-sm text-center py-6">Sin clientes aún</p>
          ) : (
            <div className="space-y-1">
              {recentTenants.map((t) => (
                <Link key={t.id} href={`/admin/tenants/${t.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.email ?? t.city ?? "—"}</p>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString("es-CO")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Tickets abiertos</h2>
            <Link href="/admin/support" className="text-[#2563EB] text-xs hover:underline">Ver todos →</Link>
          </div>
          {!openTickets.length ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-2xl mb-1">✅</div>
              <p className="text-sm">Sin tickets abiertos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {openTickets.map((t) => (
                <Link key={t.id} href={`/admin/support/${t.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400">{t.tenants?.name ?? "—"}</p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Pagos recientes</h2>
          <Link href="/admin/payments" className="text-[#2563EB] text-xs hover:underline">Ver todos →</Link>
        </div>
        {!recentPayments.length ? (
          <p className="text-gray-500 text-sm text-center py-4">Sin pagos aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left pb-2 font-medium text-gray-400 text-xs">Empresa</th>
                <th className="text-left pb-2 font-medium text-gray-400 text-xs">Plan</th>
                <th className="text-right pb-2 font-medium text-gray-400 text-xs">Monto</th>
                <th className="text-right pb-2 font-medium text-gray-400 text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2.5 text-white">{p.tenants?.name ?? "—"}</td>
                  <td className="py-2.5 text-gray-400 text-xs">{p.plans?.display_name ?? "—"}</td>
                  <td className="py-2.5 text-green-400 font-medium text-right">${Number(p.amount).toLocaleString("es-CO")}</td>
                  <td className="py-2.5 text-gray-500 text-xs text-right">{new Date(p.created_at).toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  }
  const labels: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja" }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${map[priority] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[priority] ?? priority}
    </span>
  )
}
