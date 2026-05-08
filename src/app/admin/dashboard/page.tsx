import { createClient } from "@/lib/supabase/server"

export default async function AdminDashboardPage() {
  const supabase = createClient()

  const [
    { count: totalTenants },
    { count: activeTrials },
  ] = await Promise.all([
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "trial"),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-gray-400 text-sm mt-1">Métricas del negocio en tiempo real</p>
      </div>

      {/* MRR + Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="MRR" value="$0" icon="💰" sub="Ingresos recurrentes mensuales" />
        <MetricCard label="Clientes activos" value={String(totalTenants ?? 0)} icon="🏢" sub="Tenants con plan activo" />
        <MetricCard label="Trials activos" value={String(activeTrials ?? 0)} icon="⏱️" sub="En período de prueba" />
        <MetricCard label="Cancelaciones" value="0" icon="❌" sub="Este mes" />
      </div>

      {/* Recent tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Clientes recientes</h2>
          <div className="text-center py-10 text-gray-500">
            <div className="text-3xl mb-2">🏢</div>
            <p className="text-sm">Sin clientes aún</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Tickets de soporte abiertos</h2>
          <div className="text-center py-10 text-gray-500">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm">Sin tickets abiertos</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, sub }: {
  label: string
  value: string
  icon: string
  sub: string
}) {
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
