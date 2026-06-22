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
    serverClaims: { is_admin: boolean; is_pm: boolean };
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
    signInWithOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    switchEnvironmentView: (newRole: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<Role>('guest');
    const [serverClaims, setServerClaims] = useState({ is_admin: false, is_pm: false });
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Initial session check
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            
            // Server claims (from app_metadata) ALWAYS take priority over localStorage
            const appMeta = session?.user?.app_metadata || {};
            const is_admin = appMeta.is_admin === true;
            const is_pm = appMeta.is_pm === true;
            setServerClaims({ is_admin, is_pm });

            // Role resolution: server claims beat everything
            let userRole: Role;
            if (is_admin) userRole = 'admin';
            else if (is_pm) userRole = 'pm';
            else {
                const devRole = localStorage.getItem('MI_DEV_ROLE') as Role;
                userRole = devRole || (session?.user?.user_metadata?.role as Role) || 'guest';
            }
            
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
                setServerClaims({ is_admin: false, is_pm: false });
                localStorage.removeItem('MI_DEV_ROLE'); // Clear dev role on real logout
                setIsLoading(false);
                navigate("/");
            } else {
                setSession(session);
                setUser(session?.user ?? null);
                
                // Server claims ALWAYS take priority
                const appMeta = session?.user?.app_metadata || {};
                const is_admin = appMeta.is_admin === true;
                const is_pm = appMeta.is_pm === true;
                setServerClaims({ is_admin, is_pm });

                let userRole: Role;
                if (is_admin) userRole = 'admin';
                else if (is_pm) userRole = 'pm';
                else {
                    const devRole = localStorage.getItem('MI_DEV_ROLE') as Role;
                    userRole = devRole || (session?.user?.user_metadata?.role as Role) || 'guest';
                }
                
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
        // Standard email sign in - no secret suffix bypasses
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) throw error;
        
        // Synchronously update local state to prevent route-guard race conditions
        if (data?.session && data?.user) {
            setSession(data.session);
            setUser(data.user);
            const appMeta = data.user.app_metadata || {};
            setServerClaims({
                is_admin: appMeta.is_admin === true,
                is_pm: appMeta.is_pm === true
            });
        }
        
        return data;
    };

    const signInWithOtp = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
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
        setServerClaims({ is_admin: false, is_pm: false });
        localStorage.removeItem('MI_DEV_ROLE');

        // Attempt deletion of the server session (scope: 'local' avoids the 403 on stale sessions)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {
            // Silently ignore - state is already cleared above
        });

        navigate("/");
    };

    const switchEnvironmentView = (newRole: Role) => {
        setRole(newRole);
        localStorage.setItem('MI_DEV_ROLE', newRole);
        toast.info(`Environment view switched to ${newRole.toUpperCase()}`);
    };

    return (
        <AuthContext.Provider value={{ user, session, role, serverClaims, isLoading, signInWithGoogle, signInWithEmail, signInWithOtp, logout, switchEnvironmentView }}>
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
