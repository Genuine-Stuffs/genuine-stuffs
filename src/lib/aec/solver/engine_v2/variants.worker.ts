/**
 * Runs solveLayoutVariants() off the main thread. Collecting every
 * footprint that solves takes 0.2–4 s on ordinary briefs (vs. well under
 * a second for the first solution alone), which would freeze the page.
 *
 * In:  { program, envelope, options } — the same arguments solveLayoutV2 got.
 * Out: { ok: true, variants } sorted best-first, or { ok: false, message }.
 */
import { solveLayoutVariants } from './index';
import type { SpatialProgram } from '../../../../../supabase/functions/ai-studio/schema';
import type { PlotEnvelope, SolverOptions } from '../types';

interface VariantsRequest { program: SpatialProgram; envelope: PlotEnvelope; options: SolverOptions }

self.onmessage = (e: MessageEvent<VariantsRequest>) => {
    try {
        const { program, envelope, options } = e.data;
        const variants = solveLayoutVariants(program, envelope, options);
        self.postMessage({ ok: true, variants });
    } catch (err) {
        self.postMessage({ ok: false, message: err instanceof Error ? err.message : String(err) });
    }
};
