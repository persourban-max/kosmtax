import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenido, {user?.user_metadata?.full_name || user?.email}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{m.label}</span>
              <span className="text-xl">{m.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-green-600 mt-1">{m.trend}</div>
          </div>
        ))}
      </div>

      {/* Recent orders + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Órdenes recientes</h2>
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">No hay órdenes aún</p>
            <a href="/app/orders/new" className="text-[#2563EB] text-sm hover:underline mt-2 inline-block">
              Crear primera orden →
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Alertas de inventario</h2>
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm">Sin alertas</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Equipo activo</h2>
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm">Sin miembros</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const METRICS = [
  { label: "Órdenes activas", value: "0", icon: "📋", trend: "Sin cambios" },
  { label: "Clientes", value: "0", icon: "👥", trend: "Sin cambios" },
  { label: "Ingresos del mes", value: "$0", icon: "💰", trend: "Sin cambios" },
  { label: "Items en stock", value: "0", icon: "📦", trend: "Sin cambios" },
]
