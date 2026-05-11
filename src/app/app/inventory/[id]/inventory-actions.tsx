"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function InventoryActions({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ type: "in", quantity: "", notes: "" })

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!form.quantity || Number(form.quantity) <= 0) return setError("Cantidad debe ser mayor a 0")
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/inventory/${itemId}/movement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSaving(false)
    setForm({ type: "in", quantity: "", notes: "" })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Registrar movimiento</h2>
      <form onSubmit={handleMovement} className="space-y-3">
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="in">Entrada</option>
            <option value="out">Salida</option>
            <option value="adjustment">Ajuste de inventario</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label>
          <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Motivo del movimiento" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          {saving ? "Guardando..." : "Registrar"}
        </button>
      </form>
    </div>
  )
}
