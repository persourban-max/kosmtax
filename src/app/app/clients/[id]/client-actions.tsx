"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ClientActions({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function deleteClient() {
    if (!confirm("¿Desactivar este cliente? No se eliminará su historial.")) return
    setDeleting(true)
    await fetch(`/api/clients/${clientId}`, { method: "DELETE" })
    router.push("/app/clients")
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Acciones</h2>
      <button onClick={deleteClient} disabled={deleting}
        className="w-full border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium py-2 rounded-lg transition-colors">
        {deleting ? "Desactivando..." : "Desactivar cliente"}
      </button>
    </div>
  )
}
