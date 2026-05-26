# Genuine Stuffs — The Digital Operating System for Africa's Building Industry

The construction industry in Africa is fragmented, slow, and opaque. Architects waste weeks producing Bills of Quantities by hand. Material prices are a guessing game. Verified professionals are impossible to find. Projects stall before they start.

Genuine Stuffs fixes this at the root.

Built as a fully AI-native platform, Genuine Stuffs consolidates the entire construction value chain into a single, intelligent system — where every phase of building flows seamlessly into the next.

The AI Studio turns a design brief into a structured, costed Bill of Quantities in seconds using a large language model trained on construction domain knowledge — replacing weeks of manual quantity surveying with a single interaction.

The Procurement Marketplace takes that AI-generated BoQ and converts it directly into a live material order — with verified pricing, trusted vendors, and integrated Paystack checkout. No spreadsheets. No phone calls. No guesswork.

The Professional Portal connects clients with verified architects, engineers, and contractors — with BIM/CAD management, professional portfolios, and collaborative project execution built in.

The result is a construction flywheel: every design generates a procurement order, every order builds vendor data, every project builds a richer intelligence layer that makes the next project faster, cheaper, and better.

Built with React, TypeScript, Supabase, and an LLM-powered AI engine via OpenRouter. Engineered mobile-first for the African professional who moves fast and builds for the future.

**Innovate. Quantify. Build.**

---

## 🚀 Key Platform Pillars

### 🧠 1. AI Innovation Studio (`/src/pages/AIStudio.tsx`)
The AI Studio serves as the design and engineering powerhouse of the platform:
*   **AI-Native Design & Quantity Surveying**: Takes architectural prompts and design briefs, translating them into highly detailed spatial planning recommendations and material schedules.
*   **Structured BoQ Generation**: Instantly compiles a costed Bill of Quantities (BoQ) containing material categories, quantities, unit prices (in NGN), and line-item totals.
*   **Multi-Model Orchestration**: Utilizes a robust backend pipeline connected to **OpenRouter API** with automated failover handling across:
    1.  `anthropic/claude-3-5-sonnet` (Primary)
    2.  `google/gemini-2.0-flash-001` (Secondary)
    3.  `openai/gpt-4o` (Fallback)
*   **Decoupled 3D Visualization**: Detects architectural requests and generates high-fidelity photorealistic visual concept mockups via the `google/imagen-3` image generation model in a separate, parallel worker.
*   **Regulatory & Environmental Compliance**: Embeds validation checks against the **Nigerian National Building Code (NBC) 2006** and local bioclimatic zoning laws (ventilation, bedroom conveniances, min heights/room sizes).
*   **AEC File Exporters**: 
    *   Export professional blueprint reports directly to PDF (includes autoTable material lists and compliance stamps).
    *   Export spatial layouts to CAD-ready **.DXF files** mapping rooms to CAD layers for importing into AutoCAD, Revit, or Archicad.
*   **Credits Billing**: Uses a credits system (2 credits/run) directly connected to a Supabase database backend, integrated with **Paystack** for instant digital credit refills.

### 🛒 2. Procurement Marketplace (`/src/pages/Marketplace.tsx`)
The Marketplace turns concepts into real physical shipments:
*   **BoQ to Checkout Flow**: Automatically translates items generated inside the AI Studio directly into a shopping cart.
*   **Real-time Pricing**: Syncs material lists with verified vendor pricing, categorized under structural, finishes, openings, and MEP.
*   **Integrated Checkout**: Secure checkout powered by Paystack for local payment processing (Card, Bank Transfer, USSD, etc.).
*   **Delivery Details & Tracking**: Captures project address, site contact information, and coordinates delivery logistics directly with local merchant suppliers.

### 💼 3. Professional Portal & Dashboard (`/src/pages/ProDashboard.tsx`)
A workspace designed for builders, project managers, and clients:
*   **Active Project Tracking**: Oversee milestones, material budgets, and procurement status.
*   **BIM & Technical File Manager**: Share, view, and version CAD drawings, structural estimates, and compliance documents.
*   **Client Management**: Professional portfolios to showcase past AI-assisted works and match with incoming developer requests.
*   **AEC Technical Library**: Access compliance documents, material safety standards, and general design standards (`/docs/compliance`).

### 🏪 4. Vendor Ecosystem (`/src/pages/VendorDashboard.tsx`)
A dedicated suite for merchants and material suppliers:
*   **Sales & Revenue Analytics**: Graphing tools visualizing volume, gross revenue, and order statuses over time.
*   **Inventory Manager**: Adjust item availability, categories, and volume-discount schedules.
*   **Order Fulfillment Center**: Track delivery logistics, manage pending dispatch items, and coordinate payment release.

### 🧮 5. AEC Interactive Calculators (`/src/pages/Calculators.tsx`)
Provides field-ready estimators for structural and site activities:
*   **Concrete Volume Calculator**: Computes exact bags of cement, sand volume, and aggregate weight based on custom mixture ratios (1:2:4, 1:3:6, etc.) and structural dimensions.
*   **Steel Beam / Load Estimators**: Assesses preliminary loading variables for structural profiles.
*   **Technical Resource Filter**: A searchable database of technical sheets, safety schedules, and CAD details (`/src/pages/Resources.tsx`).

