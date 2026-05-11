import { createClient } from "@/lib/supabase/server"
import AdminSidebar from "@/components/admin/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL
  const isAdmin = user && (!ADMIN_EMAIL || user.email === ADMIN_EMAIL)

  // Sin sesión admin → renderizar sin shell (ej: página de login)
  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-[#0F172A] text-white">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-[#0F172A]">
        {children}
      </main>
    </div>
  )
}
