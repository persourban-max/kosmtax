"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/app/orders", label: "Órdenes", icon: "📋" },
  { href: "/app/production", label: "Producción", icon: "🏭" },
  { href: "/app/inventory", label: "Inventario", icon: "📦" },
  { href: "/app/clients", label: "Clientes", icon: "👥" },
  { href: "/app/documents", label: "Documentos", icon: "🖨️" },
  { href: "/app/accounting", label: "Contabilidad", icon: "💰" },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Sidebar — visible solo en desktop */}
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-200 flex-col h-full shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="text-xl font-bold text-[#2563EB]">KOSMTAX</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-[#2563EB]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link
            href="/app/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <span>⚙️</span> Configuración
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <span>🚪</span> Cerrar sesión
          </Link>
        </div>
      </aside>

      {/* Bottom nav — visible solo en móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors min-w-0",
                isActive
                  ? "text-[#2563EB]"
                  : "text-gray-500"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate w-full text-center leading-tight" style={{ fontSize: "10px" }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
