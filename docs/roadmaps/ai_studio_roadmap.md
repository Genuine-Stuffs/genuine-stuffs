# AI Studio Evolution: Strategic Roadmap to Professional Design Engineering

This roadmap outlines the transition of the **Material Insight AI Studio** from a textual advisor into an automated **AEC (Architecture, Engineering, Construction) Production Engine**. The goal is to move beyond "chatting about buildings" to "generating compliant blueprints."

---

## Phase 1: The Multi-Agent Specialist Hive (Agentic Foundation)
Currently, the AI Studio uses a single prompt. Professional design requires a "consensus" between conflicting disciplines.

### 1.1 Specialist Agent Orchestration
Replace the single model call with a **Multi-Agent Workflow**:
- **Architectural Lead Agent**: Focuses on spatial layout, aesthetics, and user requirements.
- **Structural Integrity Agent**: Evaluates the load-bearing requirements, beam spans, and stability.
- **Quantity Surveyor Agent**: Simultaneously calculates real-time BOQs (Bill of Quantities) using the marketplace pricing.
- **Compliance Validator**: A specialized agent (or rule-based script) that checks designs against Nigerian Building Codes (or other regional standards).

### 1.2 Structured "Project State"
Instead of simple chat history, we implement a **Project JSON Schema** that stores:
- Room dimensions and schedules.
- Structural grid layouts.
- Material specifications (linked to actual vendors in your marketplace).

---

## Phase 2: From Text to Geometry (The Parametric Engine)
Text cannot build a house; geometry can. We need to bridge the gap between LLM output and CAD data.

### 2.1 Generative Visualization (2D/3D)
- **Floor Plan Generation**: Use agents to output **DXF/SVG** coordinate data. This allows users to view a real, editable floor plan in the browser.
- **3D Visualization**: Integrate **Three.js** to render "White Box" massing models based on the AI's dimensions.
- **BIM Integration**: Develop an export to **IFC (Industry Foundation Classes)** formats, allowing the AI's output to be imported directly into Revit or ArchiCAD.

---

## Phase 3: Structural & Regulatory Compliance (The "Correctness" Layer)
To meet the user's goal of "Engineering Compliant" designs, the AI must be constrained by physics and law.

### 3.1 Structural Simulation API
Integrate with lightweight structural analysis engines (like OpenSees or custom FEM scripts) to:
- Verify that a beam described by the AI can actually support the intended load.
- Generate **Structural Calculation Sheets** that an engineer can sign off on.

### 3.2 Building Code Knowledge Base
- **RAG (Retrieval Augmented Generation)**: Index local building codes, setback laws, and zoning regulations into a vector database.
- Every design prompt is first "checked" against this database before a plan is generated.

---

## Phase 4: Professional Artifact Generation (The Deliverables)
The final output must be a "Package," not just a message.

### 4.1 Automated Blueprint Sets
Generate architectural packets including:
- **Site Plans**: Based on user-uploaded surveys.
- **Floor Plans & Elevations**: Rendered as high-resolution PDFs.
- **Detail Sheets**: Specifically for material installation (linked to Material Insight products).

### 4.2 Professional BOQ Export
Automatically generate a construction-ready **Excel/PDF BOQ** where every line item is a "Buy Now" link to the Material Insight vendor marketplace.

---

## Technical Implementation Path (Next Steps)

| Step | Technical Action | Priority |
| :--- | :--- | :--- |
| **1** | **Workflow Upgrade**: Move to a "Step-by-Step" generation UI where users approve spatial layouts before structural details are added. | High |
| **2** | **Direct SVG Generation**: Teach the AI model to output SVG coordinates for a 1-to-1 floor plan visualization. | High |
| **3** | **Vendor Integration**: Map AI material recommendations to specific `vendor_inventory` IDs in your database. | Medium |
| **4** | **PDF Export Engine**: Implement a server-side engine (using `jspdf` or similar) to package results into a professional blueprint format. | Medium |

---

## The Vision: "One-Click to Site"
By the end of this roadmap, a user provides a site survey and a dream. The AI Studio provides a **Verified Design Package** that is:
1. **Structurally Sound** (Pre-verified by Engineering Agents).
2. **Materially Costed** (Linked to live marketplace prices).
3. **Drafted** (Available in CAD/PDF formats).
4. **Compliant** (Reviewed against local building regulations).

> [!IMPORTANT]
> This transition requires moving from **Generative AI** (creative but "hallucinating") to **Constrained Generative Design** (creative within the bounds of engineering rules).
