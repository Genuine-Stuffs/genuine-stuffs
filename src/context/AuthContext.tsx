import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from 'backend/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

type Role = 'client' | 'professional' | 'vendor' | 'guest';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: Role;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
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
            setRole((session?.user?.user_metadata?.role as Role) || 'guest');
            setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            const userRole = (session?.user?.user_metadata?.role as Role) || 'guest';
            setRole(userRole);
            setIsLoading(false);

            // Handle post-verification redirection
            if (event === 'SIGNED_IN') {
                const hash = window.location.hash;
                const isVerification = hash.includes('type=signup') || hash.includes('type=recovery');

                if (isVerification) {
                    toast.success("Account verified successfully! Welcome to your dashboard.");

                    // Clear the hash to avoid re-triggering logic
                    window.history.replaceState(null, '', window.location.pathname);

                    if (userRole === 'professional') {
                        navigate('/pro-portal');
                    } else if (userRole === 'vendor') {
                        navigate('/vendor-dashboard');
                    }
                }
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

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, role, isLoading, signInWithGoogle, logout }}>
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
