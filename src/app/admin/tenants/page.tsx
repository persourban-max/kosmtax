import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

export default async function AdminTenantsPage() {
  const supabase = createAdminClient()

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, email, city, is_active, created_at, subscriptions(status, trial_ends_at, current_period_end, plans(name, display_name, price_monthly))")
    .order("created_at", { ascending: false })

  type TenantRow = {
    id: string; name: string; slug: string; email: string | null; city: string | null
    is_active: boolean; created_at: string
    subscriptions: { status: string; trial_ends_at: string | null; current_period_end: string | null; plans: { name: string; display_name: string; price_monthly: number } | null }[]
  }

  function getSubInfo(t: TenantRow) {
    const sub = t.subscriptions?.[0]
    if (!sub) return { status: "none", planLabel: "Sin plan", daysLeft: null }
    const plan = sub.plans
    let daysLeft: number | null = null
    if (sub.status === "trial" && sub.trial_ends_at) {
      daysLeft = Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000)
    } else if (sub.status === "active" && sub.current_period_end) {
      daysLeft = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000)
    }
    return { status: sub.status, planLabel: plan?.display_name ?? "—", daysLeft }
  }

  const total = tenants?.length ?? 0
  const activeCount = tenants?.filter((t) => {
    const sub = (t as TenantRow).subscriptions?.[0]
    return sub?.status === "active"
  }).length ?? 0
  const trialCount = tenants?.filter((t) => {
    const sub = (t as TenantRow).subscriptions?.[0]
    return sub?.status === "trial"
  }).length ?? 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} total · {activeCount} activos · {trialCount} en trial
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 font-medium text-gray-400">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Ciudad</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Vigencia</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Registro</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {(tenants as TenantRow[] | null)?.map((tenant) => {
              const { status, planLabel, daysLeft } = getSubInfo(tenant)
              return (
                <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{tenant.name}</p>
                    <p className="text-xs text-gray-500">{tenant.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3"><PlanBadge name={planLabel} /></td>
                  <td className="px-4 py-3"><StatusBadge status={status} isActive={tenant.is_active} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{tenant.city ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {daysLeft !== null ? (
                      <span className={daysLeft <= 3 ? "text-red-400 font-medium" : "text-gray-400"}>
                        {daysLeft > 0 ? `${daysLeft} días` : "Vencido"}
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(tenant.created_at).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${tenant.id}`}
                      className="text-[#2563EB] text-xs hover:underline font-medium">
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!tenants?.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Sin clientes aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlanBadge({ name }: { name: string }) {
  const map: Record<string, string> = {
    "Básico": "bg-blue-500/20 text-blue-400",
    "Pro": "bg-purple-500/20 text-purple-400",
    "Full": "bg-green-500/20 text-green-400",
    "Trial": "bg-yellow-500/20 text-yellow-400",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[name] ?? "bg-gray-500/20 text-gray-400"}`}>
      {name}
    </span>
  )
}

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Suspendido</span>
  const map: Record<string, { label: string; class: string }> = {
    trial: { label: "Trial", class: "bg-yellow-500/20 text-yellow-400" },
    active: { label: "Activo", class: "bg-green-500/20 text-green-400" },
    expired: { label: "Vencido", class: "bg-red-500/20 text-red-400" },
    suspended: { label: "Suspendido", class: "bg-gray-500/20 text-gray-400" },
    cancelled: { label: "Cancelado", class: "bg-red-500/20 text-red-400" },
  }
  const s = map[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.class}`}>{s.label}</span>
}
