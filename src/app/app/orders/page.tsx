import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { redirect } from "next/navigation"
import OrdersTable from "./orders-table"

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/app/login")

  const admin = createAdminClient()
  const tenantResult = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
  const tenantRow = tenantResult.data as { tenant_id: string } | null
  if (!tenantRow) redirect("/app/onboarding")

  const tenantId = tenantRow.tenant_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersRaw } = await (admin as any)
    .from("work_orders")
    .select("*, customers(full_name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50)
  const orders = (ordersRaw ?? []) as Array<{
    id: string; order_number: string; title: string; status: string;
    created_at: string; customers: { full_name: string } | null
  }>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de trabajo</h1>
          <p className="text-gray-500 text-sm mt-1">{orders?.length ?? 0} órdenes</p>
        </div>
        <Link
          href="/app/orders/new"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva orden
        </Link>
      </div>

      {!orders?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin órdenes aún</h3>
          <p className="text-gray-500 text-sm mb-4">Crea tu primera orden de trabajo para empezar</p>
          <Link href="/app/orders/new" className="text-[#2563EB] text-sm hover:underline font-medium">
            Crear primera orden →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <OrdersTable orders={orders} />
        </div>
      )}
    </div>
  )
}
