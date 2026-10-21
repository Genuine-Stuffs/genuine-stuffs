/**
 * Building regulations as data (owner, 2026-10-21: plans follow the codes,
 * never the example prompts). Each figure carries its source and how the
 * engine treats it: "hard" (enforced), "default" (a labelled assumption the
 * user can change), "warn" (reported, not drawn).
 *
 * Source report: reports/Hotel and church design guidelines.md (research
 * notes in research_notes/Hotel and church design guidelines/). Nigerian
 * law first (Lagos Physical Planning Permit Regulations 2019 = "PPR",
 * Lagos Building Control Regulations 2019 = "BCR", National Building Code
 * 2006 = "NBC"); where they are silent, the International Building Code
 * (the successor of the US code the NBC was copied from) and published
 * grading or design references. Schools and hospitals follow the same shape.
 */
export type RuleKind = 'hard' | 'default' | 'warn';
export interface Cited<T = number> { value: T; source: string; kind: RuleKind }
export const cite = <T>(value: T, source: string, kind: RuleKind = 'hard'): Cited<T> => ({ value, source, kind });

/** A plain-English finding about a brief or a plan against one rule. */
export interface RuleCheck { rule: string; ok: boolean; kind: RuleKind; detail: string; source: string }
