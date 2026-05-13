import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import QuickOrderForm from "./quick-order-form"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().split("T")[0]

  const { count: activeOrders } = await supabase
    .from("work_orders").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"])

  const { count: totalCustomers } = await supabase
    .from("customers").select("*", { count: "exact", head: true }).eq("is_active", true)

  const { data: monthIncomeData } = await supabase
    .from("accounting_entries").select("amount").eq("type", "income").gte("date", monthStartStr)

  const { data: allInventory } = await supabase
    .from("inventory_items").select("id, name, stock_current, stock_minimum, unit").eq("is_active", true).eq("is_service", false)

  const { data: recentOrders } = await supabase
    .from("work_orders")
    .select("id, order_number, title, status, priority, price, created_at, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(8)

  const { data: customers } = await supabase
    .from("customers").select("id, full_name").eq("is_active", true).order("full_name")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: productionBoardsRaw } = await (supabase as any)
    .from("production_boards")
    .select("id, name, production_columns(id, name, color, position)")
    .eq("is_active", true)
    .order("created_at")
    .limit(3)

  type ProdBoard = { id: string; name: string; production_columns: { id: string; name: string; color: string; position: number }[] | null }
  const productionBoards = (productionBoardsRaw ?? []) as ProdBoard[]

  const totalMonthIncome = monthIncomeData?.reduce((s, e) => s + (e.amount ?? 0), 0) ?? 0
  const lowStock = allInventory?.filter((i) => i.stock_current <= i.stock_minimum) ?? []

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Bienvenido, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Órdenes activas" value={String(activeOrders ?? 0)} icon="📋" color="blue" href="/app/orders" />
        <MetricCard label="Clientes" value={String(totalCustomers ?? 0)} icon="👥" color="purple" href="/app/clients" />
        <MetricCard label="Ingresos del mes" value={`$${totalMonthIncome.toLocaleString("es-CO")}`} icon="💰" color="green" href="/app/accounting" />
        <MetricCard label="Alertas stock" value={String(lowStock.length)} icon={lowStock.length > 0 ? "⚠️" : "✅"} color={lowStock.length > 0 ? "amber" : "green"} href="/app/inventory" />
      </div>

      {/* Quick order form — Panel de Control */}
      <QuickOrderForm customers={customers ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Órdenes recientes</h2>
            <Link href="/app/orders" className="text-[#2563EB] text-xs hover:underline">Ver todas →</Link>
          </div>
          {!recentOrders?.length ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">Crea tu primera orden arriba</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs">N°</th>
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs">Título</th>
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs">Cliente</th>
                  <th className="text-left pb-2 font-medium text-gray-500 text-xs">Estado</th>
                  <th className="text-right pb-2 font-medium text-gray-500 text-xs">Precio</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-gray-400">{o.order_number}</td>
                    <td className="py-2.5">
                      <Link href={`/app/orders/${o.id}`} className="font-medium text-gray-900 hover:text-[#2563EB]">
                        {o.title}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {(o.customers as { full_name: string } | null)?.full_name ?? "—"}
                    </td>
                    <td className="py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="py-2.5 text-right text-gray-600 text-xs">
                      {o.price ? `$${Number(o.price).toLocaleString("es-CO")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Production boards summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Producción</h2>
              <Link href="/app/production" className="text-[#2563EB] text-xs hover:underline">Ver tableros →</Link>
            </div>
            {!productionBoards.length ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-2xl mb-1">🏭</div>
                <p className="text-xs">Las órdenes creadas aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {productionBoards.map((board) => {
                  const cols = board.production_columns ?? []
                  const sortedCols = [...cols].sort((a, b) => a.position - b.position)
                  return (
                    <div key={board.id}>
                      <Link href={`/app/production/${board.id}`} className="text-sm font-medium text-gray-800 hover:text-[#2563EB]">
                        {board.name}
                      </Link>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {sortedCols.map((col) => (
                          <span key={col.id} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-0.5 border border-gray-100">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                            {col.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Stock alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Alertas de inventario</h2>
              <Link href="/app/inventory" className="text-[#2563EB] text-xs hover:underline">Ver →</Link>
            </div>
            {lowStock.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-xs">Todo el stock OK</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate flex-1">{item.name}</span>
                    <span className="text-red-500 font-semibold ml-2 shrink-0">
                      {item.stock_current}/{item.stock_minimum} {item.unit}
                    </span>
                  </div>
                ))}
                {lowStock.length > 4 && (
                  <Link href="/app/inventory" className="text-xs text-amber-600 hover:underline">
                    +{lowStock.length - 4} más con stock bajo...
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color, href }: {
  label: string; value: string; icon: string; color: string; href: string
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-base w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color] ?? "bg-gray-50"}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </Link>
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
