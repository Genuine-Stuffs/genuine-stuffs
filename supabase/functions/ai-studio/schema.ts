/**
 * AEC (Architecture, Engineering, Construction) Data Schema
 * Defines the structured output for the orchestrated AI Studio agents.
 */

export interface SpatialElement {
    id: string;
    type: 'room' | 'wall' | 'window' | 'door' | 'stair';
    name: string;
    dimensions: {
        width: number;
        length: number;
        height: number;
        unit: 'm' | 'mm' | 'ft';
    };
    coordinates?: {
        x: number;
        y: number;
        z: number;
    };
    svg_path?: string; // SVG path data (e.g. "M0,0 L10,0 L10,10 L0,10 Z") for floor plan rendering
    notes?: string;
}

export interface MaterialRequirement {
    id: string;
    category: 'foundation' | 'wall' | 'roof' | 'finishing' | 'electrical' | 'plumbing';
    specification: string;
    quantity_estimate: number;
    unit: string;
    unit_price?: number; // Estimated price in NGN
    total_price?: number; // Calculated total (quantity * unit_price)
    suggested_marketplace_type?: string; 
}

export interface StructuralConstraint {
    load_bearing_points: string[];
    beam_span_max: number;
    footing_type: string;
    risk_factors: string[];
}

export interface ComplianceReport {
    status: 'compliant' | 'warning' | 'non-compliant';
    checked_against: string; // e.g., "NBC 2024", "Regional Zoning Law"
    findings: string[];
    recommendations: string[];
}

export interface DesignPackage {
    project_id: string;
    version: string;
    architectural_layout: SpatialElement[];
    material_schedule: MaterialRequirement[];
    structural_skeleton: StructuralConstraint;
    compliance: ComplianceReport;
    summary: string;
}

/**
 * Orchestration State 
 */
export interface AgentResponse {
    role: 'Architect' | 'StructuralEngineer' | 'QuantitySurveyor' | 'ComplianceOfficer';
    content: string;
    data_fragment?: Partial<DesignPackage>;
}
