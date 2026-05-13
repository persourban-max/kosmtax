"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Customer = { id: string; full_name: string }

export default function QuickOrderForm({ customers: initialCustomers }: { customers: Customer[] }) {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "" })
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [form, setForm] = useState({
    title: "",
    customer_id: "",
    priority: "normal",
    price: "",
    description: "",
  })

  function setF(field: string, value: string) {
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
      setF("customer_id", data.id)
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
    setSuccess(null)

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "pending" }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setSuccess(`Orden ${data.order_number} creada y enviada a producción`)
    setForm({ title: "", customer_id: "", priority: "normal", price: "", description: "" })
    setShowNewCustomer(false)
    setLoading(false)

    // Refrescar la página para actualizar las métricas
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📋</span>
        <h2 className="font-semibold text-gray-900">Nueva orden rápida</h2>
        <span className="text-xs text-gray-400 ml-1">— Se envía automáticamente a Producción</span>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm mb-4 flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Título */}
        <input
          type="text"
          value={form.title}
          onChange={(e) => setF("title", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Título de la orden *  (ej: Confección 50 camisetas)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cliente */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Cliente</span>
              <button
                type="button"
                onClick={() => { setShowNewCustomer(!showNewCustomer); setNewCustomer({ full_name: "", phone: "", email: "" }) }}
                className="text-xs text-[#2563EB] hover:underline font-medium"
              >
                {showNewCustomer ? "← Existente" : "+ Nuevo cliente"}
              </button>
            </div>

            {showNewCustomer ? (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-2">
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
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Teléfono"
                  />
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={creatingCustomer || !newCustomer.full_name.trim()}
                  className="w-full bg-[#2563EB] text-white text-xs font-medium py-1.5 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {creatingCustomer ? "Creando..." : "Crear y seleccionar"}
                </button>
              </div>
            ) : (
              <select
                value={form.customer_id}
                onChange={(e) => setF("customer_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sin cliente</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Prioridad</div>
            <select
              value={form.priority}
              onChange={(e) => setF("priority", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Precio */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Precio</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setF("price", e.target.value)}
                min="0" step="100"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Descripción (opcional)</div>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detalles del trabajo..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Creando..." : "Crear orden → Producción"}
          </button>
          <a href="/app/orders/new" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            Formulario completo →
          </a>
        </div>
      </form>
    </div>
  )
}
