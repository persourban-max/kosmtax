"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Customer = { id: string; full_name: string }
type WorkOrder = { id: string; order_number: string; title: string }

export default function NewDocumentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "", type: "technical_sheet", customer_id: "", work_order_id: "",
    material: "", color: "", measurements: "", quantity: "", specifications: "", delivery_date: "",
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("customers").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("work_orders").select("id, order_number, title").in("status", ["pending", "in_progress"]).order("created_at", { ascending: false }),
    ]).then(([{ data: c }, { data: o }]) => {
      setCustomers(c ?? [])
      setOrders(o ?? [])
    })
  }, [])

  function set(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return setError("El título es obligatorio")
    setLoading(true)
    setError(null)

    const content = {
      material: form.material, color: form.color, measurements: form.measurements,
      quantity: form.quantity, specifications: form.specifications, delivery_date: form.delivery_date,
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, type: form.type,
        customer_id: form.customer_id || null, work_order_id: form.work_order_id || null,
        content,
      }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error || "Error al crear el documento"); setLoading(false); return }
    router.push(`/app/documents/${data.id}`)
  }

  const docTypes: Record<string, string> = {
    technical_sheet: "Ficha técnica",
    service_record: "Historial de servicio",
    quote: "Cotización",
    invoice: "Factura / Recibo",
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/documents" className="text-gray-400 hover:text-gray-600 text-sm">← Documentos</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuevo documento</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Ficha técnica camiseta polo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {Object.entries(docTypes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin cliente</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orden de trabajo</label>
            <select value={form.work_order_id} onChange={(e) => set("work_order_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin orden</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number} – {o.title}</option>)}
            </select>
          </div>
        </div>

        {form.type === "technical_sheet" && (
          <>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Especificaciones técnicas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Material / Tela</label>
                  <input type="text" value={form.material} onChange={(e) => set("material", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Algodón 100%" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                  <input type="text" value={form.color} onChange={(e) => set("color", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Azul marino" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Medidas / Talla</label>
                  <input type="text" value={form.measurements} onChange={(e) => set("measurements", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: S, M, L, XL" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                  <input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de entrega</label>
                  <input type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Especificaciones adicionales</label>
                <textarea value={form.specifications} onChange={(e) => set("specifications", e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detalles adicionales del producto..." />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/app/documents" className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {loading ? "Creando..." : "Crear documento"}
          </button>
        </div>
      </form>
    </div>
  )
}
