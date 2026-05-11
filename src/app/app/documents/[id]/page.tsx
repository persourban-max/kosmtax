import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import PrintButton from "./print-button"

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: doc } = await supabase
    .from("documents")
    .select(`
      *,
      customers(full_name, email, phone, city, company_name, document_type, document_no),
      work_orders(order_number, title, status),
      tenants(name, logo_url, email, phone, city)
    `)
    .eq("id", params.id)
    .single()

  if (!doc) notFound()

  const customer = doc.customers as { full_name: string; email: string | null; phone: string | null; city: string | null; company_name: string | null; document_type: string | null; document_no: string | null } | null
  const order = doc.work_orders as { order_number: string; title: string; status: string } | null
  const tenant = doc.tenants as { name: string; logo_url: string | null; email: string | null; phone: string | null; city: string | null } | null
  const content = (doc.content ?? {}) as Record<string, string>

  const docTypeLabels: Record<string, string> = {
    technical_sheet: "FICHA TÉCNICA",
    service_record: "HISTORIAL DE SERVICIO",
    quote: "COTIZACIÓN",
    invoice: "FACTURA / RECIBO",
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 20px !important; max-width: none !important; }
        }
      `}</style>

      <div className="no-print px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white">
        <Link href="/app/documents" className="text-gray-400 hover:text-gray-600 text-sm">← Documentos</Link>
        <PrintButton />
      </div>

      <div className="p-6 no-print">
        <div className="max-w-[800px] mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm print-page">
          {/* Header */}
          <div className="bg-[#0F172A] text-white p-8 flex items-start justify-between">
            <div>
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.name} className="h-10 mb-3 object-contain" />
              ) : (
                <div className="text-2xl font-bold text-[#2563EB] mb-1">{tenant?.name}</div>
              )}
              <div className="text-gray-400 text-xs space-y-0.5">
                {tenant?.email && <p>{tenant.email}</p>}
                {tenant?.phone && <p>{tenant.phone}</p>}
                {tenant?.city && <p>{tenant.city}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{docTypeLabels[doc.type] ?? doc.type.toUpperCase()}</div>
              {order && <div className="text-[#2563EB] font-mono text-sm mt-1">{order.order_number}</div>}
              <div className="text-gray-400 text-xs mt-1">{new Date(doc.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>

            {/* Client + Order info */}
            <div className="grid grid-cols-2 gap-6">
              {customer && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cliente</h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold text-gray-900">{customer.full_name}</p>
                    {customer.company_name && <p className="text-gray-600">{customer.company_name}</p>}
                    {customer.document_type && <p className="text-gray-500">{customer.document_type}: {customer.document_no}</p>}
                    {customer.email && <p className="text-gray-500">{customer.email}</p>}
                    {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
                    {customer.city && <p className="text-gray-500">{customer.city}</p>}
                  </div>
                </div>
              )}
              {order && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Orden de trabajo</h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-mono font-semibold text-[#2563EB]">{order.order_number}</p>
                    <p className="text-gray-900">{order.title}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Technical content */}
            {doc.type === "technical_sheet" && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Especificaciones técnicas</h3>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <tbody>
                    {[
                      ["Material / Tela", content.material],
                      ["Color", content.color],
                      ["Medidas / Talla", content.measurements],
                      ["Cantidad", content.quantity],
                      ["Fecha de entrega", content.delivery_date ? new Date(content.delivery_date).toLocaleDateString("es-CO") : null],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <tr key={label as string} className="border-b border-gray-100">
                        <td className="px-4 py-2.5 font-medium text-gray-600 bg-gray-50 w-40">{label as string}</td>
                        <td className="px-4 py-2.5 text-gray-900">{value as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {content.specifications && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Especificaciones adicionales</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{content.specifications}</p>
                  </div>
                )}
              </div>
            )}

            {/* Generic content for other types */}
            {doc.type !== "technical_sheet" && Object.keys(content).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contenido</h3>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(content, null, 2)}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
              <p>Documento generado por {tenant?.name} · {new Date(doc.created_at).toLocaleString("es-CO")}</p>
              <p className="mt-0.5">Powered by KOSMTAX</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
