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
    serverClaims: ServerClaims;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
    signInWithOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    switchEnvironmentView: (newRole: Role) => void;
}

// is_reviewer / reviewer_discipline: a hired professional testing AI Studio
// (set only when the admin approves an application: manage-reviewers)
type ServerClaims = { is_admin: boolean; is_pm: boolean; is_marketing: boolean; is_reviewer: boolean; reviewer_discipline: string | null };
const NO_CLAIMS: ServerClaims = { is_admin: false, is_pm: false, is_marketing: false, is_reviewer: false, reviewer_discipline: null };

// Server claims (from app_metadata) ALWAYS take priority over anything the client holds
const claimsOf = (user: User | null | undefined): ServerClaims => {
    const appMeta = user?.app_metadata || {};
    return {
        is_admin: appMeta.is_admin === true,
        is_pm: appMeta.is_pm === true,
        is_marketing: appMeta.is_marketing === true,
        is_reviewer: appMeta.is_reviewer === true,
        reviewer_discipline: appMeta.is_reviewer === true ? (appMeta.reviewer_discipline ?? null) : null,
    };
};

// Role resolution: server claims beat everything; a reviewer works as a professional.
// user_metadata.role is set during registration.
const roleOf = (user: User | null | undefined, claims: ServerClaims): Role => {
    if (claims.is_admin) return 'admin';
    if (claims.is_pm) return 'pm';
    if (claims.is_reviewer) return 'professional';
    return (user?.user_metadata?.role as Role) || 'guest';
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<Role>('guest');
    const [serverClaims, setServerClaims] = useState<ServerClaims>(NO_CLAIMS);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Initial session check
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            
            // MI_DEV_ROLE localStorage bypass has been removed (P6 security fix).
            const claims = claimsOf(session?.user);
            setServerClaims(claims);
            setRole(roleOf(session?.user, claims));
            setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                // Explicitly clear all auth state immediately
                setUser(null);
                setSession(null);
                setRole('guest');
                setServerClaims(NO_CLAIMS);
                setIsLoading(false);
                navigate("/");
            } else {
                setSession(session);
                setUser(session?.user ?? null);
                
                const claims = claimsOf(session?.user);
                setServerClaims(claims);
                setRole(roleOf(session?.user, claims));
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
            const claims = claimsOf(data.user);
            setServerClaims(claims);
            setRole(roleOf(data.user, claims));
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
        setServerClaims(NO_CLAIMS);

        // Attempt deletion of the server session (scope: 'local' avoids the 403 on stale sessions)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {
            // Silently ignore - state is already cleared above
        });

        navigate("/");
    };

    // switchEnvironmentView: allows admin/PM users to preview how the UI
    // renders for other roles. Gated by server claims — localStorage cannot
    // grant this capability. (MI_DEV_ROLE bypass removed — P6 security fix)
    const switchEnvironmentView = (newRole: Role) => {
        if (!serverClaims.is_admin && !serverClaims.is_pm && !serverClaims.is_marketing) {
            console.warn('[Auth] switchEnvironmentView blocked — not admin, PM, or marketing');
            return;
        }
        setRole(newRole);
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