---

## 🛠️ Technology Stack

*   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui components, Recharts (analytics), jsPDF, and Lucide React.
*   **Database & Backend**: Supabase (PostgreSQL database, Row Level Security (RLS) policies, database triggers, Deno Edge Functions).
*   **Payment Processor**: Paystack SDK.
*   **AI Engine API**: OpenRouter (Claude-3.5-Sonnet, Gemini-2.0-Flash, Imagen-3).

---

## 📁 Project Directory Walkthrough

```text
.
├── backend/                       # Database scripts & schema configurations
│   ├── schema.sql                 # Primary database tables schema (materials, professionals, orders, etc.)
│   ├── seed.sql                   # Mock data representing local building materials
│   └── migration_fix.sql          # DB schema updates, roles, and location coordinates
├── docs/                          # Architectural templates, release notes, and guidelines
│   ├── roadmaps/                  # Platform roadmap documents
│   └── compliance/                # Standards, specifications, and building codes
├── src/
│   ├── components/
│   │   ├── aec/                   # AI Studio UI components (AECFloorPlan, AECBillOfQuantities, AECMassingView)
│   │   ├── pro/                   # Professional workspace components
│   │   ├── vendor/                # Vendor-specific inventory/analytics displays
│   │   └── ui/                    # Base shadcn styling blocks
│   ├── context/
│   │   ├── AuthContext.tsx        # Supabase Authentication context hook
│   │   └── CartContext.tsx        # E-commerce cart state provider
│   ├── pages/                     # Application pages (AI Studio, Marketplace, Calculators, Portals)
│   ├── App.tsx                # Routing definitions
│   └── index.css                  # Core CSS variables, dark-mode styling, custom animations
├── supabase/
│   ├── functions/
│   │   └── ai-studio/             # Edge function interacting with OpenRouter
│   │       ├── index.ts           # Deno runtime handling LLM orchestration & image rendering
│   │       └── schema.ts          # Spatial layout and material list JSON schemas
│   └── config.toml                # Supabase configuration
└── package.json                   # Project scripts and library dependencies
```

---

## 🔧 Local Development & Setup

### Prerequisites
*   Node.js (v18+)
*   NPM or Bun package manager
*   Supabase CLI (optional, required for local database testing/Edge functions)

### Step 1: Clone and Install
Clone this repository to your local workspace, navigate into the project root, and install dependencies:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and supply your API secrets:
```bash
cp .env.example .env
```
Ensure you set the following parameters inside `.env`:
*   `VITE_SUPABASE_URL`: Your Supabase Project API URL.
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key.
*   `VITE_PAYSTACK_PUBLIC_KEY`: Paystack public testing key.

### Step 3: Run Database Migrations (Optional)
If running a self-hosted or clean Supabase instance:
1. Initialize your database using the files in `/backend/schema.sql`.
2. Seed the marketplace catalog using `/backend/seed.sql` and `/backend/seed_more_materials.sql`.
3. Apply RLS policies using `/backend/fix_professionals_rls.sql` and `/backend/fix_rls_and_location.sql`.

### Step 4: Configure Supabase Edge Functions
To test the AI Studio locally, configure your local environment or deployed project secrets with your OpenRouter key:
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-your-key-here
```
Deploy the function to your active Supabase project:
```bash
supabase functions deploy ai-studio
```

> [!NOTE]
> Ensure your `OPENROUTER_API_KEY` is fully active and has credits loaded at [openrouter.ai](https://openrouter.ai) before testing visualizer or BoQ generations.

### Step 5: Start the Development Server
Launch the local Vite server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 🧪 Verification & Testing Procedures

### A. Testing the AI Studio
1.  Log in as a Professional user. (Sign up using the Professional Portal `/pro-portal`).
2.  Ensure your account has credits. (Admins bypass billing; otherwise, use the Paystack refill modal or modify your professional user row in the database to have `credits = 100`).
3.  Go to the **AI Innovation Studio** page.
4.  Select a role (e.g. **Architect** or **Quantity Surveyor**).
5.  Type an architectural brief (e.g., `"Design a modern 3 bedroom flat with tropical cross-ventilation in Lagos"`).
6.  Click **Run AI (2 Credits)**.
7.  **Verify**:
    *   The LLM responds without code leaks, speaking as an architect.
    *   The structural layout displays spatial room boxes.
    *   The Bill of Quantities tab renders costed materials.
    *   The Imagen 3 preview generates a conceptual layout image.
    *   Your user credit balance decreases by 2.
    *   You can successfully export the PDF Blueprint and CAD DXF.

### B. Testing the Marketplace
1.  Create a layout in the AI Studio or navigate to the `/marketplace` route directly.
2.  Add materials to your cart.
3.  Proceed to checkout.
4.  Input delivery details and click "Pay Now".
5.  **Verify**:
    *   The Paystack checkout widget overlays correctly.
    *   Upon successful payment, order record is created in the database and the cart resets.
