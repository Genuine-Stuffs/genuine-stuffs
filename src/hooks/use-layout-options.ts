import * as React from "react";

import type { SolvedLayout, SpatialProgram } from "../../supabase/functions/ai-studio/schema";
import type { PlotEnvelope, SolverOptions } from "@/lib/aec/solver/types";

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
