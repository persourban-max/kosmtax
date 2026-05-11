"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewProductionBoardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("El nombre es obligatorio")
    setLoading(true)
    setError(null)
    const res = await fetch("/api/production/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/app/production/${data.id}`)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/production" className="text-gray-400 hover:text-gray-600 text-sm">← Producción</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuevo tablero Kanban</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del tablero <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Producción Junio 2025" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe el propósito de este tablero..." />
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Se crearán 4 columnas automáticamente:</p>
          <div className="flex gap-2 flex-wrap mt-2">
            {[
              { name: "Por hacer", color: "#94A3B8" },
              { name: "En proceso", color: "#2563EB" },
              { name: "En revisión", color: "#F59E0B" },
              { name: "Listo", color: "#10B981" },
            ].map((col) => (
              <span key={col.name} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                {col.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/app/production" className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {loading ? "Creando..." : "Crear tablero"}
          </button>
        </div>
      </form>
    </div>
  )
}
