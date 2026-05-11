import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { notFound } from "next/navigation"
import AdminTenantActions from "./admin-tenant-actions"

type Tenant = { id: string; name: string; slug: string; is_active: boolean; email: string | null; phone: string | null; city: string | null; created_at: string }
type Payment = { id: string; amount: number; status: string; created_at: string; plans: { display_name: string } | null }
type TenantUser = { id: string; user_id: string; full_name: string | null; role: string; joined_at: string | null }
type Feature = { id: string; module: string; is_enabled: boolean }

export default async function AdminTenantDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: tenantRaw } = await supabase.from("tenants").select("*").eq("id", params.id).single()
  if (!tenantRaw) notFound()
  const tenant = tenantRaw as Tenant

  const { data: subRaw } = await supabase
    .from("subscriptions")
    .select("*, plans(name, display_name, price_monthly)")
    .eq("tenant_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
  const sub = subRaw?.[0] as { id: string; status: string; trial_ends_at: string | null; current_period_end: string | null; plans: { name: string; display_name: string; price_monthly: number } | null } | undefined

  const { data: tenantUsersRaw } = await supabase.from("tenant_users").select("id, user_id, full_name, role, joined_at").eq("tenant_id", params.id)
  const { data: paymentsRaw } = await supabase.from("payments").select("id, amount, status, created_at, plans!payments_plan_id_fkey(display_name)").eq("tenant_id", params.id).order("created_at", { ascending: false }).limit(10)
  const { data: featuresRaw } = await supabase.from("feature_flags").select("id, module, is_enabled").eq("tenant_id", params.id)
  const { count: orderCount } = await supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("tenant_id", params.id)
  const { count: customerCount } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", params.id)

  const tenantUsers = (tenantUsersRaw ?? []) as TenantUser[]
  const payments = (paymentsRaw ?? []) as Payment[]
  const features = (featuresRaw ?? []) as Feature[]

  const allModules = ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"]
  const subStatus = sub?.status ?? "none"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/tenants" className="text-gray-400 hover:text-gray-300 text-sm">← Clientes</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
        <SubBadge status={subStatus} isActive={tenant.is_active} />
        {sub?.plans && <PlanBadge name={sub.plans.display_name} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Información</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {tenant.email && <div><dt className="text-gray-400">Email</dt><dd className="text-white mt-0.5">{tenant.email}</dd></div>}
              {tenant.phone && <div><dt className="text-gray-400">Teléfono</dt><dd className="text-white mt-0.5">{tenant.phone}</dd></div>}
              {tenant.city && <div><dt className="text-gray-400">Ciudad</dt><dd className="text-white mt-0.5">{tenant.city}</dd></div>}
              <div><dt className="text-gray-400">Slug</dt><dd className="text-gray-300 font-mono text-xs mt-0.5">{tenant.slug}</dd></div>
              <div><dt className="text-gray-400">Registro</dt><dd className="text-white mt-0.5">{new Date(tenant.created_at).toLocaleDateString("es-CO")}</dd></div>
              <div><dt className="text-gray-400">Órdenes</dt><dd className="text-white font-bold mt-0.5">{orderCount ?? 0}</dd></div>
              <div><dt className="text-gray-400">Clientes</dt><dd className="text-white font-bold mt-0.5">{customerCount ?? 0}</dd></div>
            </dl>
          </div>

          {/* Subscription */}
          {sub && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Suscripción</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-gray-400">Plan</dt><dd className="text-white mt-0.5">{sub.plans?.display_name ?? "—"}</dd></div>
                <div><dt className="text-gray-400">Estado</dt><dd className="mt-0.5"><SubBadge status={sub.status} isActive={tenant.is_active} /></dd></div>
                {sub.trial_ends_at && <div><dt className="text-gray-400">Trial vence</dt><dd className="text-white mt-0.5">{new Date(sub.trial_ends_at).toLocaleDateString("es-CO")}</dd></div>}
                {sub.current_period_end && <div><dt className="text-gray-400">Período hasta</dt><dd className="text-white mt-0.5">{new Date(sub.current_period_end).toLocaleDateString("es-CO")}</dd></div>}
              </dl>
            </div>
          )}

          {/* Feature flags */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Módulos activos</h2>
            <div className="flex flex-wrap gap-2">
              {allModules.map((mod) => {
                const flag = features.find((f) => f.module === mod)
                const isEnabled = flag?.is_enabled ?? false
                return (
                  <span key={mod} className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${isEnabled ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-500 line-through"}`}>
                    {mod}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Users */}
          {tenantUsers.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Usuarios ({tenantUsers.length})</h2>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10"><th className="text-left pb-2 font-medium text-gray-400 text-xs">Nombre</th><th className="text-left pb-2 font-medium text-gray-400 text-xs">Rol</th><th className="text-left pb-2 font-medium text-gray-400 text-xs">Ingresó</th></tr></thead>
                <tbody>
                  {tenantUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2.5 text-white">{u.full_name ?? "—"}</td>
                      <td className="py-2.5 text-gray-400 capitalize text-xs">{u.role}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{u.joined_at ? new Date(u.joined_at).toLocaleDateString("es-CO") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Historial de pagos</h2>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10"><th className="text-left pb-2 font-medium text-gray-400 text-xs">Fecha</th><th className="text-left pb-2 font-medium text-gray-400 text-xs">Plan</th><th className="text-right pb-2 font-medium text-gray-400 text-xs">Monto</th><th className="text-left pb-2 font-medium text-gray-400 text-xs">Estado</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-2.5 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString("es-CO")}</td>
                      <td className="py-2.5 text-gray-300 text-xs">{p.plans?.display_name ?? "—"}</td>
                      <td className="py-2.5 text-white font-medium text-right">${Number(p.amount).toLocaleString("es-CO")}</td>
                      <td className="py-2.5"><PayStatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div>
          <AdminTenantActions tenantId={params.id} currentStatus={subStatus} isActive={tenant.is_active} />
        </div>
      </div>
    </div>
  )
}

function SubBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Suspendido</span>
  const map: Record<string, { label: string; class: string }> = {
    trial: { label: "Trial", class: "bg-yellow-500/20 text-yellow-400" },
    active: { label: "Activo", class: "bg-green-500/20 text-green-400" },
    expired: { label: "Vencido", class: "bg-red-500/20 text-red-400" },
    suspended: { label: "Suspendido", class: "bg-gray-500/20 text-gray-400" },
  }
  const s = map[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400" }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.class}`}>{s.label}</span>
}

function PlanBadge({ name }: { name: string }) {
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/20 text-blue-400">{name}</span>
}

function PayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/20 text-green-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    rejected: "bg-red-500/20 text-red-400",
    refunded: "bg-purple-500/20 text-purple-400",
  }
  const labels: Record<string, string> = { approved: "Aprobado", pending: "Pendiente", rejected: "Rechazado", refunded: "Reembolsado" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-500/20 text-gray-400"}`}>{labels[status] ?? status}</span>
}
