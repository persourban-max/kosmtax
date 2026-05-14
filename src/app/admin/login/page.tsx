"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff } from "lucide-react"

function ErrorFromUrl({ setError }: { setError: (e: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get("error") === "not_admin") {
      setError("Tu cuenta no tiene acceso al panel de administración.")
    }
  }, [searchParams, setError])
  return null
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos. Si olvidaste tu contraseña, usa el enlace de abajo."
          : authError.message
      )
      setLoading(false)
      return
    }

    router.push("/admin/dashboard")
    router.refresh()
  }

  async function handleResetPassword() {
    if (!email) {
      setError("Escribe tu correo primero para recuperar la contraseña.")
      return
    }
    setResetting(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/login`,
    })
    setResetting(false)
    if (resetError) {
      setError("Error al enviar el correo: " + resetError.message)
    } else {
      setResetSent(true)
      setError("")
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <ErrorFromUrl setError={setError} />
      </Suspense>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#2563EB]">KOSMTAX</span>
          <p className="text-gray-400 mt-2 text-sm">Panel de administración</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-white font-medium">Correo enviado</p>
              <p className="text-gray-400 text-sm">
                Revisa tu bandeja de entrada en <span className="text-white">{email}</span> y sigue el enlace para crear una nueva contraseña.
              </p>
              <button
                onClick={() => setResetSent(false)}
                className="text-[#2563EB] text-sm hover:underline"
              >
                ← Volver al login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  placeholder="admin@kosmtax.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting}
                className="w-full text-gray-400 hover:text-gray-200 text-sm py-1 transition-colors disabled:opacity-50"
              >
                {resetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
