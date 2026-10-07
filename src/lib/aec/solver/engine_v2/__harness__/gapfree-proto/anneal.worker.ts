// One annealing restart per message (PAR=n in run.ts). Restarts are fully
// seeded, so a worker returns exactly what the sequential loop would.
import { parentPort } from "worker_threads";
import { anneal } from "./slice";

parentPort!.on("message", (m: { id: number; spec: any; seed: number; iters: number; sw: number }) => {
    parentPort!.postMessage({ id: m.id, r: anneal(m.spec, m.seed, m.iters, m.sw) });
});
