import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    allowedRoles,
    redirectPath = '/login'
}) => {
  const { role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-slate-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    // Optionally trigger a toast to explain why they were redirected if they navigated directly
    toast.error("Access Restricted", {
        description: "You need a specialized account (Pro/Vendor) to access this feature."
    });
    
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
