import { useQuery } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: vendorsCount },
        { count: pendingVendorsCount },
        { count: pendingProsCount },
        { count: materialsCount }
      ] = await Promise.all([
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('verified_status', 'pending'),
        supabase.from('professionals').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('materials').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalVendors: vendorsCount || 0,
        pendingVendors: pendingVendorsCount || 0,
        pendingPros: pendingProsCount || 0,
        totalMaterials: materialsCount || 0,
      };
    }
  });
};

export const usePendingVerifications = (type: 'vendor' | 'professional') => {
  const table = type === 'vendor' ? 'vendors' : 'professionals';
  const filterCol = type === 'vendor' ? 'verified_status' : 'is_verified';
  const filterVal = type === 'vendor' ? 'pending' : false;

  return useQuery({
    queryKey: ['pending-verifications', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(filterCol, filterVal)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
};

export const useListingReports = () => {
    return useQuery({
      queryKey: ['listing-reports'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('listing_reports')
          .select(`
            *,
            materials (name, image_url, vendor_name)
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      }
    });
  };
  
  export const usePendingMaterials = () => {
    return useQuery({
      queryKey: ['pending-materials'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('is_verified', false)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      }
    });
  };

