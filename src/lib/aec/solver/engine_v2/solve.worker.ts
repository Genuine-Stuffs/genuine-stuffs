/**
 * Runs solveLayoutV2() off the main thread. A villa takes ~9 s before it
 * falls back to a compromise plan, and on the main thread that froze the
 * whole page for as long.
 *
 * In:  { program, envelope, options } — solveLayoutV2's arguments.
 * Out: { ok: true, layout } or { ok: false, message }.
 */
import { solveLayoutV2 } from './index';
import type { SpatialProgram } from '../../../../../supabase/functions/ai-studio/schema';
import type { PlotEnvelope, SolverOptions } from '../types';

interface SolveRequest { program: SpatialProgram; envelope: PlotEnvelope; options: SolverOptions }

self.onmessage = (e: MessageEvent<SolveRequest>) => {
    try {
        const { program, envelope, options } = e.data;
        self.postMessage({ ok: true, layout: solveLayoutV2(program, envelope, options) });
    } catch (err) {
        self.postMessage({ ok: false, message: err instanceof Error ? err.message : String(err) });
    }
};
