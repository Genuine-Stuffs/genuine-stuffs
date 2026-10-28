import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { REVIEW_CRITERIA, VERDICTS } from "@/components/review/DesignReviewPanel";
import { DISCIPLINES } from "@/pages/ReviewerApply";
import { toast } from "sonner";
import { Copy, Download, Loader2 } from "lucide-react";

/**
 * Design reviewers (admin and PM only): the application link to share,
 * reviewer applications to approve or reject, access to end or restore, and
 * every review the approved reviewers save. Applications come from the
 * onboarding form (reviewer-apply); decisions go through manage-reviewers;
 * reviews come from design_reviews.
 */

const disciplineLabel = (k: string | null) => DISCIPLINES.find(d => d.key === k)?.label ?? k ?? '—';
const verdictLabel = (k: string) => VERDICTS.find(v => v.key === k)?.label ?? k;

const STATUS = {
    pending: { label: 'Waiting for approval', className: 'text-amber-600' },
    approved: { label: 'Approved', className: 'text-emerald-600' },
    rejected: { label: 'Rejected', className: 'text-red-600' },
    ended: { label: 'Access ended', className: 'text-slate-400' },
} as Record<string, { label: string; className: string }>;
const STATUS_ORDER = ['pending', 'approved', 'ended', 'rejected'];

type Action = 'approve' | 'reject' | 'revoke' | 'restore' | 'reset_password';
const CONFIRM: Partial<Record<Action, string>> = {
    approve: 'Approve this application? The reviewer gets AI Studio at their next sign-in.',
    reject: 'Reject this application? The person keeps a login with no AI Studio access.',
    revoke: "End this reviewer's access to AI Studio? Their reviews are kept.",
    reset_password: 'Set a new one-time password for this reviewer? Their current password stops working.',
};

const manage = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('manage-reviewers', { body });
    if (error) {
        // the function's own message, when it sent one
        const detail = await (error as any).context?.json?.().catch(() => null);
        throw new Error(detail?.error || error.message);
    }
    return data;
};

const download = (name: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
};

// "SURNAME, Other names" when the application has both (applications before 2026-10-28 have full_name only)
const displayName = (a: any) => a.surname ? `${String(a.surname).toUpperCase()}, ${a.other_names ?? ''}`.trim() : a.full_name;

