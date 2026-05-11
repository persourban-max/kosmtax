"use client"

import { useState } from "react"

interface Props {
  planId: string; planName: string; tenantId: string
  price: number; displayName: string; isRecommended?: boolean
}

export default function PlanCheckout({ planId, tenantId, price, displayName, isRecommended }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, tenant_id: tenantId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Error al crear preferencia")
      window.location.href = data.sandbox_init_point ?? data.init_point
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al procesar el pago")
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
      <button onClick={handleCheckout} disabled={loading}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
          isRecommended
            ? "bg-[#2563EB] hover:bg-blue-700 text-white"
            : "border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
        }`}>
        {loading ? "Procesando..." : `Suscribirse — $${price.toLocaleString("es-CO")}/mes`}
      </button>
    </div>
  )
}
