import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function DocumentsPage() {
  const supabase = createClient()
  const { data: documents } = await supabase
    .from("documents")
    .select("*, customers(full_name), work_orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">Fichas técnicas, órdenes e historial de servicio</p>
        </div>
        <Link
          href="/app/documents/new"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo documento
        </Link>
      </div>

      {!documents?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">🖨️</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin documentos</h3>
          <p className="text-gray-500 text-sm">Los documentos se generan desde las órdenes de trabajo</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Orden</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/app/documents/${doc.id}`} className="hover:text-[#2563EB]">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{doc.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {(doc.customers as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {(doc.work_orders as { order_number: string } | null)?.order_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString("es-CO")}
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
