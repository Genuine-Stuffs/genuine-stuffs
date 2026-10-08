import * as React from "react";

import type { SolvedLayout, SpatialProgram } from "../../supabase/functions/ai-studio/schema";
import type { PlotEnvelope, SolverOptions } from "@/lib/aec/solver/types";
import { solveLayoutV2 } from "@/lib/aec/solver/engine_v2";
import { solveGapfreeInPool } from "@/lib/aec/solver/engine_v2/gapfree/pool";

/** solveLayoutV2() in a Web Worker, so the page stays responsive while a
 * large brief solves (villas: ~9 s). Same arguments, same result. Where
 * workers aren't available it runs inline, as it did before. The gap-free
 * engine (layoutMode 'gapfree') runs on a pool of workers instead. */
export function solveLayoutInWorker(
  program: SpatialProgram, envelope: PlotEnvelope, options: SolverOptions,
): Promise<SolvedLayout> {
  if (typeof Worker === "undefined") return Promise.resolve(solveLayoutV2(program, envelope, options));
  // Gap-free engine: its restarts run on a pool of workers (one per core).
  // If the pool can't run, the single-worker path below solves the same
  // plan, just more slowly.
  if (options.layoutMode === "gapfree") {
    return solveGapfreeInPool(program, envelope, options).catch((err) => {
      console.warn("[SOLVER] worker pool failed, solving in one worker:", err);
      return solveInOneWorker(program, envelope, options);
    });
  }
  return solveInOneWorker(program, envelope, options);
}

function solveInOneWorker(
  program: SpatialProgram, envelope: PlotEnvelope, options: SolverOptions,
): Promise<SolvedLayout> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../lib/aec/solver/engine_v2/solve.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e: MessageEvent<{ ok: boolean; layout?: SolvedLayout; message?: string }>) => {
      worker.terminate();
      if (e.data.ok && e.data.layout) resolve(e.data.layout);
      else reject(new Error(e.data.message ?? "solver worker failed"));
    };
    // The worker itself failed (didn't load, or crashed outside the
    // solver): solve inline rather than lose the plan.
    worker.onerror = (e) => {
      worker.terminate();
      console.warn("[SOLVER] worker unavailable, solving on the main thread:", e.message);
      try { resolve(solveLayoutV2(program, envelope, options)); } catch (err) { reject(err); }
    };
    worker.postMessage({ program, envelope, options });
  });
}

/** Which layout engine AI Studio uses: `?layoutMode=free|gapfree|grid` in
 * the URL (side-by-side testing), else the VITE_LAYOUT_MODE build setting,
 * else the gap-free engine. It became the default once it passed the
 * switch-on gate in a real browser (ledger §3); `?layoutMode=free` still
 * runs the previous engine for comparison. */
export function layoutModeSetting(): SolverOptions["layoutMode"] {
  const ok = (v: string | null | undefined) => v === "gapfree" || v === "free" || v === "grid";
  try {
    const fromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("layoutMode") : null;
    if (ok(fromUrl)) return fromUrl as SolverOptions["layoutMode"];
  } catch { /* no URL: fall through */ }
  const fromEnv = import.meta.env.VITE_LAYOUT_MODE as string | undefined;
  return ok(fromEnv) ? (fromEnv as SolverOptions["layoutMode"]) : "gapfree";
}

/** Identifies a layout by its geometry, so the plan already on screen can
 * be matched to the same plan in the options list, and so memoised views
 * re-render when the user switches between options of equal size. */
export function layoutSignature(layout: SolvedLayout | undefined | null): string | null {
  if (!layout) return null;
  const rooms = layout.placed_rooms
    .map(r => `${r.room_id}@${r.floor}:${r.x},${r.y},${r.width},${r.depth}`)
    .join("|");
  return `${layout.building_width ?? layout.plot_width}x${layout.building_depth ?? layout.plot_depth}#${rooms}`;
}

/**
 * Computes alternative layouts (solveLayoutVariants) in a Web Worker so
 * the page stays responsive. Starting a request, calling cancel(), or
 * unmounting terminates any request still running, so a stale result
 * never lands on a newer project.
 */
export function useLayoutOptions() {
  const workerRef = React.useRef<Worker | null>(null);
  const [loading, setLoading] = React.useState(false);

  const cancel = React.useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setLoading(false);
  }, []);

  const request = React.useCallback((
    args: { program: SpatialProgram; envelope: PlotEnvelope; options: SolverOptions },
    onDone: (variants: SolvedLayout[]) => void,
  ) => {
    cancel();
    const worker = new Worker(
      new URL("../lib/aec/solver/engine_v2/variants.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    setLoading(true);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; variants?: SolvedLayout[]; message?: string }>) => {
      if (workerRef.current !== worker) return;
      cancel();
      if (e.data.ok && e.data.variants) onDone(e.data.variants);
      else console.warn("[LAYOUT_OPTIONS] variants worker failed:", e.data.message);
    };
    worker.onerror = (e) => {
      if (workerRef.current !== worker) return;
      console.warn("[LAYOUT_OPTIONS] variants worker error:", e.message);
      cancel();
    };
    worker.postMessage(args);
  }, [cancel]);

  React.useEffect(() => cancel, [cancel]);

  return { request, cancel, loading };
}
