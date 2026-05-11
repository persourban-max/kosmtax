import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PlanCheckout from "./plan-checkout"

type Plan = { id: string; name: string; display_name: string; description: string | null; price_monthly: number; price_yearly: number; modules: string[] }
type TenantUserRow = { tenant_id: string; tenants: { name: string } | null; subscriptions: { status: string; trial_ends_at: string | null; current_period_end: string | null; plans: { display_name: string } | null }[] }

export default async function PlanPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/app/login")

  const { data: plansRaw } = await supabase
    .from("plans")
    .select("id, name, display_name, description, price_monthly, price_yearly, modules")
    .in("name", ["basic", "pro", "full"])
    .order("price_monthly")

  const { data: tenantUserRaw } = await supabase
    .from("tenant_users")
    .select("tenant_id, tenants(name), subscriptions(status, trial_ends_at, current_period_end, plans(display_name))")
    .eq("user_id", user.id)
    .single()
  const tenantUser = tenantUserRaw as TenantUserRow | null

  const plans = (plansRaw ?? []) as Plan[]
  const tenantId = tenantUser?.tenant_id as string | undefined
  const sub = (tenantUser?.subscriptions as { status: string; trial_ends_at: string | null }[] | undefined)?.[0]
  const daysLeft = sub?.trial_ends_at
    ? Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000)
    : null

  const moduleLabels: Record<string, string> = {
    dashboard: "Dashboard", orders: "Órdenes de trabajo", production: "Tablero Kanban",
    inventory: "Control de inventario", customers: "Gestión de clientes",
    documents: "Fichas técnicas", accounting: "Contabilidad",
  }

  const planFeatures: Record<string, string[]> = {
    basic: ["Dashboard + métricas", "Órdenes de trabajo", "Control de inventario", "Gestión de clientes", "Soporte por email"],
    pro: ["Todo lo del plan Básico", "Tablero Kanban de producción", "Documentos y fichas técnicas", "Contabilidad y recibos", "Soporte prioritario"],
    full: ["Todo lo del plan Pro", "White label (tu marca)", "API de integración", "Soporte premium 24/7", "Onboarding personalizado"],
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Elige tu plan</h1>
          <p className="text-gray-500 mt-2">Accede a todas las herramientas que tu negocio necesita</p>
        </div>

        {/* Trial banner */}
        {sub?.status === "trial" && daysLeft !== null && (
          <div className={`rounded-xl p-4 mb-8 text-center text-sm font-medium ${
            daysLeft <= 0
              ? "bg-red-50 border border-red-200 text-red-700"
              : daysLeft <= 3
                ? "bg-amber-50 border border-amber-200 text-amber-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}>
            {daysLeft <= 0
              ? "⚠️ Tu prueba gratuita ha vencido. Suscríbete para seguir usando KOSMTAX."
              : `⏱️ Tu prueba gratuita termina en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}. Suscríbete para no perder acceso.`}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isRecommended = plan.name === "pro"
            const features = planFeatures[plan.name] ?? plan.modules.map((m) => moduleLabels[m] ?? m)
            return (
              <div key={plan.id} className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative ${
                isRecommended ? "border-[#2563EB] shadow-lg shadow-blue-100" : "border-gray-200"
              }`}>
                {isRecommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[#2563EB] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      Más popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-900">{plan.display_name}</h2>
                  {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price_monthly.toLocaleString("es-CO")}
                    </span>
                    <span className="text-gray-500 text-sm"> COP/mes</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    O ${plan.price_yearly.toLocaleString("es-CO")} COP/año (ahorra 2 meses)
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {tenantId ? (
                  <PlanCheckout
                    planId={plan.id}
                    planName={plan.name}
                    tenantId={tenantId}
                    price={plan.price_monthly}
                    displayName={plan.display_name}
                    isRecommended={isRecommended}
                  />
                ) : (
                  <p className="text-center text-sm text-gray-400">Completa el onboarding primero</p>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Pagos procesados de forma segura por MercadoPago · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
