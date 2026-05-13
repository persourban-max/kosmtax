"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Customer = { id: string; full_name: string }

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "" })
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [form, setForm] = useState({
    title: "",
    customer_id: "",
    description: "",
    priority: "normal",
    status: "pending",
    due_date: "",
    price: "",
    notes: "",
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from("customers").select("id, full_name").eq("is_active", true).order("full_name")
      .then(({ data }) => setCustomers(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleCreateCustomer() {
    if (!newCustomer.full_name.trim()) return
    setCreatingCustomer(true)
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = [...customers, { id: data.id, full_name: data.full_name }]
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      setCustomers(updated)
      set("customer_id", data.id)
      setShowNewCustomer(false)
      setNewCustomer({ full_name: "", phone: "", email: "" })
    }
    setCreatingCustomer(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return setError("El título es obligatorio")
    setLoading(true)
    setError(null)
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/app/orders/${data.id}`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Órdenes</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nueva orden</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
          <input
            type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Confección 50 camisetas talla M"
          />
        </div>

        {/* Cliente con opción de crear nuevo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Cliente</label>
            <button
              type="button"
              onClick={() => { setShowNewCustomer(!showNewCustomer); setNewCustomer({ full_name: "", phone: "", email: "" }) }}
              className="text-xs text-[#2563EB] hover:underline font-medium"
            >
              {showNewCustomer ? "← Seleccionar existente" : "+ Nuevo cliente"}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700">Crear nuevo cliente</p>
              <input
                type="text"
                value={newCustomer.full_name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre completo *"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Teléfono"
                />
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={creatingCustomer || !newCustomer.full_name.trim()}
                className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {creatingCustomer ? "Creando..." : "Crear y seleccionar cliente"}
              </button>
            </div>
          ) : (
            <select
              value={form.customer_id}
              onChange={(e) => set("customer_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Sin cliente asignado</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado inicial</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En proceso</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
          <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe los detalles del trabajo..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio / Valor</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} min="0" step="100"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notas solo visibles para el equipo..." />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
          <span>🏭</span>
          <span>Al crear la orden aparecerá automáticamente en el tablero de Producción.</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/app/orders" className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {loading ? "Creando..." : "Crear orden"}
          </button>
        </div>
      </form>
    </div>
  )
}
