import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/app/login")

  const admin = createAdminClient()
  const tenantResult = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
  const tenantRow = tenantResult.data as { tenant_id: string } | null
  if (!tenantRow) redirect("/app/onboarding")

  const tenantId = tenantRow.tenant_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersRaw } = await (admin as any)
    .from("work_orders")
    .select("*, customers(full_name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50)
  const orders = (ordersRaw ?? []) as Array<{
    id: string; order_number: string; title: string; status: string;
    created_at: string; customers: { full_name: string } | null
  }>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de trabajo</h1>
          <p className="text-gray-500 text-sm mt-1">{orders?.length ?? 0} órdenes</p>
        </div>
        <Link
          href="/app/orders/new"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva orden
        </Link>
      </div>

      {!orders?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin órdenes aún</h3>
          <p className="text-gray-500 text-sm mb-4">Crea tu primera orden de trabajo para empezar</p>
          <Link href="/app/orders/new" className="text-[#2563EB] text-sm hover:underline font-medium">
            Crear primera orden →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">N°</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.order_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/app/orders/${order.id}`} className="hover:text-[#2563EB]">
                      {order.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(order.customers as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pendiente", class: "bg-yellow-100 text-yellow-700" },
    in_progress: { label: "En proceso", class: "bg-blue-100 text-blue-700" },
    completed: { label: "Completado", class: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelado", class: "bg-red-100 text-red-700" },
  }
  const s = map[status] ?? { label: status, class: "bg-gray-100 text-gray-600" }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
      {s.label}
    </span>
  )
}
