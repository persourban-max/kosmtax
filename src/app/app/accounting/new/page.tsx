"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Category = { id: string; name: string; type: string }

export default function NewAccountingEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    amount: "", description: "", date: today, category_id: "", reference: "", notes: "",
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from("accounting_categories").select("id, name, type").order("name")
      .then(({ data }) => setAllCategories(data ?? []))
  }, [])

  const filteredCategories = allCategories.filter((c) => c.type === form.type)

  function set(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) return setError("La descripción es obligatoria")
    if (!form.amount || Number(form.amount) <= 0) return setError("El monto debe ser mayor a 0")
    setLoading(true)
    setError(null)
    const res = await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push("/app/accounting")
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/accounting" className="text-gray-400 hover:text-gray-600 text-sm">← Contabilidad</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuevo registro</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>}

        {/* Type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button type="button" onClick={() => setForm((p) => ({ ...p, type: "income", category_id: "" }))}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${form.type === "income" ? "bg-green-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              ↑ Ingreso
            </button>
            <button type="button" onClick={() => setForm((p) => ({ ...p, type: "expense", category_id: "" }))}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${form.type === "expense" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              ↓ Egreso
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} min="0" step="100"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
          <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Pago cliente ABC por orden ORD-2024-001" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">N° de referencia / Factura</label>
          <input type="text" value={form.reference} onChange={(e) => set("reference", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="FAC-001 o número de recibo" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/app/accounting" className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className={`flex-1 ${form.type === "income" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm`}>
            {loading ? "Guardando..." : `Registrar ${form.type === "income" ? "ingreso" : "egreso"}`}
          </button>
        </div>
      </form>
    </div>
  )
}
