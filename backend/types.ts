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
          created_at: string
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
          created_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          company_name: string
          address: string
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
          address: string
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
          address?: string
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
          bio: string | null
          avatar_url: string | null
          is_verified: boolean
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
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          specialty?: string
          license_number?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
