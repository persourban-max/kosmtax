"use client"

import { useState } from "react"

export default function AdminTenantActions({
  tenantId, isActive
}: { tenantId: string; currentStatus: string; isActive: boolean }) {
  const [plan, setPlan] = useState("basic")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function doAction(action: string, extra?: Record<string, string>) {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg("✅ Acción aplicada correctamente")
      setTimeout(() => window.location.reload(), 800)
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Error"}`)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 sticky top-6">
      <h3 className="font-semibold text-white">Acciones de admin</h3>

      {msg && (
        <div className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✅") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-400">Cambiar plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="trial">Trial</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
          <option value="full">Full</option>
        </select>
        <button onClick={() => doAction("change_plan", { plan })} disabled={loading}
          className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Aplicar plan
        </button>
      </div>

      <button onClick={() => doAction("extend_trial", { days: "7" })} disabled={loading}
        className="w-full border border-white/20 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors">
        +7 días gratis
      </button>

      <button onClick={() => doAction("extend_trial", { days: "30" })} disabled={loading}
        className="w-full border border-white/20 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors">
        +30 días gratis
      </button>

      <div className="border-t border-white/10 pt-3">
        {isActive ? (
          <button onClick={() => doAction("suspend")} disabled={loading}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Suspender cuenta
          </button>
        ) : (
          <button onClick={() => doAction("reactivate")} disabled={loading}
            className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Reactivar cuenta
          </button>
        )}
      </div>
    </div>
  )
}
