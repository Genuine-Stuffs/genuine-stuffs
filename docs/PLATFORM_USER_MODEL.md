# Material Insight Pros — Platform User Model & Business Logic

> **Status:** Canonical Reference Document  
> **Last Updated:** 2026-03-30  
> **Audience:** All contributors, designers, and AI agents working on this codebase

This document defines the **three user categories**, their motivations, capabilities, subscription tiers, and the features they have access to. Every new feature, page, component, or API endpoint built into the platform **must** reference this document to ensure alignment with the business model.

---

## Table of Contents

1. [Platform Mission](#1-platform-mission)
2. [User Categories Overview](#2-user-categories-overview)
3. [Category 1 — Guest / Regular User (Client)](#3-category-1--guest--regular-user-client)
4. [Category 2 — Professional (Pro User)](#4-category-2--professional-pro-user)
5. [Category 3 — Vendor](#5-category-3--vendor)
6. [Subscription & Monetisation Model](#6-subscription--monetisation-model)
7. [Auth Roles & Technical Mapping](#7-auth-roles--technical-mapping)
8. [Feature Access Matrix](#8-feature-access-matrix)
9. [Design & UX Principles Per Role](#9-design--ux-principles-per-role)
10. [Glossary](#10-glossary)

---

## 1. Platform Mission

Material Insight Pros is a **construction-industry digital workspace** that connects three stakeholder groups — project owners seeking expertise, professionals seeking productivity tools and visibility, and vendors seeking a marketplace for building materials. The platform's core value proposition is:

- **For Clients:** A trusted directory to discover verified professionals and source quality building materials.
- **For Professionals:** An AI-powered studio that 10x's productivity, plus a professional network and public profile for discoverability.
- **For Vendors:** An e-commerce-style storefront and analytics dashboard to showcase materials and manage sales.

---

## 2. User Categories Overview

| Attribute | Guest / Regular User | Professional (Pro User) | Vendor |
|---|---|---|---|
| **Auth Role** | `guest` / `client` | `professional` | `vendor` |
| **Primary Goal** | Explore, discover, and hire | Create, collaborate, and get found | Sell materials and manage business |
| **Revenue Relationship** | Service consumer | Freemium → Premium subscriber | Storefront fees / commissions |
| **AI Studio Access** | ❌ No | ✅ Yes (tiered) | ❌ No |
| **Public Profile** | Basic (if registered) | Full professional profile | Vendor storefront |
| **Registration Required** | Optional (can browse as guest) | Yes (professional registration) | Yes (vendor registration) |

---

## 3. Category 1 — Guest / Regular User (Client)

### 3.1 Who They Are

Guests and Regular Users are **visitors and project owners** who come to the platform to:

- **Explore** the platform's capabilities and validate whether it meets their needs.
- **Discover** construction professionals (architects, engineers, quantity surveyors, etc.) filtered by specialisation, location (state/city), and verified credentials.
- **Source** building materials from registered and verified vendors.
- **Hire** professionals for their construction and building projects.

### 3.2 User Journey

```
Landing Page → Browse Professionals → Browse Materials → Register (optional)
                                                              ↓
                                                     Become a Regular User
                                                              ↓
                                              Save favourites, contact pros,
                                              place orders through vendors
```

### 3.3 Capabilities

| Feature | Guest (Not Logged In) | Regular User (Logged In) |
|---|---|---|
| Browse professional directory | ✅ | ✅ |
| View professional profiles | ✅ | ✅ |
| Browse vendor marketplace | ✅ | ✅ |
| Contact professionals | ❌ | ✅ |
| Save / favourite professionals | ❌ | ✅ |
| Place material orders | ❌ | ✅ |
| Access AI Studio | ❌ | ❌ |
| Access Resources page (basic content) | ✅ | ✅ |
| Download premium resources | ❌ | ❌ |

### 3.4 Key Pages

- `/` — Home / Landing Page
- `/pros` — Professional Directory
- `/pros/:id` — Individual Professional Profile
- `/marketplace` — Vendor Marketplace
- `/resources` — Resources (public content only)

---

## 4. Category 2 — Professional (Pro User)

### 4.1 Who They Are

Professionals are **verified industry experts** (architects, structural engineers, quantity surveyors, interior designers, landscape architects, MEP engineers, project managers, urban planners, etc.) who use the platform as:

- An **AI-powered workspace** where the AI Studio helps them generate concepts, iterate on designs, analyse materials, and accelerate their professional output.
- A **professional network** to connect with peers, share knowledge, and collaborate on complex projects.
- A **public profile and portfolio** that makes them discoverable by project owners searching for specific expertise in specific locations.

### 4.2 User Journey

```
Register as Professional → Complete Profile → Receive 10 Free Daily Credits
                                                        ↓
                                              Use AI Studio (Free Tier)
                                                        ↓
                                         Convinced of value? → Upgrade to Premium
                                                                      ↓
                                                           More credits, downloads,
                                                           premium resources access
```

### 4.3 Subscription Tiers

Professional users operate on a **freemium model** with two tiers:

#### Free Tier (Default for all registered Pro Users)

| Benefit | Detail |
|---|---|
| AI Studio Access | ✅ Full access to the AI Studio interface |
| Daily Free Credits | **10 credits per day** (auto-replenished) |
| Generate AI Content | ✅ Within credit limits |
| Download Generated Files | ❌ Not available |
| Premium Resources | ❌ Not available |
| Public Profile | ✅ Full professional profile visible in directory |
| Professional Network | ✅ Connect with other professionals |

#### Premium Tier (Subscription-based upgrade)

| Benefit | Detail |
|---|---|
| AI Studio Access | ✅ Full access to the AI Studio interface |
| AI Credits | **Significantly more credits** (based on selected package) |
| Generate AI Content | ✅ Higher volume |
| Download Generated Files | ✅ **Download all generated images, documents, and outputs** |
| Premium Resources | ✅ **Access to exclusive Pro materials in Resources page** |
| Download Premium Resources | ✅ **Downloadable Pro-tier content** |
| Public Profile | ✅ Full professional profile visible in directory |
| Professional Network | ✅ Connect with other professionals |
| Priority Support | ✅ (future feature) |

### 4.4 Credit Packages (via Paystack)

| Package | Credits | Price (NGN) | Description |
|---|---|---|---|
| Starter | 50 | ₦5,000 | Perfect for a single project vision |
| Professional | 150 | ₦12,500 | Our most popular project pack |
| Enterprise | 500 | ₦35,000 | For high-volume architectural teams |

### 4.5 Key Pages

- `/ai-studio` — AI Studio (core workspace)
- `/pro-portal` — Professional Dashboard
- `/pro/documentation` — Resources & Documentation
- `/professional/:id` — Public Professional Profile
- `/edit-profile` — Profile Editor

### 4.6 AI Studio Professions

The AI Studio adapts its capabilities based on the selected professional role:

- Architect
- Structural Engineer
- Quantity Surveyor
- Interior Designer
- Landscape Architect
- MEP Engineer
- Project Manager
- Urban Planner

---

## 5. Category 3 — Vendor

### 5.1 Who They Are

Vendors are **building material suppliers** who use the platform as:

- An **e-commerce storefront** to showcase their building materials (cement, tiles, roofing, plumbing, electrical fittings, etc.) to prospective buyers.
- An **analytics dashboard** to track sales performance, monitor product views, and manage inventory.
- A **sales management tool** to handle orders, customer interactions, and fulfilment workflows.

### 5.2 User Journey

```
Register as Vendor → Complete Business Profile → List Products
                                                      ↓
                                            Storefront goes live on Marketplace
                                                      ↓
                                         Receive orders from Regular Users / Pros
                                                      ↓
                                            Use Dashboard to manage & analyse
```

### 5.3 Capabilities

| Feature | Vendor |
|---|---|
| Vendor Storefront | ✅ Public-facing product catalogue |
| Product Management | ✅ Add, edit, remove product listings |
| Order Management | ✅ Track and fulfil orders |
| Sales Analytics | ✅ Revenue tracking, product performance |
| Customer Insights | ✅ Buyer demographics and engagement |
| AI Studio Access | ❌ Not available to vendors |
| Professional Network | ❌ Not applicable |
| Public Vendor Profile | ✅ Visible in marketplace directory |

### 5.4 Key Pages

- `/vendor/dashboard` — Vendor Analytics Dashboard
- `/vendor/products` — Product Management
- `/vendor/orders` — Order Management
- `/marketplace` — Public Marketplace (vendor storefronts)

---

## 6. Subscription & Monetisation Model

### Revenue Streams

| Stream | Source | Model |
|---|---|---|
| **Premium Subscriptions** | Pro Users upgrading to Premium tier | One-time credit packs (Paystack) |
| **Vendor Commissions** | Vendors selling through the marketplace | Commission-based or listing fees (future) |
| **Sponsored Listings** | Vendors wanting premium placement | Advertising revenue (future) |
| **White-Label Services** | Enterprise clients | Custom licensing (future) |

### Upgrade Flow (Pro Users)

1. User sees **"Upgrade to Premium"** CTA in AI Studio sidebar.
2. Clicking the button opens the **Credit Package Selection Modal**.
3. User selects a package (Starter / Professional / Enterprise).
4. Payment is processed via **Paystack**.
5. Credits are added to the user's account in Supabase (`professionals.credits`).
6. User gains access to Premium-tier benefits (downloads, premium resources).

### Free Credit Replenishment

- Every registered Professional receives **10 free credits per day**.
- Credits are tracked in the `professionals` table in Supabase.
- The daily replenishment logic should be implemented as a scheduled task (Supabase Edge Function or cron job).

---

## 7. Auth Roles & Technical Mapping

### Role Definitions (AuthContext)

```typescript
type Role = 'client' | 'professional' | 'vendor' | 'guest';
```

| Auth Role | User Category | `isPro` Check | Notes |
|---|---|---|---|
| `guest` | Unauthenticated visitor | `false` | Default state, no session |
| `client` | Regular / Registered User | `false` | Authenticated, no AI Studio access |
| `professional` | Pro User (Free or Premium) | `true` | Has AI Studio, credits tracked |
| `vendor` | Vendor | `false` | Has vendor dashboard, no AI Studio |

### Premium Detection (Future Implementation)

Currently, all `professional` users are treated equally. To differentiate Free vs. Premium tiers, the recommended approach is:

```typescript
// Future: Add to professionals table in Supabase
interface ProfessionalProfile {
    id: string;
    credits: number;
    is_premium: boolean;        // Has active subscription
    premium_expires_at: string; // Subscription expiry date
    total_purchased: number;    // Lifetime credits purchased
}

// Usage in components
const isPremium = professionalData?.is_premium ?? false;
const isFreeTier = isPro && !isPremium;
```

Until the `is_premium` field is implemented, the practical distinction is:
- **Free Tier:** `credits <= 10` (daily allocation only)
- **Premium Tier:** `credits > 10` or has purchased credits via Paystack

---

## 8. Feature Access Matrix

| Feature | Guest | Client | Pro (Free) | Pro (Premium) | Vendor |
|---|---|---|---|---|---|
| Browse site | ✅ | ✅ | ✅ | ✅ | ✅ |
| View pro profiles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse marketplace | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contact professionals | ❌ | ✅ | ✅ | ✅ | ❌ |
| AI Studio access | ❌ | ❌ | ✅ | ✅ | ❌ |
| AI credits (daily free) | — | — | 10/day | 10/day + purchased | — |
| Download AI outputs | ❌ | ❌ | ❌ | ✅ | ❌ |
| Premium resources | ❌ | ❌ | ❌ | ✅ | ❌ |
| Download resources | ❌ | ❌ | ❌ | ✅ | ❌ |
| Professional profile | ❌ | ❌ | ✅ | ✅ | ❌ |
| Vendor storefront | ❌ | ❌ | ❌ | ❌ | ✅ |
| Vendor dashboard | ❌ | ❌ | ❌ | ❌ | ✅ |
| Product management | ❌ | ❌ | ❌ | ❌ | ✅ |
| Order management | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales analytics | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 9. Design & UX Principles Per Role

### Guest / Client
- **Priority:** Discoverability and trust. The interface should showcase the breadth and quality of professionals and materials available.
- **Tone:** Welcoming, informative, conversion-oriented. Encourage registration.
- **Key Actions:** Browse, search, filter, register.

### Professional (Pro User)
- **Priority:** Productivity and density. The AI Studio is a **power-user workspace**, not a consumer app.
- **Tone:** Premium, minimal, high-density. Inspired by tools like DeepSeek, Figma, and professional IDEs.
- **Key Actions:** Generate, iterate, download, manage profile.
- **Mobile:** Static/frozen screen effect. No pull-to-refresh. Edge-to-edge layout.
- **Desktop:** Immersive sidebar, no global navbar in AI Studio. Full-screen workspace.

### Vendor
- **Priority:** Business management and sales visibility. The dashboard should feel like a **business intelligence tool**.
- **Tone:** Data-driven, clean, action-oriented. Touch-optimised for mobile.
- **Key Actions:** List products, manage orders, review analytics.

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Guest** | An unauthenticated visitor browsing the site |
| **Client / Regular User** | A registered user who browses and hires professionals or buys materials |
| **Pro User / Professional** | A verified industry expert with access to the AI Studio |
| **Free Tier** | The default state of a registered Professional — 10 free credits/day, no downloads |
| **Premium Tier** | A Professional who has purchased credit packs — more credits, download access, premium resources |
| **Vendor** | A building material supplier with a storefront on the marketplace |
| **Credits** | The currency used to generate AI content in the AI Studio. 1 generation = 1 credit |
| **AI Studio** | The core AI-powered workspace for Professional users |
| **Studio Hub** | The navigation section within the AI Studio sidebar linking to Documentation, Materials Hub, and Dashboard Feed |
| **Upgrade to Premium** | The CTA encouraging Free Tier Professionals to purchase credit packs and unlock Premium benefits |
| **Paystack** | The Nigerian payment gateway used to process credit purchases |
| **Supabase** | The backend-as-a-service platform hosting auth, database, and API for the application |

---

> **Note for Contributors:** This document is the **single source of truth** for user categorisation, feature access, and business logic. If you are building a new feature, check the [Feature Access Matrix](#8-feature-access-matrix) to determine which users should have access. If you are modifying auth logic, refer to [Auth Roles & Technical Mapping](#7-auth-roles--technical-mapping). All PRs touching user-facing features should reference this document.
