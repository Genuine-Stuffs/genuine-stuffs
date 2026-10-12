// Restart worker for the spine prototype: anneal(spec, a, seed, iters).
import { parentPort } from "worker_threads";
import { anneal } from "./run";
parentPort!.on("message", (m: { id: number; spec: any; a: number; seed: number; iters: number }) => parentPort!.postMessage({ id: m.id, r: anneal(m.spec, m.a, m.seed, m.iters) }));
