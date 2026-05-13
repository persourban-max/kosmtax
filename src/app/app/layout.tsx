import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppSidebar from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  const admin = createAdminClient()
  const { data: tenantUser } = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!tenantUser) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
