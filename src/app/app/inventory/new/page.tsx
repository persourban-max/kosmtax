"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Category = { id: string; name: string }

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", sku: "", description: "", unit: "unidad", category_id: "",
    stock_current: "0", stock_minimum: "0", cost_price: "0", sale_price: "0", is_service: false,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from("inventory_categories").select("id, name").order("name")
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const supabase = createClient()
    const { data: tenantUser } = await supabase.from("tenant_users").select("tenant_id").eq("is_active", true).single()
    if (!tenantUser) {
      setAddingCat(false)
      return
    }
    const { data } = await supabase.from("inventory_categories").insert({
      name: newCatName.trim(),
      tenant_id: tenantUser.tenant_id,
    }).select().single()
    if (data) {
      setCategories((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
      set("category_id", data.id)
      setNewCatName("")
    }
    setAddingCat(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError("El nombre es obligatorio")
    setLoading(true)
    setError(null)
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/app/inventory/${data.id}`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/inventory" className="text-gray-400 hover:text-gray-600 text-sm">← Inventario</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuevo item</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>}

        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <input type="checkbox" id="is_service" checked={form.is_service}
            onChange={(e) => set("is_service", e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="is_service" className="text-sm font-medium text-blue-800 cursor-pointer">
            Es un servicio (no tiene stock físico)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Tela algodón 200g" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
            <input type="text" value={form.sku} onChange={(e) => set("sku", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SKU-001" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripción opcional..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {["unidad", "metros", "kg", "litros", "caja", "rollo", "par", "yarda", "servicio"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2 mt-1.5">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button type="button" onClick={addCategory} disabled={addingCat || !newCatName.trim()}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                {addingCat ? "..." : "+ Agregar"}
              </button>
            </div>
          </div>
        </div>

        {!form.is_service && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
              <input type="number" value={form.stock_current} onChange={(e) => set("stock_current", e.target.value)} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
              <input type="number" value={form.stock_minimum} onChange={(e) => set("stock_minimum", e.target.value)} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio costo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} min="0" step="100"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio venta</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} min="0" step="100"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/app/inventory" className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {loading ? "Creando..." : "Crear item"}
          </button>
        </div>
      </form>
    </div>
  )
}
