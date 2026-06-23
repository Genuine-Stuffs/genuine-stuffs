/**
 * AEC Compliance Engine — Genuine Stuffs AI Studio
 * Source of truth: src/lib/aec/compliance_rules.json (NBC 2006)
 *
 * This engine is DETERMINISTIC. It receives a SpatialProgram produced by the
 * LLM and runs it through every rule in compliance_rules.json. It returns a
 * structured ComplianceReport that the UI renders in place of any hardcoded
 * compliance banner. The LLM never claims compliance — this engine does.
 *
 * Usage:
 *   import { runComplianceCheck } from '@/lib/aec/compliance_engine';
 *   const report = runComplianceCheck(spatialProgram, rules);
 */

import rules from './compliance_rules.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  room_id: string;
  name: string;
  type: string;          // 'bedroom' | 'living_room' | 'kitchen' | 'dining' | 'bathroom' | 'toilet' | 'staircase' | string
  floor: number;
  area_m2: number;
  width_m?: number;
  span_m?: number;       // structural clear span — for beam check
}

export interface SpatialProgram {
  rooms: Room[];
  plot_size_sqm?: number;
  region?: string;       // defaults to 'lagos_residential'
  use_type?: string;     // 'residential' | 'commercial' — defaults to 'residential'
  brief_reference?: {
    plot_size_sqm?: number;
    floors?: number;
  };
}

export interface RuleResult {
  rule: string;
  room_id?: string;
  room_name?: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  required?: string | number;
  actual?: string | number;
  message: string;
}

