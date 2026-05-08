"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const VOCABULARY_OPTIONS = [
  { label: "Taller / Confección", order: "Orden de producción", orders: "Órdenes de producción", customer: "Cliente", product: "Prenda" },
  { label: "Mecánica / Automotriz", order: "Orden de trabajo", orders: "Órdenes de trabajo", customer: "Cliente", product: "Repuesto" },
  { label: "Tecnología / IT", order: "Ticket / Proyecto", orders: "Tickets", customer: "Cliente", product: "Servicio" },
  { label: "Construcción", order: "Proyecto", orders: "Proyectos", customer: "Cliente", product: "Material" },
  { label: "Personalizado", order: "Orden", orders: "Órdenes", customer: "Cliente", product: "Producto" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: "",
    industry: 0,
    city: "",
    phone: "",
  })

  async function handleFinish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/app/login")
      return
    }

    const vocab = VOCABULARY_OPTIONS[form.industry]
    const slug = form.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      + "-" + Math.random().toString(36).slice(2, 6)

    // Create tenant
    const { data: tenant } = await supabase.from("tenants").insert({
      name: form.companyName || user.user_metadata?.company_name || "Mi Empresa",
      slug,
      email: user.email,
      phone: form.phone || null,
      city: form.city || null,
      vocabulary: {
        order: vocab.order,
        orders: vocab.orders,
        customer: vocab.customer,
        customers: vocab.customer + "s",
        product: vocab.product,
        products: vocab.product + "s",
      },
    }).select().single()

    if (!tenant) {
      setLoading(false)
      return
    }

    // Add user as owner
    await supabase.from("tenant_users").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "owner",
      full_name: user.user_metadata?.full_name || null,
    })

    // Create trial subscription
    const { data: plan } = await supabase.from("plans").select("id").eq("name", "trial").single()
    if (plan) {
      const trialStart = new Date()
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      await supabase.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan_id: plan.id,
        status: "trial",
        trial_starts_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })

      // Enable trial modules
      const trialModules = ["dashboard", "orders", "inventory", "customers"]
      await supabase.from("feature_flags").insert(
        trialModules.map((m) => ({
          tenant_id: tenant.id,
          module: m,
          is_enabled: true,
          enabled_at: new Date().toISOString(),
        }))
      )
    }

    router.push("/app/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#2563EB]">KOSMTAX</span>
          <p className="text-gray-500 mt-2">Configura tu espacio de trabajo</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${s <= step ? "bg-[#2563EB]" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Tu empresa</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mi Empresa SAS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bogotá"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+57 300 123 4567"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Continuar →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">¿A qué te dedicas?</h2>
              <p className="text-sm text-gray-500">Personalizamos el vocabulario del sistema para tu industria</p>
              <div className="space-y-2">
                {VOCABULARY_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setForm((p) => ({ ...p, industry: i }))}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.industry === i
                        ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {opt.label}
                    <span className={`block text-xs mt-0.5 ${form.industry === i ? "text-blue-400" : "text-gray-400"}`}>
                      Usa: {opt.order}, {opt.customer}, {opt.product}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {loading ? "Configurando..." : "Ingresar al panel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
