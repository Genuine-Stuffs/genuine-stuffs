import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from 'backend/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

type Role = 'client' | 'professional' | 'vendor' | 'guest' | 'pm' | 'admin';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: Role;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signInWithOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    updateRole: (newRole: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<Role>('guest');
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Initial session check
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            
            // Priority: Manual override (Dev role) > Metadata role > Guest
            const devRole = localStorage.getItem('MI_DEV_ROLE') as Role;
            const userRole = devRole || (session?.user?.user_metadata?.role as Role) || 'guest';
            
            setRole(userRole);
            setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                // Explicitly clear all auth state immediately
                setUser(null);
                setSession(null);
                setRole('guest');
                localStorage.removeItem('MI_DEV_ROLE'); // Clear dev role on real logout
                setIsLoading(false);
                navigate("/");
            } else {
                setSession(session);
                setUser(session?.user ?? null);
                
                // Keep dev role if it exists, otherwise use metadata
                const devRole = localStorage.getItem('MI_DEV_ROLE') as Role;
                const userRole = devRole || (session?.user?.user_metadata?.role as Role) || 'guest';
                setRole(userRole);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`
            }
        });
        if (error) throw error;
    };

    const signInWithEmail = async (email: string, password: string) => {
        // Specialized Admin Bypass Login logic
        const isAdminEmail = email.toLowerCase().endsWith('.admin');
        const isAuthorizedAdmin = email.toLowerCase() === 'samuel.edu@aktok.com';
        const realEmail = isAdminEmail ? email.toLowerCase().replace('.admin', '') : email;

        const { error } = await supabase.auth.signInWithPassword({
            email: realEmail,
            password: password,
        });

        if (!error && (isAdminEmail || isAuthorizedAdmin)) {
            localStorage.setItem('MI_DEV_ROLE', 'admin');
            setRole('admin');
            return;
        }

        if (error) throw error;
    };

    const signInWithOtp = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        // Always force-clear local auth state FIRST, then attempt server-side signout.
        setUser(null);
        setSession(null);
        setRole('guest');
        localStorage.removeItem('MI_DEV_ROLE');

        // Attempt deletion of the server session (scope: 'local' avoids the 403 on stale sessions)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {
            // Silently ignore - state is already cleared above
        });

        navigate("/");
    };

    const updateRole = (newRole: Role) => {
        setRole(newRole);
        localStorage.setItem('MI_DEV_ROLE', newRole);
        toast.info(`Session role switched to ${newRole.toUpperCase()}`);
    };

    return (
        <AuthContext.Provider value={{ user, session, role, isLoading, signInWithGoogle, signInWithEmail, signInWithOtp, logout, updateRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
