import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-2xl font-bold text-[#2563EB]">KOSMTAX</span>
        <div className="flex items-center gap-4">
          <Link href="/app/login" className="text-sm text-gray-300 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link
            href="/app/register"
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Prueba gratis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
          7 días gratis · Sin tarjeta de crédito
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Gestiona tu empresa<br />
          <span className="text-[#2563EB]">sin complicaciones</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          KOSMTAX centraliza órdenes de trabajo, inventario, producción,
          clientes y contabilidad en un solo panel. Adaptado a tu industria.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/app/register"
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Comenzar gratis
          </Link>
          <Link
            href="#features"
            className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Ver funciones
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Todo lo que necesitas</h2>
        <p className="text-gray-400 text-center mb-16">7 módulos integrados para gestionar tu operación completa</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#2563EB]/50 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Planes simples</h2>
        <p className="text-gray-400 text-center mb-16">Empieza gratis, escala cuando lo necesites</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 border ${
                p.featured
                  ? "bg-[#2563EB] border-blue-400"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <h3 className="font-bold text-xl mb-1">{p.name}</h3>
              <p className={`text-sm mb-4 ${p.featured ? "text-blue-100" : "text-gray-400"}`}>{p.description}</p>
              <div className="text-3xl font-bold mb-6">{p.price}</div>
              <ul className="space-y-2 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/app/register"
                className={`block text-center font-semibold py-3 rounded-xl transition-colors ${
                  p.featured
                    ? "bg-white text-[#2563EB] hover:bg-gray-100"
                    : "bg-[#2563EB] text-white hover:bg-blue-700"
                }`}
              >
                Comenzar
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 text-center text-gray-500 text-sm">
        <p>© 2024 KOSMTAX. Todos los derechos reservados.</p>
      </footer>
    </main>
  )
}

const FEATURES = [
  { icon: "📊", title: "Dashboard", description: "Métricas en tiempo real, gráfico de actividad, alertas de inventario y resumen del equipo." },
  { icon: "📋", title: "Órdenes de trabajo", description: "Crea, asigna y da seguimiento a cada orden. Estados: pendiente, en proceso, completado, cancelado." },
  { icon: "🏭", title: "Producción", description: "Vista tipo Kanban con columnas y tarjetas arrastrables para visualizar el flujo de trabajo." },
  { icon: "📦", title: "Inventario", description: "Controla insumos y productos. Alertas automáticas de stock mínimo vinculadas a órdenes." },
  { icon: "👥", title: "Clientes", description: "Registro completo con historial de órdenes, pagos y notas internas por cliente." },
  { icon: "🖨️", title: "Documentos", description: "Fichas técnicas, historial de servicio y órdenes imprimibles con logo de tu empresa." },
  { icon: "💰", title: "Contabilidad", description: "Ingresos y egresos, recibos internos imprimibles. Preparado para DIAN Colombia." },
]

const PLANS = [
  {
    name: "Básico",
    description: "Para empezar",
    price: "$49.900/mes",
    featured: false,
    features: ["Dashboard", "Órdenes (50/mes)", "Inventario (100 items)", "Clientes (50)"],
  },
  {
    name: "Pro",
    description: "El más popular",
    price: "$99.900/mes",
    featured: true,
    features: ["Todo lo básico", "Producción Kanban", "Documentos e impresión", "Contabilidad", "Sin límites"],
  },
  {
    name: "Full",
    description: "Para grandes equipos",
    price: "$199.900/mes",
    featured: false,
    features: ["Todo Pro", "White label", "Dominio propio", "Diseño personalizado", "Soporte prioritario"],
  },
]
