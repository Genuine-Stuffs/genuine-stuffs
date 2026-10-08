/**
 * Gap-free engine · Web Worker pool (browser).
 * Spreads each floor's seeded restarts over the device's cores; the plan is
 * the same as the sequential search's for the same seed (pickWinner). On
 * 4 cores a villa takes ~8 s instead of ~32 s on one.
 */
import type { SpatialProgram, SolvedLayout } from '../../../../../../supabase/functions/ai-studio/schema';
import type { PlotEnvelope, SolverOptions } from '../../types';
import { solveGapfreeAsync, AnnealResult, RestartBatch } from './solve';

/** Stands in for a restart that was skipped; never picked (pickWinner). */
const SKIPPED: AnnealResult = { expr: [], offs: [], cost: Infinity };

export function poolSize(): number {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    return Math.max(1, Math.min(8, cores));
}

/** Solve with a fresh pool; the workers are terminated when it settles. */
export async function solveGapfreeInPool(
    program: SpatialProgram, envelope: PlotEnvelope, options: SolverOptions, size = poolSize(),
): Promise<SolvedLayout> {
    const workers = Array.from({ length: size }, () =>
        new Worker(new URL('./anneal.worker.ts', import.meta.url), { type: 'module' }));
    const idle = [...workers];
    const queue: Array<() => void> = [];
    const pending = new Map<number, { resolve: (r: AnnealResult) => void; reject: (e: unknown) => void }>();
    let nextId = 0;
    let failed: unknown = null;
    for (const w of workers) {
        w.onmessage = (e: MessageEvent<{ id: number; r: AnnealResult }>) => {
            pending.get(e.data.id)?.resolve(e.data.r);
            pending.delete(e.data.id);
            idle.push(w);
            queue.shift()?.();
        };
        w.onerror = (e) => {
            failed = new Error(e.message || 'anneal worker failed');
            for (const p of pending.values()) p.reject(failed);
            pending.clear();
        };
    }
    const run = (spec: RestartBatch['spec'], seed: number, iters: number, sw: number, skip: () => boolean) => new Promise<AnnealResult>((resolve, reject) => {
        const go = () => {
            if (failed) return reject(failed);
            if (skip()) { resolve(SKIPPED); queue.shift()?.(); return; }
            const w = idle.pop()!, id = nextId++;
            pending.set(id, { resolve, reject });
            w.postMessage({ id, spec, seed, iters, sw });
        };
        if (idle.length) go(); else queue.push(go);
    });
    // Once restart k is perfect (cost 0) pickWinner can only choose k or an
    // earlier one, so restarts after k that haven't started are skipped.
    const runAll = (b: RestartBatch) => {
        let firstPerfect = Infinity;
        return Promise.all(b.seeds.map((seed, k) => run(b.spec, seed, b.iters, b.sw, () => k > firstPerfect)
            .then(r => { if (r.cost === 0) firstPerfect = Math.min(firstPerfect, k); return r; })));
    };
    try {
        return await solveGapfreeAsync(program, envelope, options, runAll);
    } finally {
        for (const w of workers) w.terminate();
    }
}
