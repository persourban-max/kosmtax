export const PLANS = {
  TRIAL: "trial",
  BASIC: "basic",
  PRO: "pro",
  FULL: "full",
} as const

export type PlanType = (typeof PLANS)[keyof typeof PLANS]

export const PLAN_LIMITS = {
  trial: { orders: 50, customers: 50, products: 100, days: 7 },
  basic: { orders: 50, customers: 50, products: 100, days: null },
  pro: { orders: null, customers: null, products: null, days: null },
  full: { orders: null, customers: null, products: null, days: null },
} as const

export const MODULES = {
  DASHBOARD: "dashboard",
  ORDERS: "orders",
  PRODUCTION: "production",
  INVENTORY: "inventory",
  CUSTOMERS: "customers",
  DOCUMENTS: "documents",
  ACCOUNTING: "accounting",
} as const

export type ModuleType = (typeof MODULES)[keyof typeof MODULES]

export const PLAN_MODULES: Record<PlanType, ModuleType[]> = {
  trial: ["dashboard", "orders", "inventory", "customers"],
  basic: ["dashboard", "orders", "inventory", "customers"],
  pro: ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"],
  full: ["dashboard", "orders", "production", "inventory", "customers", "documents", "accounting"],
}

export const ORDER_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

export const TENANT_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const

export const SUBSCRIPTION_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
} as const

// Default vocabulary — tenants can override
export const DEFAULT_VOCABULARY = {
  order: "Orden de trabajo",
  orders: "Órdenes de trabajo",
  customer: "Cliente",
  customers: "Clientes",
  product: "Producto",
  products: "Productos",
}

export const SUBDOMAIN = {
  APP: "app",
  ADMIN: "admin",
  LANDING: "landing",
} as const
