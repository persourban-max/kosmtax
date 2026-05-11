import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado", user: null })
  }

  const { data: tenantUsers, error: tuError } = await admin
    .from("tenant_users")
    .select("*, tenants(name, slug)")
    .eq("user_id", user.id)

  const { data: allTenantUsers } = await admin
    .from("tenant_users")
    .select("user_id, tenant_id, is_active, role")
    .limit(10)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    tenant_users: tenantUsers,
    tenant_users_error: tuError?.message,
    all_tenant_users_sample: allTenantUsers,
  })
}
