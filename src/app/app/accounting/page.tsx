import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AccountingPage() {
  const supabase = createClient()
  const { data: entries } = await supabase
    .from("accounting_entries")
    .select("*, accounting_categories(name)")
    .order("date", { ascending: false })
    .limit(50)

  const income = entries?.filter((e) => e.type === "income").reduce((acc, e) => acc + Number(e.amount), 0) ?? 0
  const expense = entries?.filter((e) => e.type === "expense").reduce((acc, e) => acc + Number(e.amount), 0) ?? 0
  const balance = income - expense

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresos, egresos y balance</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/accounting/new?type=income"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Ingreso
          </Link>
          <Link
            href="/app/accounting/new?type=expense"
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Egreso
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-600 mb-1">Ingresos</p>
          <p className="text-2xl font-bold text-green-700">${income.toLocaleString("es-CO")}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-red-600 mb-1">Egresos</p>
          <p className="text-2xl font-bold text-red-700">${expense.toLocaleString("es-CO")}</p>
        </div>
        <div className={`rounded-xl p-5 border ${balance >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-sm mb-1 ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-700" : "text-red-700"}`}>
            ${Math.abs(balance).toLocaleString("es-CO")}
          </p>
        </div>
      </div>

      {!entries?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin movimientos</h3>
          <p className="text-gray-500 text-sm">Registra ingresos y egresos para llevar tu contabilidad</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{new Date(entry.date).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {(entry.accounting_categories as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {entry.type === "income" ? "Ingreso" : "Egreso"}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    entry.type === "income" ? "text-green-700" : "text-red-700"
                  }`}>
                    {entry.type === "income" ? "+" : "-"}${Number(entry.amount).toLocaleString("es-CO")}
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
