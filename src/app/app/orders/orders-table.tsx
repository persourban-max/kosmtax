"use client"

import { useRouter } from "next/navigation"

type Order = {
  id: string
  order_number: string
  title: string
  status: string
  created_at: string
  customers: { full_name: string } | null
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Recibido", class: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "En proceso", class: "bg-blue-100 text-blue-700" },
  completed: { label: "Terminado", class: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", class: "bg-red-100 text-red-700" },
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()

  return (
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
        {orders.map((order) => {
          const s = STATUS_MAP[order.status] ?? { label: order.status, class: "bg-gray-100 text-gray-600" }
          return (
            <tr
              key={order.id}
              className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => router.push(`/app/orders/${order.id}`)}
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.order_number}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{order.title}</td>
              <td className="px-4 py-3 text-gray-600">{order.customers?.full_name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
                  {s.label}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(order.created_at).toLocaleDateString("es-CO")}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
