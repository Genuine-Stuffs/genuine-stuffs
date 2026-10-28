import { useState } from "react";
import { supabase } from "backend/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runningBundle } from "@/lib/appVersion";
import { toast } from "sonner";
import { ClipboardCheck, Loader2 } from "lucide-react";

/**
 * "Review this design": a hired professional scores the plan on screen against
 * real-world practice. The review is saved with the prompts, the brief, the
 * seed and the plan exactly as shown (design_reviews), so every finding can be
 * redrawn and measured against.
 */

export const REVIEW_CRITERIA = [
    { key: 'room_sizes', label: 'Room sizes and dimensions', hint: 'Rooms usable at the sizes drawn; dimensions add up' },
    { key: 'layout_flow', label: 'Layout and movement', hint: 'Rooms next to the right rooms; halls, privacy, noise' },
    { key: 'code_compliance', label: 'Building code and planning rules', hint: 'NBC 2006, Lagos 2019 setbacks, coverage, parking' },
    { key: 'structure', label: 'Structure', hint: 'Column grid, spans, beams, walls over walls below' },
    { key: 'openings', label: 'Doors, windows and ventilation', hint: 'Door swings, window sizes, cross-ventilation, light' },
    { key: 'stairs_exits', label: 'Stairs, exits and access', hint: 'Risers and goings, escape routes, wheelchair access' },
    { key: 'services', label: 'Services (plumbing, power)', hint: 'Wet rooms stacked, tank, generator, meter, refuse' },
    { key: 'drawings', label: 'Drawing quality', hint: 'Dimensions, labels, symbols, scale; could a builder read it?' },
    { key: 'elevations_3d', label: 'Elevations, section and 3D', hint: 'Do they match the plan and each other?' },
    { key: 'quantities', label: 'Bill of quantities', hint: 'Quantities and prices close to real Lagos figures' },
] as const;

export const VERDICTS = [
    { key: 'site_ready', label: 'Ready for permit drawings as is' },
    { key: 'minor_fixes', label: 'Usable with minor fixes' },
    { key: 'major_revision', label: 'Needs major revision' },
    { key: 'not_usable', label: 'Not usable' },
] as const;

type Score = number | null;

interface DesignReviewPanelProps {
    userId: string;
    userEmail?: string | null;
    discipline: string | null;
    /** the user's messages in this conversation, in order */
    prompts: string[];
    designPackage: any;
    /** the plan on screen (the chosen layout option) */
    layout: any;
}

const DesignReviewPanel = ({ userId, userEmail, discipline, prompts, designPackage, layout }: DesignReviewPanelProps) => {
    const [scores, setScores] = useState<Record<string, Score>>({});
    const [verdict, setVerdict] = useState<string | null>(null);
    const [topIssue, setTopIssue] = useState("");
    const [comments, setComments] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    const submit = async () => {
        if (!verdict) { toast.error("Choose an overall verdict first."); return; }
        setSaving(true);
        try {
            const { error } = await (supabase as any).from('design_reviews').insert({
                reviewer_id: userId,
                reviewer_email: userEmail ?? null,
                discipline,
                verdict,
                scores: Object.fromEntries(REVIEW_CRITERIA.map(c => [c.key, scores[c.key] ?? null])),
                top_issue: topIssue.trim() || null,
                comments: comments.trim() || null,
                prompts,
                building_type: designPackage?.brief_reference?.use_type ?? designPackage?.unsupported?.kind ?? null,
                solver_status: layout?.solver_status ?? null,
                plan: {
                    brief_reference: designPackage?.brief_reference ?? null,
                    rooms: designPackage?.rooms ?? null,
                    setback: designPackage?.setback ?? null,
                    solve_request: designPackage?.solveRequest ?? null,
                    unsupported: designPackage?.unsupported ?? null,
                    solved_layout: layout ?? null,
                },
                app_build: runningBundle(),
            });
            if (error) throw error;
            toast.success("Review saved. Thank you.");
            setSavedCount(n => n + 1);
            setScores({}); setVerdict(null); setTopIssue(""); setComments("");
        } catch (err: any) {
            console.error("Review save failed:", err);
            toast.error(err?.message || "The review could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <details className="group rounded-2xl border-2 border-primary/30 overflow-hidden" open>
            <summary className="flex items-center justify-between px-6 py-4 bg-primary/5 cursor-pointer list-none">
                <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Review this design</span>
                    {savedCount > 0 && <span className="text-[10px] font-bold text-emerald-600">{savedCount} saved</span>}
                </div>
            </summary>
            <div className="px-6 py-5 bg-white dark:bg-black/20 space-y-5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Score the plan shown above against what you would accept in practice. 1 = unacceptable, 3 = acceptable with changes, 5 = what you would draw yourself. Choose "N/A" for anything outside your field. The prompt and plan are saved with your review.
                </p>

                <div className="space-y-3">
                    {REVIEW_CRITERIA.map(c => (
                        <div key={c.key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <div className="md:w-1/2">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{c.label}</p>
                                <p className="text-[11px] text-slate-400">{c.hint}</p>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {[1, 2, 3, 4, 5, null].map(v => {
                                    const active = c.key in scores && scores[c.key] === v;
                                    return (
                                        <button
                                            key={String(v)}
                                            type="button"
                                            onClick={() => setScores(s => ({ ...s, [c.key]: v }))}
                                            className={`h-8 min-w-8 px-2 rounded-lg border text-[11px] font-black transition-all ${active
                                                ? 'border-primary bg-primary text-white'
                                                : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-primary/40'}`}
                                        >
                                            {v ?? 'N/A'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Overall verdict</p>
                    <div className="flex flex-wrap gap-2">
                        {VERDICTS.map(v => (
                            <button
                                key={v.key}
                                type="button"
                                onClick={() => setVerdict(v.key)}
                                className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${verdict === v.key
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-primary/40'}`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">The single most important thing to fix</p>
                    <Textarea value={topIssue} onChange={e => setTopIssue(e.target.value)} rows={2} placeholder="e.g. The stair has 14 risers in 4 m: too steep for a house." />
                </div>
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Other comments (name rooms and floors where you can)</p>
                    <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={4} />
                </div>

                <Button onClick={submit} disabled={saving} className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save review'}
                </Button>
            </div>
        </details>
    );
};

export default DesignReviewPanel;
