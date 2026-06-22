import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { User, HardHat, Store, ShieldCheck, Crown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from 'backend/supabaseClient';
import Logo from '@/components/Logo';

const AdminHome = () => {
    const { serverClaims, switchEnvironmentView, logout, isLoading, user } = useAuth();
    const navigate = useNavigate();

    // Guard: Only admins should see this page.
    // We wait until auth has fully loaded before making any redirect decisions.
    // This prevents a race condition where the guard fires before app_metadata
    // has been extracted from the new session token.
    useEffect(() => {
        if (isLoading) return; // Still loading — do nothing yet
        
        if (!serverClaims.is_admin) {
            // Auth finished loading and user is NOT an admin — redirect.
            if (serverClaims.is_pm) {
                navigate("/pm-dashboard", { replace: true });
            } else {
                navigate("/", { replace: true });
            }
        }
    }, [serverClaims.is_admin, serverClaims.is_pm, isLoading, navigate]);

    // Always show a spinner while loading — never flash the guard redirect
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-slate-400 text-sm font-medium">Verifying admin credentials…</p>
                </div>
            </div>
        );
    }

    if (!serverClaims.is_admin) {
        return null; // useEffect will handle the redirect
    }

    const logEnvironmentEntry = async (env: string) => {
        if (!user) return;
        try {
            await supabase.from('audit_log').insert({
                actor_id: user.id,
                actor_email: user.email,
                action: 'ENVIRONMENT_ENTERED',
                environment: env,
                metadata: { timestamp: new Date().toISOString() }
            });
        } catch (e) {
            console.error("Audit log failed:", e);
        }
    };

    const handleSelectEnvironment = async (role: 'client' | 'professional' | 'vendor' | 'pm' | 'admin', route: string) => {
        switchEnvironmentView(role);
        await logEnvironmentEntry(role);
        navigate(route);
    };

    const environments = [
        {
            id: 'admin',
            title: 'Admin Master Control',
            description: 'Full system access and identity impersonation.',
            icon: Crown,
            role: 'admin' as const,
            route: '/pm-dashboard', // Admin uses PM dashboard but with elevated bypasses
            color: 'bg-red-600',
            textColor: 'text-red-600',
            hoverColor: 'hover:border-red-600',
            visible: serverClaims.is_admin
        },
        {
            id: 'pm',
            title: 'Product Manager',
            description: 'Marketplace moderation, vendor approval, and incident reports.',
            icon: ShieldCheck,
            role: 'pm' as const,
            route: '/pm-dashboard',
            color: 'bg-emerald-600',
            textColor: 'text-emerald-600',
            hoverColor: 'hover:border-emerald-600',
            visible: serverClaims.is_pm || serverClaims.is_admin
        },
        {
            id: 'pro',
            title: 'Professional Portal',
            description: 'AI Studio, project management, and client interaction.',
            icon: HardHat,
            role: 'professional' as const,
            route: '/pro-portal',
            color: 'bg-blue-600',
            textColor: 'text-blue-600',
            hoverColor: 'hover:border-blue-600',
            visible: true
        },
        {
            id: 'vendor',
            title: 'Vendor Dashboard',
            description: 'Material listings, inventory, and order fulfillment.',
            icon: Store,
            role: 'vendor' as const,
            route: '/vendor-dashboard',
            color: 'bg-amber-600',
            textColor: 'text-amber-600',
            hoverColor: 'hover:border-amber-600',
            visible: true
        },
        {
            id: 'client',
            title: 'Regular User',
            description: 'Standard marketplace and consumer experience.',
            icon: User,
            role: 'client' as const,
            route: '/',
            color: 'bg-slate-600',
            textColor: 'text-slate-600',
            hoverColor: 'hover:border-slate-600',
            visible: true
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0F1115] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-red-600/5 to-transparent pointer-events-none" />
            
            <div className="w-full max-w-5xl z-10 space-y-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-6">
                    <div className="flex justify-center mb-8">
                        <Logo iconClassName="h-14" textClassName="text-3xl dark:!text-white !text-slate-900" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
                            Select Environment
                        </h1>
                        <p className="text-sm text-slate-400 mt-2 font-medium italic">
                            Authenticated as CTO/Co-Founder. Where would you like to go?
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {environments.filter(env => env.visible).map((env) => (
                        <button
                            key={env.id}
                            onClick={() => handleSelectEnvironment(env.role, env.route)}
                            className={`group relative flex flex-col items-start p-8 text-left bg-white dark:bg-[#1a1d24] rounded-3xl border-2 border-transparent shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${env.hoverColor}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transition-transform group-hover:scale-110 ${env.color}`}>
                                <env.icon size={28} />
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${env.textColor}`}>
                                {env.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {env.description}
                            </p>
                        </button>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors px-6 py-3 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                        <LogOut size={16} /> Sign Out Securely
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
