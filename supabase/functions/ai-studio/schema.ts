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
    coordinates?: { x: number; y: number; z: number };
    notes?: string;
}

export interface MaterialRequirement {
    id: string;
    category: 'foundation' | 'wall' | 'roof' | 'finishing' | 'electrical' | 'plumbing';
    specification: string;
    quantity_estimate: number;
    unit: string;
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
