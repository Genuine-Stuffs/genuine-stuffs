/**
 * Gap-free engine · one annealing restart per message (browser pool).
 * Restarts are fully seeded, so a worker returns exactly what the
 * sequential search would (gapfree/solve.ts pickWinner).
 *
 * In:  { id, spec, seed, iters, sw, spineA?, warm? }   Out: { id, r: { expr, offs, cost, spine? } }
 */
import type { FloorSpec, WarmStart } from './slice';
import { runRestart } from './solve';

self.onmessage = (e: MessageEvent<{ id: number; spec: FloorSpec; seed: number; iters: number; sw: number; spineA?: number; warm?: WarmStart }>) => {
    const { id, spec, seed, iters, sw, spineA, warm } = e.data;
    self.postMessage({ id, r: runRestart(spec, seed, iters, sw, spineA, warm) });
};
