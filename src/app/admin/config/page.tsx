import { createAdminClient } from "@/lib/supabase/admin"

type Plan = { id: string; name: string; display_name: string; price_monthly: number; price_yearly: number; modules: string[]; is_active: boolean }

export default async function AdminConfigPage() {
  const supabase = createAdminClient()
  const { data: plansRaw } = await supabase.from("plans").select("*").order("price_monthly")
  const plans = (plansRaw ?? []) as Plan[]

  const moduleLabels: Record<string, string> = {
    dashboard: "Dashboard", orders: "Órdenes", production: "Producción",
    inventory: "Inventario", customers: "Clientes", documents: "Documentos", accounting: "Contabilidad",
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-gray-400 text-sm mt-1">Planes y módulos del sistema</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-amber-400 text-sm">
        Para modificar precios o módulos por plan, actualiza directamente en Supabase (tabla <code className="bg-amber-500/20 px-1 rounded font-mono">plans</code>) o contacta al desarrollador.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-white/5 border rounded-xl p-5 ${!plan.is_active ? "opacity-50 border-white/5" : "border-white/10"}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-white text-lg">{plan.display_name}</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{plan.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#2563EB]">
                  ${plan.price_monthly.toLocaleString("es-CO")}
                </div>
                <div className="text-xs text-gray-400">COP/mes</div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs font-medium text-gray-400 mb-2">Módulos incluidos</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.modules?.map((mod) => (
                  <span key={mod} className="text-xs bg-blue-500/20 text-blue-400 rounded-full px-2.5 py-1">
                    {moduleLabels[mod] ?? mod}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-between text-xs text-gray-500">
              <span>Anual: ${plan.price_yearly.toLocaleString("es-CO")} COP</span>
              <span className={plan.is_active ? "text-green-400" : "text-red-400"}>
                {plan.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
