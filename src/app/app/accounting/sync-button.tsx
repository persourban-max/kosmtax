"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SyncOrdersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/accounting/sync-orders", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setResult(`Error: ${data.error}`)
      } else {
        setResult(data.synced === 0 ? "Todo sincronizado" : `${data.synced} orden(es) sincronizada(s)`)
        router.refresh()
      }
    } catch {
      setResult("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-sm text-gray-600">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Sincronizando..." : "Sincronizar órdenes"}
      </button>
    </div>
  )
}
