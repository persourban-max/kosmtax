"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function OrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function updateStatus() {
    setSaving(true)
    await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setSaving(false)
    router.refresh()
  }

  async function deleteOrder() {
    if (!confirm("¿Eliminar esta orden? Esta acción no se puede deshacer.")) return
    setDeleting(true)
    await fetch(`/api/orders/${orderId}`, { method: "DELETE" })
    router.push("/app/orders")
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Acciones</h2>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cambiar estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="pending">Pendiente</option>
          <option value="in_progress">En proceso</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button onClick={updateStatus} disabled={saving || status === currentStatus}
          className="w-full mt-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          {saving ? "Guardando..." : "Actualizar estado"}
        </button>
      </div>
      <button onClick={deleteOrder} disabled={deleting}
        className="w-full border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium py-2 rounded-lg transition-colors">
        {deleting ? "Eliminando..." : "Eliminar orden"}
      </button>
    </div>
  )
}
