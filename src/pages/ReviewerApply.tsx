import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "backend/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";

/**
 * Reviewer onboarding form, opened from the link shared in the reviewers'
 * WhatsApp group (/reviewers/apply?code=...). Submitting creates the login
 * with no AI Studio access; access starts when the admin approves the
 * application on /admin/reviews.
 */

export const DISCIPLINES = [
    { key: 'architect', label: 'Architect', body: 'ARCON' },
    { key: 'structural_engineer', label: 'Structural engineer', body: 'COREN' },
    { key: 'mep_engineer', label: 'Mechanical / electrical / plumbing engineer', body: 'COREN' },
    { key: 'quantity_surveyor', label: 'Quantity surveyor', body: 'QSRBN / NIQS' },
    { key: 'town_planner', label: 'Town planner', body: 'TOPREC / NITP' },
    { key: 'building_control', label: 'Building control officer', body: '' },
    { key: 'builder', label: 'Builder / contractor', body: 'CORBON / NIOB' },
    { key: 'other', label: 'Other', body: '' },
];

const EMPTY = {
    surname: '', other_names: '', email: '', phone: '', discipline: '', organisation: '',
    professional_body: '', registration_number: '', years_experience: '',
    location: '', portfolio_url: '', note: '', password: '', confirm: '', website: '',
};

export default function ReviewerApply() {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code') ?? '';
    const [form, setForm] = useState(EMPTY);
    const [agreed, setAgreed] = useState(false);
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState<{ existing: boolean } | null>(null);

    const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.surname.trim() || !form.other_names.trim() || !form.email.trim() || !form.phone.trim() || !form.discipline) {
            toast.error("Please fill in every field marked *."); return;
        }
        if (form.password.length < 8) { toast.error("Choose a password of at least 8 characters."); return; }
        if (form.password !== form.confirm) { toast.error("The two passwords are different."); return; }
        if (!agreed) { toast.error("Please accept the reviewer terms."); return; }
        setSending(true);
        try {
            const { confirm, ...fields } = form;
            // full_name too, for a server function deployed before surname / other names
            const { data, error } = await supabase.functions.invoke('reviewer-apply', { body: { code, ...fields, full_name: `${fields.other_names.trim()} ${fields.surname.trim()}` } });
            if (error) {
                const detail = await (error as any).context?.json?.().catch(() => null);
                throw new Error(detail?.error || error.message);
            }
            setDone({ existing: data?.existing === true });
        } catch (err: any) {
            toast.error(err.message || "The application could not be sent.");
        } finally {
            setSending(false);
        }
    };

    const body = DISCIPLINES.find(d => d.key === form.discipline)?.body;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-24 pb-20 px-4">
                <div className="max-w-2xl mx-auto">
                    {!code ? (
                        <div className="bg-white dark:bg-white/5 p-8 rounded-2xl border border-slate-100 dark:border-white/10 text-center space-y-3">
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Reviewer applications</h1>
                            <p className="text-sm text-slate-500">Please open the application link shared in the reviewers' group.</p>
                        </div>
                    ) : done ? (
                        <div className="bg-white dark:bg-white/5 p-8 rounded-2xl border border-slate-100 dark:border-white/10 text-center space-y-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Application received</h1>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Thank you. We will review your application and confirm in the reviewers' group when it is approved.
                                Then sign in with your email and {done.existing ? 'the password you already use on Genuine Stuffs' : 'the password you just chose'}: you will go straight to AI Studio.
                            </p>
                            <Button asChild variant="outline"><Link to="/login">Go to sign in</Link></Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-white/10 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-primary"><ClipboardCheck className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Design reviewers</span></div>
                                <h1 className="text-2xl font-black text-slate-800 dark:text-white">Become one of our pioneer reviewers/users</h1>
                                <p className="text-sm text-slate-500">
                                    AI Studio draws floor plans, elevations, sections, 3D views and bills of quantities from a written brief. As a reviewer you try it with real briefs and score each design against what you would accept in practice. Your access starts once we approve this application.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label>Surname *</Label><Input value={form.surname} onChange={set('surname')} autoComplete="family-name" /></div>
                                <div className="space-y-1.5"><Label>Other names *</Label><Input value={form.other_names} onChange={set('other_names')} autoComplete="given-name" placeholder="First and middle names" /></div>
                                <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></div>
                                <div className="space-y-1.5"><Label>Phone (WhatsApp) *</Label><Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+234 ..." /></div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label>Discipline *</Label>
                                    <select value={form.discipline} onChange={set('discipline')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        <option value="">Choose…</option>
                                        {DISCIPLINES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5"><Label>Professional body</Label><Input value={form.professional_body} onChange={set('professional_body')} placeholder={body || 'e.g. ARCON, COREN'} /></div>
                                <div className="space-y-1.5"><Label>Registration number</Label><Input value={form.registration_number} onChange={set('registration_number')} /></div>
                                <div className="space-y-1.5"><Label>Years in practice</Label><Input type="number" min={0} max={79} value={form.years_experience} onChange={set('years_experience')} /></div>
                                <div className="space-y-1.5"><Label>City / state</Label><Input value={form.location} onChange={set('location')} placeholder="e.g. Lekki, Lagos" /></div>
                                <div className="space-y-1.5"><Label>Firm or organisation</Label><Input value={form.organisation} onChange={set('organisation')} /></div>
                                <div className="space-y-1.5"><Label>Portfolio or LinkedIn link</Label><Input value={form.portfolio_url} onChange={set('portfolio_url')} placeholder="https://" /></div>
                                <div className="space-y-1.5 md:col-span-2"><Label>Anything we should know (optional)</Label><Textarea rows={3} value={form.note} onChange={set('note')} placeholder="e.g. the building types you design most" /></div>
                                <div className="space-y-1.5"><Label>Choose a password *</Label><Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="At least 8 characters" /></div>
                                <div className="space-y-1.5"><Label>Type it again *</Label><Input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
                                {/* left empty by people; bots fill it in */}
                                <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />
                            </div>
                            <p className="text-xs text-slate-400">If this email already has a Genuine Stuffs account, it keeps its current password: the one typed here is not used.</p>

                            <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1" />
                                <span>I will keep the designs and the tool confidential, review honestly from my professional experience, and understand that AI Studio's drawings are currently test outputs, and not approved drawings for construction yet.</span>
                            </label>

                            <Button type="submit" disabled={sending} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send application'}
                            </Button>
                        </form>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
