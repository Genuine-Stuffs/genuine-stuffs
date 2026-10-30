/**
 * Every plan AI Studio draws, saved with the words that asked for it (design_events table,
 * supabase/migrations/create_design_events_table.sql): the feasibility study's dataset of real
 * Nigerian prompts and edits (§9.1, §9.3). Saving never holds up or breaks the page: a failed
 * save (no table yet, offline) is logged once and dropped.
 */
import { supabase } from 'backend/supabaseClient';
import { runningBundle } from '@/lib/appVersion';

export type DesignEventKind = 'design' | 'edit' | 'replan' | 'option' | 'export';

export interface DesignEvent {
    userId: string;
    sessionId: string;
    kind: DesignEventKind;
    detail?: string;
    prompts: string[];
    designPackage: any;
    layout?: any;
}

let warned = false;

/** The brief a plan was solved from, without the plans AI Studio keeps on it: the solver hands back
 * the design package itself as the plan's program_reference, and the package holds that plan, so
 * the record would loop (JSON.stringify threw "Converting circular structure", 2026-10-29). */
export const briefOnly = (program: any) => {
    if (!program || typeof program !== 'object') return program ?? null;
    const { solvedLayout, solvedLayoutOptions, ...rest } = program;
    return rest;
};

/** The plan as a review or the design data saves it, so it can be redrawn exactly. */
export const planRecord = (designPackage: any, layout?: any) => {
    const solved = layout ?? designPackage?.solvedLayout ?? null;
    return {
        brief_reference: designPackage?.brief_reference ?? null,
        rooms: designPackage?.rooms ?? null,
        setback: designPackage?.setback ?? null,
        solve_request: designPackage?.solveRequest ?? null,
        unsupported: designPackage?.unsupported ?? null,
        solved_layout: solved && { ...solved, program_reference: briefOnly(solved.program_reference) },
    };
};

export function recordDesignEvent(e: DesignEvent): void {
    const layout = e.layout ?? e.designPackage?.solvedLayout;
    void (async () => {
        try {
            const { error } = await (supabase as any).from('design_events').insert({
                user_id: e.userId,
                session_id: e.sessionId,
                kind: e.kind,
                detail: e.detail ?? null,
                prompts: e.prompts,
                building_type: e.designPackage?.brief_reference?.use_type ?? e.designPackage?.unsupported?.kind ?? null,
                solver_status: layout?.solver_status ?? null,
                plan: planRecord(e.designPackage, layout),
                app_build: runningBundle(),
            });
            if (error) throw error;
        } catch (err) {
            if (!warned) { warned = true; console.warn('Design data not saved (design_events):', err); }
        }
    })();
}

/** A new conversation's id. */
export const newDesignSession = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
