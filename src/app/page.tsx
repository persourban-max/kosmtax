// Landing page — kosmtax.com
// Full landing page content goes here in the (landing) route group
// This root page redirects or shows the landing based on subdomain middleware

import { redirect } from "next/navigation"

export default function RootPage() {
  // Middleware handles subdomain routing.
  // This page serves as fallback for the root domain.
  redirect("/landing")
}
