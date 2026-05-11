import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

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

  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return url.searchParams.get("subdomain") || "landing"
  }

  const parts = hostname.split(".")
  // Solo reconocer subdomains explícitos "app" y "admin"
  if (parts.length >= 3 && (parts[0] === "app" || parts[0] === "admin")) {
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
    // Normalizar ruta: /algo → /admin/algo
    const normalizedPath = pathname.startsWith("/admin")
      ? pathname
      : `/admin${pathname === "/" ? "/dashboard" : pathname}`

    const isLoginPage = normalizedPath === "/admin/login"
    const isProtected = ADMIN_PROTECTED_ROUTES.some((r) => normalizedPath.startsWith(r))
    const isAdmin = user && (!ADMIN_EMAIL || user.email === ADMIN_EMAIL)

    // Ya logueado como admin → no mostrar login, ir al dashboard
    if (isLoginPage && isAdmin) {
      url.pathname = "/admin/dashboard"
      url.searchParams.delete("error")
      return NextResponse.redirect(url)
    }

    // Ruta protegida sin sesión → login
    if (isProtected && !user) {
      url.pathname = "/admin/login"
      url.searchParams.delete("error")
      return NextResponse.redirect(url)
    }

    // Ruta protegida con sesión pero no es admin → login con error
    if (isProtected && user && ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
      url.pathname = "/admin/login"
      url.searchParams.set("error", "not_admin")
      return NextResponse.redirect(url)
    }

    // Rewrite si la ruta original no tenía prefijo /admin
    if (!pathname.startsWith("/admin")) {
      url.pathname = normalizedPath
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

  // ── Path-based routing (dominio único sin subdomains, ej: kosmtax.vercel.app) ──
  if (pathname.startsWith("/app")) {
    const isLoginPage = pathname === "/app/login" || pathname === "/app/register"
    const isProtected = !isLoginPage && APP_PROTECTED_ROUTES.some((r) =>
      pathname.replace("/app", "").startsWith(r)
    )

    if (isProtected && !user) {
      const loginUrl = new URL("/app/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isLoginPage && user) {
      url.pathname = "/app/dashboard"
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login"
    const isProtected = ADMIN_PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
    const isAdmin = user && (!ADMIN_EMAIL || user.email === ADMIN_EMAIL)

    if (isLoginPage && isAdmin) {
      url.pathname = "/admin/dashboard"
      url.searchParams.delete("error")
      return NextResponse.redirect(url)
    }
    if (isProtected && !user) {
      url.pathname = "/admin/login"
      url.searchParams.delete("error")
      return NextResponse.redirect(url)
    }
    if (isProtected && user && ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
      url.pathname = "/admin/login"
      url.searchParams.set("error", "not_admin")
      return NextResponse.redirect(url)
    }
  }

  // ── Landing ───────────────────────────────────────────────────
  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
