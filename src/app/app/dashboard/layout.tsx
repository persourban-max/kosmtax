import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AppSidebar from "@/components/app/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/app/login")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
