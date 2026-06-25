/**
 * Genuine Stuffs AI Studio — Layout Strategy Registry
 * Each strategy is a self-contained room packer that produces a distinct
 * architectural arrangement. The engine picks the most suitable strategy
 * per brief, using a seeded random so the same session is stable but
 * different sessions produce different layouts.
 */

import { PlacedRoom } from "../../../../../supabase/functions/ai-studio/schema";
import { InternalRoomNode } from "../types";

// ── BUILDABLE ENVELOPE ────────────────────────────────────────────────────────
export interface BuildableEnvelope {
  width:  number;  // metres — plot minus setbacks
  depth:  number;
  grid:   number;  // snap grid in metres (e.g. 0.1)
}

// ── STRATEGY OPTIONS ──────────────────────────────────────────────────────────
export interface StrategyOptions {
  floorIndex:     number;
  isDuplex:       boolean;
  stairwellCoords?: { x: number; y: number; w: number; d: number } | null;
  forceStairwell?: { x: number; y: number; w: number; d: number } | null;
}

// ── STRATEGY INTERFACE ────────────────────────────────────────────────────────
export interface LayoutStrategy {
  id:          string;
  name:        string;
  description: string;
  suitableFor: {
    minPlotSqm:  number;
    maxPlotSqm:  number;
    minBedrooms: number;
    maxBedrooms: number;
    duplex:      boolean | 'both';
  };
  pack: (
    publicNodes:  InternalRoomNode[],
    privateNodes: InternalRoomNode[],
    envelope:     BuildableEnvelope,
    options:      StrategyOptions
  ) => PlacedRoom[];
}

// ── STRATEGY REGISTRY ─────────────────────────────────────────────────────────
// Phase 1 strategies are under active debugging — registry is empty until
// courtyard_spine and front_back_split pass acceptance criteria.
// The engine falls back to the legacy packFloor when registry is empty.
export const STRATEGY_REGISTRY: LayoutStrategy[] = [];

// ── STRATEGY SELECTOR ─────────────────────────────────────────────────────────
/**
 * Selects the most suitable strategy for the given brief.
 * Uses a random seed so consecutive generations differ while remaining
 * deterministic within a single session (seed passed from engine).
 */
export function selectStrategy(
  plotSqm:      number,
  bedroomCount: number,
  isDuplex:     boolean,
  seed:         number
): LayoutStrategy {
  const suitable = STRATEGY_REGISTRY.filter(s => {
    const f = s.suitableFor;
    return (
      plotSqm      >= f.minPlotSqm  &&
      plotSqm      <= f.maxPlotSqm  &&
      bedroomCount >= f.minBedrooms &&
      bedroomCount <= f.maxBedrooms &&
      (f.duplex === 'both' || f.duplex === isDuplex)
    );
  });

  if (suitable.length === 0) {
    console.warn('[Strategy] No suitable strategy found — falling back to courtyard_spine');
    return courtyardSpineStrategy;
  }

  const idx = seed % suitable.length;
  console.log(`[Strategy] Selected: ${suitable[idx].id} (seed: ${seed}, pool: ${suitable.length})`);
  return suitable[idx];
}
