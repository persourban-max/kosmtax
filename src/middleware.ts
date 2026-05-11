import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Rutas del panel app que requieren autenticación
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

// Rutas del panel admin que requieren autenticación
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

  // Desarrollo local: usar ?subdomain=app|admin
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return url.searchParams.get("subdomain") || "landing"
  }

  // Producción: parsear subdominio desde el hostname
  // app.kosmtax.com → "app", admin.kosmtax.com → "admin"
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
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL

  // ── Panel Admin ───────────────────────────────────────────────
  if (subdomain === "admin") {
    const isLoginPage = pathname === "/admin/login" || pathname === "/login"

    // Reescribir rutas sin prefijo /admin → /admin/*
    if (!pathname.startsWith("/admin")) {
      url.pathname = `/admin${pathname === "/" ? "/dashboard" : pathname}`
    }

    const isProtected = ADMIN_PROTECTED_ROUTES.some((r) => url.pathname.startsWith(r))

    if (!isLoginPage) {
      // Sin sesión → redirigir al login
      if (!user && isProtected) {
        url.pathname = "/admin/login"
        url.searchParams.delete("error")
        return NextResponse.redirect(url)
      }

      // Con sesión pero no es el admin → redirigir con error
      if (user && ADMIN_EMAIL && user.email !== ADMIN_EMAIL && isProtected) {
        url.pathname = "/admin/login"
        url.searchParams.set("error", "not_admin")
        return NextResponse.redirect(url)
      }
    }

    // Si la ruta original no tenía prefijo /admin, hacer rewrite
    if (!pathname.startsWith("/admin")) {
      const rewriteResponse = NextResponse.rewrite(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })
      return rewriteResponse
    }

    return supabaseResponse
  }

  // ── Panel App ─────────────────────────────────────────────────
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

  // ── Landing (por defecto) ─────────────────────────────────────
  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
