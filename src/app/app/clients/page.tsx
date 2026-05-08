import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("full_name")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{customers?.length ?? 0} clientes</p>
        </div>
        <Link
          href="/app/clients/new"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo cliente
        </Link>
      </div>

      {!customers?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin clientes aún</h3>
          <p className="text-gray-500 text-sm mb-4">Registra tus clientes para asociarlos a órdenes y pagos</p>
          <Link href="/app/clients/new" className="text-[#2563EB] text-sm hover:underline font-medium">
            Agregar primer cliente →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Correo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ciudad</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/app/clients/${c.id}`} className="hover:text-[#2563EB]">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.company_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.city ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
