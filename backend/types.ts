export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      materials: {
        Row: {
          id: string
          name: string
          category: string
          price: number
          unit: string
          image_url: string | null
          description: string | null
          vendor_id: string | null
          vendor_name: string | null
          is_verified: boolean
          co2_footprint: string | null
          availability: 'In Stock' | 'Low Stock' | 'Out of Stock'
          tags: string[] | null
          rating: number | null
          views_count: number
          created_at: string
          is_sponsored: boolean
          sponsored_until: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          price: number
          unit: string
          image_url?: string | null
          description?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          is_verified?: boolean
          co2_footprint?: string | null
          availability?: 'In Stock' | 'Low Stock' | 'Out of Stock'
          tags?: string[] | null
          rating?: number | null
          views_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          price?: number
          unit?: string
          image_url?: string | null
          description?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          is_verified?: boolean
          co2_footprint?: string | null
          availability?: 'In Stock' | 'Low Stock' | 'Out of Stock'
          tags?: string[] | null
          rating?: number | null
          views_count?: number
          created_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          company_name: string
          address: string | null
          street_address: string | null
          city: string | null
          state: string | null
          country: string | null
          nationality: string | null
          personal_street_address: string | null
          personal_city: string | null
          personal_state: string | null
          cac_number: string
          phone: string | null
          categories: string[] | null
          verified_status: 'pending' | 'approved' | 'rejected'
          bio: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          company_name: string
          address?: string | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          nationality?: string | null
          personal_street_address?: string | null
          personal_city?: string | null
          personal_state?: string | null
          cac_number: string
          phone?: string | null
          categories?: string[] | null
          verified_status?: 'pending' | 'approved' | 'rejected'
          bio?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          address?: string | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          nationality?: string | null
          personal_street_address?: string | null
          personal_city?: string | null
          personal_state?: string | null
          cac_number?: string
          phone?: string | null
          categories?: string[] | null
          verified_status?: 'pending' | 'approved' | 'rejected'
          bio?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          id: string
          full_name: string
          specialty: string
          license_number: string | null
          phone: string | null
          street_address: string | null
          city: string | null
          state: string | null
          country: string | null
          nationality: string | null
          bio: string | null
          avatar_url: string | null
          is_verified: boolean
          credits: number
          subscription_status: 'trial' | 'active' | 'expired'
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          specialty: string
          license_number?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          credits?: number
          subscription_status?: 'trial' | 'active' | 'expired'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          specialty?: string
          license_number?: string | null
          phone?: string | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          nationality?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          credits?: number
          subscription_status?: 'trial' | 'active' | 'expired'
          created_at?: string
        }
        Relationships: []
      }
      pro_interactions: {
        Row: {
          id: string
          pro_id: string
          material_id: string | null
          vendor_id: string | null
          event_type: string
          created_at: string
        }
        Insert: {
          id?: string
          pro_id: string
          material_id?: string | null
          vendor_id?: string | null
          event_type: string
          created_at?: string
        }
        Update: {
          id?: string
          pro_id?: string
          material_id?: string | null
          vendor_id?: string | null
          event_type?: string
          created_at?: string
        }
        Relationships: []
      }
      listing_reports: {
        Row: {
          id: string
          material_id: string
          reporter_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          material_id: string
          reporter_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          reporter_id?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          client_id: string | null
          subtotal: number
          delivery_fee: number
          platform_fee: number
          total_amount: number
          payment_status: 'pending' | 'paid' | 'failed'
          payment_reference: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_state: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          subtotal: number
          delivery_fee?: number
          platform_fee?: number
          total_amount: number
          payment_status?: 'pending' | 'paid' | 'failed'
          payment_reference?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          subtotal?: number
          delivery_fee?: number
          platform_fee?: number
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'failed'
          payment_reference?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          created_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          material_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          vendor_id: string | null
          commission_rate: number
          commission_amount: number
          escrow_status: 'held' | 'released' | 'refunded'
          fulfillment_status: 'processing' | 'shipped' | 'delivered' | 'canceled'
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          material_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          vendor_id?: string | null
          commission_rate?: number
          commission_amount: number
          escrow_status?: 'held' | 'released' | 'refunded'
          fulfillment_status?: 'processing' | 'shipped' | 'delivered' | 'canceled'
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          material_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          vendor_id?: string | null
          commission_rate?: number
          commission_amount?: number
          escrow_status?: 'held' | 'released' | 'refunded'
          fulfillment_status?: 'processing' | 'shipped' | 'delivered' | 'canceled'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_material_views: {
        Args: { material_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
