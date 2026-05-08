"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/tenants", label: "Clientes", icon: "🏢" },
  { href: "/admin/support", label: "Soporte", icon: "🎫" },
  { href: "/admin/payments", label: "Pagos", icon: "💳" },
  { href: "/admin/config", label: "Configuración", icon: "⚙️" },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white/5 border-r border-white/10 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-xl font-bold text-[#2563EB]">KOSMTAX</span>
        <div className="text-xs text-gray-500 mt-0.5">Admin Panel</div>
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
                  ? "bg-blue-600/20 text-[#2563EB]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </Link>
      </div>
    </aside>
  )
}
