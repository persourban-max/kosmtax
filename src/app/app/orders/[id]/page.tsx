import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import OrderActions from "./order-actions"
import type { Database } from "@/types/database"

type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"] & {
  customers: { full_name: string; email: string | null; phone: string | null; city: string | null } | null
}
type WorkOrderItem = Database["public"]["Tables"]["work_order_items"]["Row"] & {
  inventory_items: { name: string; sku: string | null } | null
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
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
  const tenantUser = tenantResult.data as { tenant_id: string } | null
  if (!tenantUser) redirect("/app/onboarding")

  const tenantId = tenantUser.tenant_id

  const orderResult = await admin
    .from("work_orders")
    .select("*, customers(full_name, email, phone, city)")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single()
  const order = orderResult.data as WorkOrder | null
  if (!order) notFound()

  const itemsResult = await admin
    .from("work_order_items")
    .select("*, inventory_items(name, sku)")
    .eq("work_order_id", params.id)
  const items = (itemsResult.data ?? []) as WorkOrderItem[]

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const customer = order.customers

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Órdenes</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500 text-sm font-mono">{order.order_number}</span>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
        </div>
        <Link href={`/app/orders/${order.id}/edit`}
          className="shrink-0 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Detalles</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Cliente</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {customer ? (
                    <Link href={`/app/clients/${order.customer_id}`} className="hover:text-[#2563EB]">
                      {customer.full_name}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Precio</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {order.price ? `$${Number(order.price).toLocaleString("es-CO")}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Fecha límite</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {order.due_date ? new Date(order.due_date).toLocaleDateString("es-CO") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Creado</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString("es-CO")}
                </dd>
              </div>
              {order.started_at && (
                <div>
                  <dt className="text-gray-500">Iniciado</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{new Date(order.started_at).toLocaleDateString("es-CO")}</dd>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <dt className="text-gray-500">Completado</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{new Date(order.completed_at).toLocaleDateString("es-CO")}</dd>
                </div>
              )}
            </dl>
            {order.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-500 mb-1">Descripción</dt>
                <dd className="text-sm text-gray-700 whitespace-pre-wrap">{order.description}</dd>
              </div>
            )}
            {order.notes && (
              <div className="mt-3">
                <dt className="text-sm text-gray-500 mb-1">Notas internas</dt>
                <dd className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3 whitespace-pre-wrap">{order.notes}</dd>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Items / Materiales</h2>
            {!items.length ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin items registrados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-2 font-medium text-gray-600">Descripción</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Cant.</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Precio</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900">{item.description}</td>
                      <td className="py-2 text-gray-600 text-right">{item.quantity}</td>
                      <td className="py-2 text-gray-600 text-right">${Number(item.unit_price).toLocaleString("es-CO")}</td>
                      <td className="py-2 font-medium text-gray-900 text-right">${(item.quantity * item.unit_price).toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 font-semibold text-gray-900 text-right">Total:</td>
                    <td className="pt-3 font-bold text-gray-900 text-right">${total.toLocaleString("es-CO")}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <OrderActions orderId={order.id} currentStatus={order.status} />

          {customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{customer.full_name}</p>
                {customer.email && <p className="text-gray-500">{customer.email}</p>}
                {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
                {customer.city && <p className="text-gray-500">{customer.city}</p>}
                <Link href={`/app/clients/${order.customer_id}`} className="text-[#2563EB] text-xs hover:underline">
                  Ver perfil completo →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
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
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; class: string }> = {
    low: { label: "Baja", class: "bg-gray-100 text-gray-500" },
    normal: { label: "Normal", class: "bg-gray-100 text-gray-600" },
    urgent: { label: "Urgente", class: "bg-red-100 text-red-600" },
  }
  const s = map[priority] ?? { label: priority, class: "bg-gray-100 text-gray-500" }
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>
}
