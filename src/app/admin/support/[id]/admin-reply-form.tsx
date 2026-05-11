"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await fetch(`/api/admin/support/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setContent("")
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleReply} className="bg-white/5 border border-white/10 rounded-xl p-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">Responder como admin</label>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-500"
        placeholder="Escribe tu respuesta..." />
      <div className="flex justify-end mt-3">
        <button type="submit" disabled={loading || !content.trim()}
          className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? "Enviando..." : "Enviar respuesta"}
        </button>
      </div>
    </form>
  )
}
