import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

/**
 * The reviewers' own path (owner 2026-10-28): a reviewer sees the application
 * form, this sign-in, their status while they wait, and once approved only AI
 * Studio and their account, never the rest of the site. ReviewerGate keeps a
 * reviewer-only account on these pages.
 */

/** The page frame for reviewers: the logo and the content, no site menu, footer or bottom bar. */
export function ReviewerShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col">
            <header className="px-4 md:px-8 py-5 flex justify-center md:justify-start">
                <Logo iconClassName="h-10" textClassName="dark:!text-white !text-slate-900" />
            </header>
            <main className="flex-grow px-4 pb-16">
                <div className="max-w-2xl mx-auto">{children}</div>
            </main>
        </div>
    );
}

const card = "bg-white dark:bg-white/5 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-white/10";

/** Where a reviewer-only account may be, and where it goes otherwise. */
const APPROVED_PATHS = ['/pro/ai-studio', '/reviewers/account'];
const WAITING_PATHS = ['/reviewers/status'];
const OPEN_PATHS = ['/reviewers/apply', '/reviewers/login'];

/** Keeps a reviewer-only account on its own pages: AI Studio and its account once approved, its status before. */
export function ReviewerGate({ children }: { children: React.ReactNode }) {
    const { reviewerAccess, isLoading } = useAuth();
    const { pathname } = useLocation();
    if (isLoading || reviewerAccess === 'none' || OPEN_PATHS.includes(pathname)) return <>{children}</>;
    const allowed = reviewerAccess === 'approved' ? APPROVED_PATHS : WAITING_PATHS;
    if (!allowed.includes(pathname)) return <Navigate to={allowed[0]} replace />;
    return <>{children}</>;
}

/** /reviewers/login: the reviewers' sign-in, straight to AI Studio (or the status page while waiting). */
export function ReviewerLogin() {
    const { signInWithEmail, reviewerAccess, user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    // already signed in as a reviewer: where they belong
    if (!isLoading && user && reviewerAccess !== 'none') return <Navigate to={reviewerAccess === 'approved' ? '/pro/ai-studio' : '/reviewers/status'} replace />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const data = await signInWithEmail(email, password);
            const app = data?.user?.app_metadata ?? {};
            if (app.is_admin === true || app.is_pm === true) navigate('/admin/reviews');
            else if (app.is_reviewer === true) navigate('/pro/ai-studio');
            else navigate('/reviewers/status');
        } catch (err: any) {
            toast.error(err.message || "Sign-in failed.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <ReviewerShell>
            <form onSubmit={submit} className={`${card} space-y-5 max-w-md mx-auto`}>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Reviewer sign-in</h1>
                    <p className="text-sm text-slate-500 mt-1">Sign in with the email and password you used when you applied.</p>
                </div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
                <Button type="submit" disabled={busy || !email || !password} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
                </Button>
                <p className="text-xs text-slate-400">Forgotten your password? Ask in the reviewers' group and we will send you a new one.</p>
            </form>
        </ReviewerShell>
    );
}

/** /reviewers/status: a reviewer-only account that is not approved (waiting, rejected or ended) sees only this. */
export function ReviewerStatus() {
    const { user, signOutTo, isLoading } = useAuth();
    if (isLoading) return null;
    if (!user) return <Navigate to="/reviewers/login" replace />;
    const status = user.app_metadata?.reviewer_status ?? 'pending';
    const view = status === 'rejected'
        ? { icon: <XCircle className="w-12 h-12 text-red-600 mx-auto" />, title: 'Application not approved', text: 'Thank you for applying. Your application was not approved this time.' }
        : status === 'ended'
            ? { icon: <XCircle className="w-12 h-12 text-slate-400 mx-auto" />, title: 'Your reviewer access has ended', text: 'Thank you for your reviews. Ask in the reviewers\' group if you think this is a mistake.' }
            : { icon: <Clock className="w-12 h-12 text-amber-500 mx-auto" />, title: 'Waiting for approval', text: 'We have your application and will confirm by email and WhatsApp when it is approved. Then sign in again: you will go straight to AI Studio.' };
    return (
        <ReviewerShell>
            <div className={`${card} text-center space-y-4 max-w-md mx-auto`}>
                {view.icon}
                <h1 className="text-2xl font-black text-slate-800 dark:text-white">{view.title}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">{view.text}</p>
                <p className="text-xs text-slate-400">Signed in as {user.email}</p>
                <Button variant="outline" onClick={() => signOutTo('/reviewers/login')}>Sign out</Button>
            </div>
        </ReviewerShell>
    );
}

/** /reviewers/account: an approved reviewer changes their password or signs out; back to AI Studio. */
export function ReviewerAccount() {
    const { user, signOutTo, isLoading } = useAuth();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    if (isLoading) return null;
    if (!user) return <Navigate to="/reviewers/login" replace />;

    const change = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) { toast.error("Choose a password of at least 8 characters."); return; }
        if (password !== confirm) { toast.error("The two passwords are different."); return; }
        setBusy(true);
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) toast.error(error.message);
        else { toast.success("Password changed."); setPassword(""); setConfirm(""); }
    };

    return (
        <ReviewerShell>
            <div className={`${card} space-y-6 max-w-md mx-auto`}>
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Your reviewer account</h1>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                </div>
                <form onSubmit={change} className="space-y-3">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Change password</p>
                    <Input type="password" placeholder="New password (at least 8 characters)" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                    <Input type="password" placeholder="Type it again" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
                    <Button type="submit" disabled={busy} variant="outline">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change password'}</Button>
                </form>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                    <Button asChild><Link to="/pro/ai-studio">Back to AI Studio</Link></Button>
                    <Button variant="ghost" onClick={() => signOutTo('/reviewers/login')}>Sign out</Button>
                </div>
            </div>
        </ReviewerShell>
    );
}
