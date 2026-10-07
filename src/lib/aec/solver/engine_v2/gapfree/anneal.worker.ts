/**
 * Gap-free engine · one annealing restart per message (browser pool).
 * Restarts are fully seeded, so a worker returns exactly what the
 * sequential search would (gapfree/solve.ts pickWinner).
 *
 * In:  { id, spec, seed, iters, sw }   Out: { id, r: { expr, offs, cost } }
 */
import { anneal, FloorSpec } from './slice';

self.onmessage = (e: MessageEvent<{ id: number; spec: FloorSpec; seed: number; iters: number; sw: number }>) => {
    const { id, spec, seed, iters, sw } = e.data;
    self.postMessage({ id, r: anneal(spec, seed, iters, sw) });
};
