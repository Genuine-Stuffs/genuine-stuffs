# Genuine Stuffs AEC Studio - Core Engine

Welcome to the heart of the Genuine Stuffs AI Studio. This directory contains the procedural generation and validation engine for our architectural outputs.

## The IFC-First Architecture

We have moved away from LLM-guessed geometry. The architecture now follows a strict, deterministic pipeline:

### 1. LLM Orchestration (`supabase/functions/ai-studio`)
The LLM acts *only* as a conversational state machine. It speaks to the user, gathers requirements, and emits a structured `SpatialProgram` (a JSON intent). It does **not** draw SVGs or guess coordinates.

### 2. Constraint Solver (`src/lib/aec/solver/`)
The `SpatialProgram` is handed to the client-side TypeScript solver. This engine mathematically calculates the exact X, Y, Width, and Depth for every room, packing them onto the specified plot while adhering to hardcoded adjacency and dimensional rules. It outputs a `SolvedLayout`.

### 3. Validation Gate (`src/lib/aec/validation/`)
The `SolvedLayout` is passed through the `ValidationGate`, which checks the geometry against the strict parameters of the Nigerian Building Code (NBC) 2006 (see `compliance_rules.json`). If it fails, the `LayoutGenerator` (Auto-Repair Loop) tightens constraints and re-runs the solver.

### 4. IFC Authoring (`src/lib/aec/ifc/`)
The validated 2D layout is handed to the `IFCAuthoringEngine`. We wrap the low-level `web-ifc` WASM API to extrude the 2D footprints into a true 3D Building Information Model (.ifc binary file) containing `IfcWall`, `IfcSpace`, etc.

### 5. Viewer & Derivations (`src/components/aec/`)
- **AECMassingView.tsx**: Mounts `@thatopen/components` to natively render the generated 3D IFC file.
- **AECFloorPlan.tsx**: Renders a procedural 2D engineering blueprint directly from the `SolvedLayout`.
- **AECBillOfQuantities.tsx**: Calculates material take-offs and queries the Supabase `materials` table. Implements the *Fallback Pricing Strategy* to generate vendor leads when market prices are missing.

## Testing

Run the `test_e2e.ts` script to verify the data handoffs across the pipeline for a standard 3-bedroom bungalow payload.
