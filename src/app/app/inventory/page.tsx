import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: items } = await supabase
    .from("inventory_items")
    .select("*, inventory_categories(name)")
    .eq("is_active", true)
    .order("name")

  const lowStock = items?.filter((i) => i.stock_current <= i.stock_minimum) ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">{items?.length ?? 0} items · {lowStock.length} con stock bajo</p>
        </div>
        <Link
          href="/app/inventory/new"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo item
        </Link>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-700 text-sm font-medium">
            ⚠️ {lowStock.length} item{lowStock.length > 1 ? "s" : ""} con stock bajo o agotado
          </p>
          <ul className="mt-2 space-y-1">
            {lowStock.slice(0, 3).map((item) => (
              <li key={item.id} className="text-amber-600 text-xs">
                • {item.name}: {item.stock_current} {item.unit} (mín. {item.stock_minimum})
              </li>
            ))}
            {lowStock.length > 3 && (
              <li className="text-amber-500 text-xs">y {lowStock.length - 3} más...</li>
            )}
          </ul>
        </div>
      )}

      {!items?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin items en inventario</h3>
          <p className="text-gray-500 text-sm mb-4">Agrega insumos y productos para controlar tu stock</p>
          <Link href="/app/inventory/new" className="text-[#2563EB] text-sm hover:underline font-medium">
            Agregar primer item →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stock actual</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stock mín.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Precio venta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/app/inventory/${item.id}`} className="hover:text-[#2563EB]">
                      {item.name}
                    </Link>
                    {item.sku && <span className="block text-xs text-gray-400 font-normal">{item.sku}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(item.inventory_categories as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className={`px-4 py-3 font-medium ${item.stock_current <= item.stock_minimum ? "text-red-600" : "text-gray-900"}`}>
                    {item.stock_current} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.stock_minimum} {item.unit}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {item.sale_price ? `$${Number(item.sale_price).toLocaleString("es-CO")}` : "—"}
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
