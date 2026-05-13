import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import PrintButtons from "./print-buttons"
import type { Database } from "@/types/database"

type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"] & {
  customers: { full_name: string; email: string | null; phone: string | null; city: string | null } | null
}
type WorkOrderItem = Database["public"]["Tables"]["work_order_items"]["Row"] & {
  inventory_items: { name: string; sku: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
}

export default async function PrintOrderPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/app/login")

  const admin = createAdminClient()
  const tenantResult = await admin
    .from("tenant_users")
    .select("tenant_id, tenants(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
  const tenantUser = tenantResult.data as { tenant_id: string; tenants: { name: string } | null } | null
  if (!tenantUser) redirect("/app/onboarding")

  const tenantId = tenantUser.tenant_id
  const businessName = tenantUser.tenants?.name ?? "Mi Empresa"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderResult = await (admin as any)
    .from("work_orders")
    .select("*, customers(full_name, email, phone, city)")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single()
  const order = orderResult.data as WorkOrder | null
  if (!order) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsResult = await (admin as any)
    .from("work_order_items")
    .select("*, inventory_items(name, sku)")
    .eq("work_order_id", params.id)
  const items = (itemsResult.data ?? []) as WorkOrderItem[]

  const customer = order.customers
  const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const displayPrice = order.price ? Number(order.price) : (items.length ? itemsTotal : null)
  const dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
  const orderDate = new Date(order.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })

  // Texto para WhatsApp
  const lines: string[] = [
    `*${businessName}*`,
    `Orden: ${order.order_number}`,
    `Fecha: ${orderDate}`,
    `Estado: ${STATUS_LABELS[order.status] ?? order.status}`,
    "",
    `*${order.title}*`,
  ]
  if (order.description) lines.push(order.description)
  if (customer) {
    lines.push("", `Cliente: ${customer.full_name}`)
    if (customer.phone) lines.push(`Tel: ${customer.phone}`)
  }
  if (items.length) {
    lines.push("", "*Detalle:*")
    items.forEach((i) => {
      lines.push(`• ${i.description} x${i.quantity} = $${(i.quantity * i.unit_price).toLocaleString("es-CO")}`)
    })
  }
  if (displayPrice) {
    lines.push("", `*Total: $${displayPrice.toLocaleString("es-CO")}*`)
  }
  if (order.notes) lines.push("", `Notas: ${order.notes}`)
  const whatsappText = lines.join("\n")

  return (
    <>
      {/* Barra superior — oculta al imprimir */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href={`/app/orders/${params.id}`}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          ← Volver
        </Link>
        <PrintButtons whatsappText={whatsappText} />
      </div>

      {/* Documento imprimible */}
      <div className="max-w-xl mx-auto p-6 print:p-4 print:max-w-none font-sans text-gray-900">

        {/* Encabezado */}
        <div className="border-b-2 border-gray-800 pb-4 mb-5 print:pb-3 print:mb-4">
          <h1 className="text-2xl font-bold print:text-xl">{businessName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Impreso el {dateStr}</p>
        </div>

        {/* Info de la orden */}
        <div className="mb-5 print:mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Orden de Servicio</p>
              <p className="text-xl font-bold font-mono mt-0.5 print:text-lg">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Estado</p>
              <p className="font-semibold text-sm mt-0.5">{STATUS_LABELS[order.status] ?? order.status}</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mt-3 print:text-base">{order.title}</h2>
          {order.description && (
            <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{order.description}</p>
          )}
        </div>

        {/* Cliente y fechas */}
        <div className="grid grid-cols-2 gap-4 mb-5 print:mb-4 text-sm">
          {customer && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Cliente</p>
              <p className="font-medium">{customer.full_name}</p>
              {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
              {customer.email && <p className="text-gray-600">{customer.email}</p>}
              {customer.city && <p className="text-gray-600">{customer.city}</p>}
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Fechas</p>
            <p className="text-gray-600">
              <span className="text-gray-500">Creado:</span> {orderDate}
            </p>
            {order.due_date && (
              <p className="text-gray-600">
                <span className="text-gray-500">Entrega:</span>{" "}
                {new Date(order.due_date).toLocaleDateString("es-CO")}
              </p>
            )}
            {order.completed_at && (
              <p className="text-gray-600">
                <span className="text-gray-500">Completado:</span>{" "}
                {new Date(order.completed_at).toLocaleDateString("es-CO")}
              </p>
            )}
          </div>
        </div>

        {/* Items / materiales */}
        {items.length > 0 && (
          <div className="mb-5 print:mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Detalle del servicio</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left pb-1.5 font-medium text-gray-600">Descripción</th>
                  <th className="text-right pb-1.5 font-medium text-gray-600 w-12">Cant.</th>
                  <th className="text-right pb-1.5 font-medium text-gray-600 w-24">P. Unit.</th>
                  <th className="text-right pb-1.5 font-medium text-gray-600 w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-900">{item.description}</td>
                    <td className="py-1.5 text-gray-600 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-gray-600 text-right">${Number(item.unit_price).toLocaleString("es-CO")}</td>
                    <td className="py-1.5 font-medium text-gray-900 text-right">
                      ${(item.quantity * item.unit_price).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total */}
        {displayPrice !== null && (
          <div className="border-t-2 border-gray-800 pt-3 flex justify-between items-center">
            <span className="text-base font-semibold">TOTAL A COBRAR</span>
            <span className="text-2xl font-bold print:text-xl">
              ${displayPrice.toLocaleString("es-CO")}
            </span>
          </div>
        )}

        {/* Notas */}
        {order.notes && (
          <div className="mt-5 print:mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 print:bg-white print:border-gray-300">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Notas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Pie */}
        <div className="mt-8 print:mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          Gracias por su preferencia
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