export interface ComplianceReport {
  overall_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';
  checked_against: string;
  pass_count: number;
  fail_count: number;
  warn_count: number;
  results: RuleResult[];
  setback_summary: {
    front_m: number;
    rear_m: number;
    side_m: number;
    hoarding_required: boolean;
  };
  structural_summary: {
    max_span_allowed_m: number;
    slab_thickness_mm: number;
    live_load_kN_per_m2: number;
    dead_load_kN_per_m2: number;
  };
  mandatory_documents: string[];
  engineer_signoff_required: boolean;
  disclaimer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROOM_TYPE_MAP: Record<string, string> = {
  master_bedroom: 'bedroom',
  bedroom: 'bedroom',
  guest_bedroom: 'bedroom',
  living: 'living_room',
  living_room: 'living_room',
  lounge: 'living_room',
  sunken_lounge: 'living_room',
  kitchen: 'kitchen',
  dining: 'dining',
  dining_room: 'dining',
  bathroom: 'bathroom',
  toilet: 'toilet',
  wc: 'toilet',
  staircase: 'staircase',
  stair: 'staircase',
};

function resolveRoomType(raw: string): string {
  const key = raw.toLowerCase().replace(/[\s-]/g, '_');
  return ROOM_TYPE_MAP[key] || key;
}

function pass(rule: string, room: Room, message: string, required?: number | string, actual?: number | string): RuleResult {
  return { rule, room_id: room.room_id, room_name: room.name, status: 'PASS', required, actual, message };
}

function fail(rule: string, room: Room, message: string, required?: number | string, actual?: number | string): RuleResult {
  return { rule, room_id: room.room_id, room_name: room.name, status: 'FAIL', required, actual, message };
}

function warn(rule: string, room: Room, message: string, required?: number | string, actual?: number | string): RuleResult {
  return { rule, room_id: room.room_id, room_name: room.name, status: 'WARN', required, actual, message };
}

// ─── Rule Checks ──────────────────────────────────────────────────────────────

function checkMinimumArea(room: Room): RuleResult | null {
  const ruleType = resolveRoomType(room.type);
  const habitable = rules.spatial_compliance.habitable_spaces as Record<string, { min_area_m2: number; min_width_m: number }>;
  const spec = habitable[ruleType];
  if (!spec) return null; // No rule for this type (e.g., garage, store) — skip

  if (room.area_m2 < spec.min_area_m2) {
    return fail(
      'MIN_AREA',
      room,
      `${room.name} area ${room.area_m2}m² is below the NBC 2006 minimum of ${spec.min_area_m2}m² for ${ruleType.replace('_', ' ')}.`,
      `≥ ${spec.min_area_m2}m²`,
      `${room.area_m2}m²`
    );
  }
  return pass(
    'MIN_AREA',
    room,
    `${room.name} meets the minimum area requirement.`,
    `≥ ${spec.min_area_m2}m²`,
    `${room.area_m2}m²`
  );
}

function checkMinimumWidth(room: Room): RuleResult | null {
  if (room.width_m === undefined) return null;
  const ruleType = resolveRoomType(room.type);
  const habitable = rules.spatial_compliance.habitable_spaces as Record<string, { min_area_m2: number; min_width_m: number }>;
  const spec = habitable[ruleType];
  if (!spec) return null;

  if (room.width_m < spec.min_width_m) {
    return fail(
      'MIN_WIDTH',
      room,
      `${room.name} width ${room.width_m}m is below the NBC minimum of ${spec.min_width_m}m.`,
      `≥ ${spec.min_width_m}m`,
      `${room.width_m}m`
    );
  }
  return pass(
    'MIN_WIDTH',
    room,
    `${room.name} meets the minimum width requirement.`,
    `≥ ${spec.min_width_m}m`,
    `${room.width_m}m`
  );
}

function checkStructuralSpan(room: Room, useType: string): RuleResult | null {
  if (room.span_m === undefined) return null;
  const maxSpan = rules.structural_parameters.beam_design.max_span_m.typical_residential;
  const spanDepthRatio = rules.structural_parameters.beam_design.span_to_depth_ratio.simply_supported;
  const requiredDepthMm = (room.span_m / spanDepthRatio) * 1000;

  if (room.span_m > maxSpan) {
    return fail(
      'MAX_SPAN',
      room,
      `${room.name} span of ${room.span_m}m exceeds the ${maxSpan}m residential limit. ` +
      `Intermediate columns or deepened beams (min depth ${requiredDepthMm.toFixed(0)}mm at span/depth ratio ${spanDepthRatio}) are required.`,
      `≤ ${maxSpan}m`,
      `${room.span_m}m`
    );
  }

  // Warn if approaching the limit (within 0.5m)
  if (room.span_m > maxSpan - 0.5) {
    return warn(
      'MAX_SPAN',
      room,
      `${room.name} span of ${room.span_m}m is close to the ${maxSpan}m limit. ` +
      `Structural engineer verification recommended. Required beam depth: ${requiredDepthMm.toFixed(0)}mm.`,
      `≤ ${maxSpan}m`,
      `${room.span_m}m`
    );
  }

  return pass(
    'MAX_SPAN',
    room,
    `${room.name} span of ${room.span_m}m is within the ${maxSpan}m residential limit.`,
    `≤ ${maxSpan}m`,
    `${room.span_m}m`
  );
}

function checkStaircase(room: Room): RuleResult[] {
  if (resolveRoomType(room.type) !== 'staircase') return [];
  const stairSpec = rules.spatial_compliance.vertical_circulation.staircase;
  const results: RuleResult[] = [];

  if (room.width_m !== undefined) {
    if (room.width_m < stairSpec.min_clear_width_m) {
      results.push(fail('STAIR_WIDTH', room,
        `Staircase clear width ${room.width_m}m is below the NBC minimum of ${stairSpec.min_clear_width_m}m.`,
        `≥ ${stairSpec.min_clear_width_m}m`, `${room.width_m}m`));
    } else {
      results.push(pass('STAIR_WIDTH', room,
        `Staircase width meets NBC minimum.`,
        `≥ ${stairSpec.min_clear_width_m}m`, `${room.width_m}m`));
    }
  }
  return results;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function runComplianceCheck(program: SpatialProgram): ComplianceReport {
  const results: RuleResult[] = [];
  const region = program.region || 'lagos_residential';
  const useType = program.use_type || 'residential';

  // 1. Spatial checks — every room
  for (const room of program.rooms) {
    const areaResult = checkMinimumArea(room);
    if (areaResult) results.push(areaResult);

    const widthResult = checkMinimumWidth(room);
    if (widthResult) results.push(widthResult);

    const spanResult = checkStructuralSpan(room, useType);
    if (spanResult) results.push(spanResult);

    const stairResults = checkStaircase(room);
    results.push(...stairResults);
  }

  // 2. Setback reference (informational — we don't have plot dimensions to check against here)
  const setbacks = rules.spatial_compliance.setbacks.lagos_residential;
  const loadSpec = useType === 'commercial'
    ? rules.structural_parameters.load_assumptions.commercial
    : rules.structural_parameters.load_assumptions.residential;

  // 3. Aggregate
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const passCount = results.filter(r => r.status === 'PASS').length;

  let overallStatus: ComplianceReport['overall_status'];
  if (failCount > 0) {
    overallStatus = 'NON_COMPLIANT';
  } else if (warnCount > 0) {
    overallStatus = 'REQUIRES_REVIEW';
  } else {
    overallStatus = 'COMPLIANT';
  }

  return {
    overall_status: overallStatus,
    checked_against: `${rules.project_configuration.primary_code} — ${rules.project_configuration.region}`,
    pass_count: passCount,
    fail_count: failCount,
    warn_count: warnCount,
    results,
    setback_summary: {
      front_m: setbacks.front_m,
      rear_m: setbacks.rear_m,
      side_m: setbacks.side_m,
      hoarding_required: true,  // always required when near street per NBC
    },
    structural_summary: {
      max_span_allowed_m: rules.structural_parameters.beam_design.max_span_m.typical_residential,
      slab_thickness_mm: rules.structural_parameters.slab_design.thickness_mm,
      live_load_kN_per_m2: loadSpec.live_load_kN_per_m2,
      dead_load_kN_per_m2: loadSpec.dead_load_kN_per_m2,
    },
    mandatory_documents: [
      ...rules.documentation_protocol.mandatory_contract_package,
      ...rules.documentation_protocol.design_stage_reports,
    ],
    // Always require engineer sign-off — the AI produces a conceptual program,
    // not a certifiable structural design. This is the honest, trust-first position.
    engineer_signoff_required: true,
    disclaimer:
      'This compliance check is a computational pre-screen against NBC 2006 rules. ' +
      'It does not replace review and certification by a registered Architect, Structural Engineer, ' +
      'or Builder. All designs must be verified by a licensed professional before submission ' +
      'for regulatory approval or commencement of construction.',
  };
}
