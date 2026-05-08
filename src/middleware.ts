import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Routes that require auth in the app panel
const APP_PROTECTED_ROUTES = [
  "/dashboard",
  "/orders",
  "/production",
  "/inventory",
  "/clients",
  "/documents",
  "/accounting",
  "/settings",
]

// Routes that require auth in the admin panel
const ADMIN_PROTECTED_ROUTES = [
  "/admin/dashboard",
  "/admin/tenants",
  "/admin/support",
  "/admin/payments",
  "/admin/config",
]

function getSubdomain(request: NextRequest): string {
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

  // Local development: use searchParam ?subdomain=app|admin
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return url.searchParams.get("subdomain") || "landing"
  }

  // Production: parse subdomain from hostname
  // e.g. app.kosmtax.com → "app", admin.kosmtax.com → "admin"
  const parts = hostname.split(".")
  if (parts.length >= 3) {
    return parts[0]
  }

  return "landing"
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const subdomain = getSubdomain(request)
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // ── Admin subdomain ──────────────────────────────────────────
  if (subdomain === "admin") {
    // Rewrite /anything → /admin/anything
    if (!pathname.startsWith("/admin")) {
      url.pathname = `/admin${pathname === "/" ? "/dashboard" : pathname}`
      const rewriteResponse = NextResponse.rewrite(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })

      // Protect admin routes
      if (!user && ADMIN_PROTECTED_ROUTES.some((r) => url.pathname.startsWith(r))) {
        url.pathname = "/admin/login"
        return NextResponse.redirect(url)
      }

      return rewriteResponse
    }
  }

  // ── App subdomain ─────────────────────────────────────────────
  if (subdomain === "app") {
    if (!pathname.startsWith("/app")) {
      url.pathname = `/app${pathname === "/" ? "/dashboard" : pathname}`
      const rewriteResponse = NextResponse.rewrite(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })

      const isProtected = APP_PROTECTED_ROUTES.some((r) =>
        url.pathname.replace("/app", "").startsWith(r)
      )

      if (!user && isProtected) {
        const loginUrl = new URL("/app/login", request.url)
        loginUrl.searchParams.set("next", pathname)
        return NextResponse.redirect(loginUrl)
      }

      return rewriteResponse
    }
  }

  // ── Landing (default) ────────────────────────────────────────
  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
