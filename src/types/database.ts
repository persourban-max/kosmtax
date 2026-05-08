export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlanType = 'trial' | 'basic' | 'pro' | 'full'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'
export type TenantRole = 'owner' | 'admin' | 'member'
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type AccountingType = 'income' | 'expense'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded'
export type MovementType = 'in' | 'out' | 'adjustment'

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          name: PlanType
          display_name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          modules: string[]
          limits: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          custom_domain: string | null
          brand_color: string
          vocabulary: Json
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string
          timezone: string
          is_active: boolean
          suspended_at: string | null
          suspension_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan_id: string
          status: SubscriptionStatus
          trial_starts_at: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          mp_subscription_id: string | null
          mp_payer_id: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          data_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      feature_flags: {
        Row: {
          id: string
          tenant_id: string
          module: string
          is_enabled: boolean
          enabled_by: string | null
          enabled_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['feature_flags']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['feature_flags']['Insert']>
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: TenantRole
          full_name: string | null
          avatar_url: string | null
          is_active: boolean
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenant_users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenant_users']['Insert']>
      }
      customers: {
        Row: {
          id: string
          tenant_id: string
          full_name: string
          document_type: string | null
          document_no: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          company_name: string | null
          notes: string | null
          tags: string[]
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      work_orders: {
        Row: {
          id: string
          tenant_id: string
          order_number: string
          customer_id: string | null
          title: string
          description: string | null
          status: OrderStatus
          priority: string
          assigned_to: string | null
          due_date: string | null
          started_at: string | null
          completed_at: string | null
          estimated_cost: number | null
          actual_cost: number | null
          price: number | null
          tags: string[]
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['work_orders']['Insert']>
      }
      work_order_items: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          inventory_item_id: string | null
          description: string
          quantity: number
          unit_cost: number
          unit_price: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_order_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['work_order_items']['Insert']>
      }
      production_boards: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          is_default: boolean
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['production_boards']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['production_boards']['Insert']>
      }
      production_columns: {
        Row: {
          id: string
          tenant_id: string
          board_id: string
          name: string
          color: string
          position: number
          wip_limit: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['production_columns']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['production_columns']['Insert']>
      }
      production_cards: {
        Row: {
          id: string
          tenant_id: string
          board_id: string
          column_id: string
          work_order_id: string | null
          title: string
          description: string | null
          position: number
          assigned_to: string | null
          due_date: string | null
          labels: string[]
          checklist: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['production_cards']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['production_cards']['Insert']>
      }
      inventory_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inventory_categories']['Insert']>
      }
      inventory_items: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          sku: string | null
          name: string
          description: string | null
          unit: string
          stock_current: number
          stock_minimum: number
          stock_maximum: number | null
          cost_price: number
          sale_price: number
          image_url: string | null
          is_active: boolean
          is_service: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['inventory_items']['Insert']>
      }
      inventory_movements: {
        Row: {
          id: string
          tenant_id: string
          item_id: string
          type: MovementType
          quantity: number
          stock_before: number
          stock_after: number
          unit_cost: number | null
          reference: string | null
          work_order_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_movements']['Row'], 'id' | 'created_at' | 'stock_before' | 'stock_after'>
        Update: never
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string | null
          customer_id: string | null
          type: string
          title: string
          content: Json
          file_url: string | null
          is_printed: boolean
          printed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      accounting_categories: {
        Row: {
          id: string
          tenant_id: string
          type: AccountingType
          name: string
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounting_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['accounting_categories']['Insert']>
      }
      accounting_entries: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          type: AccountingType
          amount: number
          description: string
          reference: string | null
          date: string
          work_order_id: string | null
          customer_id: string | null
          receipt_url: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounting_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['accounting_entries']['Insert']>
      }
      receipts: {
        Row: {
          id: string
          tenant_id: string
          receipt_number: string
          type: string
          customer_id: string | null
          work_order_id: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          total: number
          status: string
          issued_at: string | null
          due_date: string | null
          paid_at: string | null
          items: Json
          notes: string | null
          dian_cufe: string | null
          dian_status: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>
      }
      support_tickets: {
        Row: {
          id: string
          tenant_id: string | null
          user_id: string | null
          subject: string
          status: TicketStatus
          priority: TicketPriority
          assigned_to: string | null
          resolved_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['support_tickets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>
      }
      support_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string | null
          is_admin: boolean
          content: string
          attachments: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['support_messages']['Row'], 'id' | 'created_at'>
        Update: never
      }
      payments: {
        Row: {
          id: string
          tenant_id: string
          subscription_id: string | null
          plan_id: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          mp_external_reference: string | null
          status: PaymentStatus
          amount: number
          currency: string
          payment_method: string | null
          period_start: string | null
          period_end: string | null
          mp_raw: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Functions: {
      auth_tenant_id: { Returns: string }
      auth_is_tenant_admin: { Returns: boolean }
    }
  }
}