// a phone number as wa.me wants it: digits with the country code (0803... -> 234803...), as manage-reviewers does
const waNumber = (phone: string): string | null => {
    let d = String(phone ?? '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = '234' + d.slice(1);
    if (d.length === 10 && /^[789]/.test(d)) d = '234' + d;
    return d.length >= 10 && d.length <= 15 ? d : null;
};

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied."); };

export default function DesignReviews() {
    const { serverClaims, isLoading } = useAuth();
    const allowed = serverClaims.is_admin || serverClaims.is_pm;

    const [applications, setApplications] = useState<any[]>([]);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    // `whatsapp`: a wa.me link with the message, when it still has to be sent by hand
    const [handover, setHandover] = useState<{ title: string; message: string; whatsapp?: string; notices?: string[] } | null>(null);
    const [open, setOpen] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, rows] = await Promise.all([
                manage({ action: 'list' }),
                (supabase as any).from('design_reviews').select('*').order('created_at', { ascending: false }),
            ]);
            setApplications(list?.applications ?? []);
            setInviteCode(list?.invite_code ?? null);
            if (rows.error) throw rows.error;
            setReviews(rows.data ?? []);
        } catch (err: any) {
            toast.error(err.message || "Could not load reviewers.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (allowed) load(); }, [allowed]);

    const loginUrl = `${window.location.origin}/reviewers/login`; // the reviewers' own sign-in, straight to AI Studio
    const applyLink = inviteCode ? `${window.location.origin}/reviewers/apply?code=${encodeURIComponent(inviteCode)}` : null;

    const act = async (action: Action, app: any) => {
        if (CONFIRM[action] && !window.confirm(`${displayName(app)} (${app.email})\n\n${CONFIRM[action]}`)) return;
        setBusy(app.id);
        try {
            const res = await manage({ action, id: app.id });
            const first = String(app.other_names || app.full_name).split(/\s+/)[0];
            if (action === 'reset_password') {
                setHandover({
                    title: 'Send this to the reviewer now. The password is shown only once and is not stored anywhere.',
                    message: `Hello ${first},\n\nYour Genuine Stuffs password has been reset.\n\nSign in at: ${loginUrl}\nEmail: ${app.email}\nPassword: ${res.password}\n\nPlease change it under Settings after you sign in.`,
                });
            } else if (action === 'approve' || action === 'restore') {
                // the server tells the reviewer by email and WhatsApp; anything it couldn't send is offered here
                const n = res.notices as { email: { sent: boolean; detail: string }; whatsapp: { sent: boolean; detail: string } } | null;
                const message = `Hello ${first},\n\nYour reviewer application for Genuine Stuffs AI Studio is approved.\n\nSign in at ${loginUrl} with ${app.email} and the password you chose when you applied (if you were already signed in, sign out and in again). You will go straight to AI Studio.\n\nUnder each design's drawings there is a "Review this design" panel: score it, name the most important fix, and press "Save review".\n\nThank you for being one of our pioneer reviewers.`;
                const phone = waNumber(app.phone);
                const allSent = !!n?.email.sent && !!n?.whatsapp.sent;
                if (allSent) toast.success(`Approved. ${first} was told by email and WhatsApp.`);
                setHandover(allSent ? null : {
                    title: 'Approved. Not every notice could be sent automatically: send the rest from here.',
                    message,
                    notices: n ? [n.email.detail, n.whatsapp.detail] : ['The server sent no notices.'],
                    whatsapp: !n?.whatsapp.sent && phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : undefined,
                });
            } else {
                toast.success(action === 'reject' ? 'Application rejected.' : 'Access ended.');
            }
            load();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setBusy(null);
        }
    };

    const sortedApplications = useMemo(() => [...applications].sort((a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        || String(b.created_at).localeCompare(String(a.created_at))), [applications]);
    const pendingCount = applications.filter(a => a.status === 'pending').length;

    // averages per criterion over the reviews that scored it
    const summary = useMemo(() => REVIEW_CRITERIA.map(c => {
        const vals = reviews.map(r => r.scores?.[c.key]).filter((v): v is number => typeof v === 'number');
        return { ...c, n: vals.length, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
    }), [reviews]);

    const exportCsv = () => {
        const head = ['date', 'reviewer', 'discipline', 'verdict', ...REVIEW_CRITERIA.map(c => c.key), 'top_issue', 'comments', 'building_type', 'solver_status', 'seed', 'first_prompt'];
        const lines = reviews.map(r => [
            r.created_at, r.reviewer_email, r.discipline, r.verdict,
            ...REVIEW_CRITERIA.map(c => r.scores?.[c.key] ?? ''),
            r.top_issue, r.comments, r.building_type, r.solver_status,
            r.plan?.solve_request?.options?.seed ?? '', r.prompts?.[0] ?? '',
        ].map(csvCell).join(','));
        download(`design-reviews-${new Date().toISOString().slice(0, 10)}.csv`, [head.join(','), ...lines].join('\n'), 'text/csv');
    };

    if (isLoading) return null;
    if (!allowed) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-4xl font-black mb-4 text-red-500">Access Denied</h1>
                    <p className="text-muted-foreground mb-8">Only the admin or the product manager can manage design reviewers.</p>
                    <Button asChild><Link to="/">Return to Home</Link></Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-24 pb-20">
                <div className="container max-w-6xl mx-auto px-4 space-y-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white">Design reviewers</h1>
                        <p className="text-sm text-slate-500 mt-1">Professionals apply from the link, you approve them, and they score AI Studio's designs against real-world practice.</p>
                    </div>

                    {/* The link to share */}
                    <section className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/10 space-y-3">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">Application link</h2>
                        {applyLink ? (
                            <>
                                <p className="text-sm text-slate-500">Share this in the reviewers' WhatsApp group. Anyone with it can apply; nobody gets AI Studio until you approve them below.</p>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-black/30 p-3 rounded-lg break-all">{applyLink}</code>
                                    <Button variant="outline" onClick={() => copy(applyLink)}><Copy className="w-4 h-4 mr-2" />Copy link</Button>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">{loading ? 'Loading…' : 'Applications are closed: the REVIEWER_INVITE_CODE secret is not set on the server.'}</p>
                        )}
                    </section>

                    {handover && (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 space-y-2">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-100">{handover.title}</p>
                            {handover.notices?.map((d, i) => <p key={i} className="text-xs text-amber-900 dark:text-amber-100">• {d}</p>)}
                            <pre className="text-xs whitespace-pre-wrap bg-white dark:bg-black/30 p-3 rounded-lg">{handover.message}</pre>
                            <div className="flex gap-2">
                                {handover.whatsapp && (
                                    <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <a href={handover.whatsapp} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => copy(handover.message)}><Copy className="w-3 h-3 mr-2" />Copy message</Button>
                                <Button size="sm" variant="ghost" onClick={() => setHandover(null)}>Done</Button>
                            </div>
                        </div>
                    )}

                    {/* Applications */}
                    <section className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/10 space-y-4">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">
                            Applications ({applications.length}){pendingCount > 0 && <span className="ml-2 text-sm text-amber-600">{pendingCount} waiting</span>}
                        </h2>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : applications.length === 0 ? (
                            <p className="text-sm text-slate-400">No applications yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {sortedApplications.map(app => (
                                    <div key={app.id} className="rounded-xl border border-slate-100 dark:border-white/10 p-4 space-y-2">
                                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                            <span className="font-black">{displayName(app)}</span>
                                            <span className="text-sm">{disciplineLabel(app.discipline)}</span>
                                            <span className={`text-xs font-bold ${STATUS[app.status]?.className ?? ''}`}>{STATUS[app.status]?.label ?? app.status}</span>
                                            <span className="text-xs text-slate-400">applied {new Date(app.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
                                            <span>Email: {app.email}</span>
                                            <span>Phone: {app.phone}</span>
                                            <span>Body / reg. no.: {[app.professional_body, app.registration_number].filter(Boolean).join(' ') || '—'}</span>
                                            <span>Years in practice: {app.years_experience ?? '—'}</span>
                                            <span>Firm: {app.organisation || '—'}</span>
                                            <span>Location: {app.location || '—'}</span>
                                            {app.portfolio_url && <span className="md:col-span-2 break-all">Portfolio: <a href={/^https?:\/\//.test(app.portfolio_url) ? app.portfolio_url : `https://${app.portfolio_url}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{app.portfolio_url}</a></span>}
                                            {app.note && <span className="md:col-span-2 whitespace-pre-wrap">Note: {app.note}</span>}
                                            <span className="text-xs text-slate-400">Last sign-in: {app.last_sign_in_at ? new Date(app.last_sign_in_at).toLocaleString() : 'never'} · reviews: {reviews.filter(r => r.reviewer_id === app.user_id).length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {busy === app.id ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <>
                                                {(app.status === 'pending' || app.status === 'rejected') && <Button size="sm" onClick={() => act('approve', app)}>Approve</Button>}
                                                {app.status === 'pending' && <Button size="sm" variant="outline" className="text-red-600" onClick={() => act('reject', app)}>Reject</Button>}
                                                {app.status === 'approved' && <Button size="sm" variant="outline" className="text-red-600" onClick={() => act('revoke', app)}>End access</Button>}
                                                {app.status === 'ended' && <Button size="sm" variant="outline" onClick={() => act('restore', app)}>Restore</Button>}
                                                {app.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => act('reset_password', app)}>New password</Button>}
                                            </>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Reviews */}
                    <section className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/10 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white">Reviews ({reviews.length})</h2>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={!reviews.length} onClick={exportCsv}><Download className="w-3 h-3 mr-2" />Spreadsheet (.csv)</Button>
                                <Button size="sm" variant="outline" disabled={!reviews.length} onClick={() => download(`design-reviews-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(reviews, null, 2), 'application/json')}>
                                    <Download className="w-3 h-3 mr-2" />With plans (.json)
                                </Button>
                            </div>
                        </div>

                        {reviews.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                {summary.map(c => (
                                    <div key={c.key} className="flex justify-between text-sm border-b border-slate-100 dark:border-white/10 py-1">
                                        <span>{c.label}</span>
                                        <span className="font-bold">{c.avg === null ? '—' : `${c.avg.toFixed(1)} / 5`} <span className="text-xs text-slate-400 font-normal">({c.n})</span></span>
                                    </div>
                                ))}
                                <div className="md:col-span-2 text-xs text-slate-500 pt-2">
                                    {VERDICTS.map(v => `${v.label}: ${reviews.filter(r => r.verdict === v.key).length}`).join(' · ')}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {reviews.map(r => (
                                <div key={r.id} className="rounded-xl border border-slate-100 dark:border-white/10">
                                    <button className="w-full text-left px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 items-baseline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                                        <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                                        <span className="font-bold text-sm">{r.reviewer_email}</span>
                                        <span className="text-xs">{disciplineLabel(r.discipline)}</span>
                                        <span className="text-xs font-bold text-primary">{verdictLabel(r.verdict)}</span>
                                        {r.top_issue && <span className="text-sm text-slate-600 dark:text-slate-300 basis-full">{r.top_issue}</span>}
                                    </button>
                                    {open === r.id && (
                                        <div className="px-4 pb-4 space-y-3 text-sm">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-slate-400">Prompt</p>
                                                {(r.prompts ?? []).map((p: string, i: number) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                                {REVIEW_CRITERIA.map(c => (
                                                    <div key={c.key} className="flex justify-between"><span>{c.label}</span><span className="font-bold">{r.scores?.[c.key] ?? 'N/A'}</span></div>
                                                ))}
                                            </div>
                                            {r.comments && <div><p className="text-[11px] uppercase tracking-wider text-slate-400">Comments</p><p className="whitespace-pre-wrap">{r.comments}</p></div>}
                                            <p className="text-xs text-slate-400">
                                                Plan: {r.solver_status ?? 'no plan'} · seed {r.plan?.solve_request?.options?.seed ?? '—'} · mode {r.plan?.solve_request?.options?.layoutMode ?? '—'} · build {r.app_build ?? 'dev'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
