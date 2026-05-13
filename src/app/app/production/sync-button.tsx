"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SyncOrdersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/production/sync-orders", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setResult(`Error: ${data.error}`)
      } else if (data.created === 0) {
        setResult(data.message)
      } else {
        setResult(`✓ ${data.created} orden${data.created !== 1 ? "es" : ""} agregada${data.created !== 1 ? "s" : ""} a producción`)
        router.refresh()
      }
    } catch {
      setResult("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-sm px-3 py-1.5 rounded-lg ${result.startsWith("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {result}
        </span>
      )}
      <button
        onClick={sync}
        disabled={loading}
        className="bg-white border border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB] text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
        {loading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            ↻ Sincronizar órdenes
          </>
        )}
      </button>
    </div>
  )
}
