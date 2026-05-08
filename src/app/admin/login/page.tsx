"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#2563EB]">KOSMTAX</span>
          <p className="text-gray-400 mt-2 text-sm">Panel de administración</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                placeholder="admin@kosmtax.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
