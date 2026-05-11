import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import ClientActions from "./client-actions"

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: client } = await supabase.from("customers").select("*").eq("id", params.id).single()
  if (!client) notFound()

  const { data: orders } = await supabase
    .from("work_orders")
    .select("id, order_number, title, status, price, created_at")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false })

  const { data: entries } = await supabase
    .from("accounting_entries")
    .select("amount, type")
    .eq("customer_id", params.id)

  const totalIncome = entries?.filter((e) => e.type === "income").reduce((sum, e) => sum + (e.amount ?? 0), 0) ?? 0
  const totalOrders = orders?.length ?? 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/clients" className="text-gray-400 hover:text-gray-600 text-sm">← Clientes</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{client.full_name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Información de contacto</h2>
              <Link href={`/app/clients/${client.id}/edit`}
                className="text-[#2563EB] text-sm hover:underline">Editar</Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {client.email && (
                <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900 mt-0.5">{client.email}</dd></div>
              )}
              {client.phone && (
                <div><dt className="text-gray-500">Teléfono</dt><dd className="font-medium text-gray-900 mt-0.5">{client.phone}</dd></div>
              )}
              {client.document_type && (
                <div><dt className="text-gray-500">Documento</dt><dd className="font-medium text-gray-900 mt-0.5">{client.document_type}: {client.document_no}</dd></div>
              )}
              {client.company_name && (
                <div><dt className="text-gray-500">Empresa</dt><dd className="font-medium text-gray-900 mt-0.5">{client.company_name}</dd></div>
              )}
              {client.city && (
                <div><dt className="text-gray-500">Ciudad</dt><dd className="font-medium text-gray-900 mt-0.5">{client.city}</dd></div>
              )}
              {client.address && (
                <div className="col-span-2"><dt className="text-gray-500">Dirección</dt><dd className="font-medium text-gray-900 mt-0.5">{client.address}</dd></div>
              )}
            </dl>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-500 mb-1">Notas</dt>
                <dd className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{client.notes}</dd>
              </div>
            )}
          </div>

          {/* Orders history */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Historial de órdenes ({totalOrders})</h2>
              <Link href={`/app/orders/new?customer_id=${client.id}`}
                className="bg-[#2563EB] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                + Nueva orden
              </Link>
            </div>
            {!orders?.length ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin órdenes aún</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium text-gray-600">N°</th>
                    <th className="text-left pb-2 font-medium text-gray-600">Título</th>
                    <th className="text-left pb-2 font-medium text-gray-600">Estado</th>
                    <th className="text-right pb-2 font-medium text-gray-600">Precio</th>
                    <th className="text-right pb-2 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 font-mono text-xs text-gray-500">{order.order_number}</td>
                      <td className="py-2.5">
                        <Link href={`/app/orders/${order.id}`} className="font-medium text-gray-900 hover:text-[#2563EB]">
                          {order.title}
                        </Link>
                      </td>
                      <td className="py-2.5"><StatusBadge status={order.status} /></td>
                      <td className="py-2.5 text-right text-gray-700">
                        {order.price ? `$${Number(order.price).toLocaleString("es-CO")}` : "—"}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">{new Date(order.created_at).toLocaleDateString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Estadísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total órdenes</span>
                <span className="font-bold text-gray-900">{totalOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total facturado</span>
                <span className="font-bold text-green-600">${totalIncome.toLocaleString("es-CO")}</span>
              </div>
            </div>
          </div>

          <ClientActions clientId={client.id} />
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
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>
}
