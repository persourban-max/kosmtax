import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import InventoryActions from "./inventory-actions"

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: item } = await supabase
    .from("inventory_items")
    .select("*, inventory_categories(name)")
    .eq("id", params.id)
    .single()
  if (!item) notFound()

  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("item_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const category = item.inventory_categories as { name: string } | null
  const isLowStock = !item.is_service && item.stock_current <= item.stock_minimum

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/inventory" className="text-gray-400 hover:text-gray-600 text-sm">← Inventario</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
        {item.is_service && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">Servicio</span>}
        {isLowStock && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">⚠️ Stock bajo</span>}
      </div>

      {isLowStock && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-700 text-sm font-medium">
            ⚠️ Stock bajo: {item.stock_current} {item.unit} (mínimo: {item.stock_minimum} {item.unit})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Información</h2>
              <Link href={`/app/inventory/${item.id}/edit`} className="text-[#2563EB] text-sm hover:underline">Editar</Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {item.sku && <div><dt className="text-gray-500">SKU</dt><dd className="font-mono font-medium text-gray-900 mt-0.5">{item.sku}</dd></div>}
              <div><dt className="text-gray-500">Categoría</dt><dd className="font-medium text-gray-900 mt-0.5">{category?.name ?? "—"}</dd></div>
              <div><dt className="text-gray-500">Unidad</dt><dd className="font-medium text-gray-900 mt-0.5">{item.unit}</dd></div>
              <div><dt className="text-gray-500">Precio costo</dt><dd className="font-medium text-gray-900 mt-0.5">${Number(item.cost_price).toLocaleString("es-CO")}</dd></div>
              <div><dt className="text-gray-500">Precio venta</dt><dd className="font-medium text-gray-900 mt-0.5">${Number(item.sale_price).toLocaleString("es-CO")}</dd></div>
              {!item.is_service && (
                <>
                  <div><dt className="text-gray-500">Stock mínimo</dt><dd className="font-medium text-gray-900 mt-0.5">{item.stock_minimum} {item.unit}</dd></div>
                  {item.stock_maximum && <div><dt className="text-gray-500">Stock máximo</dt><dd className="font-medium text-gray-900 mt-0.5">{item.stock_maximum} {item.unit}</dd></div>}
                </>
              )}
            </dl>
            {item.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-500 mb-1">Descripción</dt>
                <dd className="text-sm text-gray-700">{item.description}</dd>
              </div>
            )}
          </div>

          {/* Movement history */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Historial de movimientos</h2>
            {!movements?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium text-gray-600">Fecha</th>
                    <th className="text-left pb-2 font-medium text-gray-600">Tipo</th>
                    <th className="text-right pb-2 font-medium text-gray-600">Cantidad</th>
                    <th className="text-right pb-2 font-medium text-gray-600">Stock final</th>
                    <th className="text-left pb-2 font-medium text-gray-600">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 text-gray-500">{new Date(m.created_at).toLocaleDateString("es-CO")}</td>
                      <td className="py-2.5"><MovBadge type={m.type} /></td>
                      <td className={`py-2.5 font-medium text-right ${m.type === "out" ? "text-red-600" : "text-green-600"}`}>
                        {m.type === "out" ? "-" : "+"}{m.quantity}
                      </td>
                      <td className="py-2.5 text-gray-700 text-right">{m.stock_after} {item.unit}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{m.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {!item.is_service && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Stock actual</h2>
              <div className={`text-4xl font-bold text-center py-4 rounded-lg ${isLowStock ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {item.stock_current}
                <span className="text-base font-normal text-gray-500 ml-1">{item.unit}</span>
              </div>
            </div>
          )}
          <InventoryActions itemId={item.id} />
        </div>
      </div>
    </div>
  )
}

function MovBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; class: string }> = {
    in: { label: "Entrada", class: "bg-green-100 text-green-700" },
    out: { label: "Salida", class: "bg-red-100 text-red-700" },
    adjustment: { label: "Ajuste", class: "bg-blue-100 text-blue-700" },
  }
  const s = map[type] ?? { label: type, class: "bg-gray-100 text-gray-600" }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>
}
