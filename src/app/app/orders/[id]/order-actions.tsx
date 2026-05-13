"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function OrderActions({
  orderId,
  currentStatus,
  currentPrice,
}: {
  orderId: string
  currentStatus: string
  currentPrice: number | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [price, setPrice] = useState(currentPrice ? String(currentPrice) : "")
  const [saving, setSaving] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [priceMsg, setPriceMsg] = useState<string | null>(null)

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

  async function updatePrice() {
    setSavingPrice(true)
    setPriceMsg(null)
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: price ? Number(price) : null }),
    })
    setSavingPrice(false)
    if (res.ok) {
      setPriceMsg("Valor guardado y registrado en contabilidad")
      router.refresh()
    } else {
      setPriceMsg("Error al guardar")
    }
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

      {/* Estado */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cambiar estado</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="pending">Pendiente</option>
          <option value="in_progress">En proceso</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button
          onClick={updateStatus}
          disabled={saving || status === currentStatus}
          className="w-full mt-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? "Guardando..." : "Actualizar estado"}
        </button>
      </div>

      {/* Valor */}
      <div className="border-t border-gray-100 pt-4">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Valor del servicio
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setPriceMsg(null) }}
            min="0"
            step="100"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={updatePrice}
          disabled={savingPrice}
          className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {savingPrice ? "Guardando..." : "Actualizar valor"}
        </button>
        {priceMsg ? (
          <p className={`text-xs mt-1 ${priceMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
            {priceMsg}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">
            Se registra automáticamente en contabilidad
          </p>
        )}
      </div>

      <button
        onClick={deleteOrder}
        disabled={deleting}
        className="w-full border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium py-2 rounded-lg transition-colors"
      >
        {deleting ? "Eliminando..." : "Eliminar orden"}
      </button>
    </div>
  )
}
