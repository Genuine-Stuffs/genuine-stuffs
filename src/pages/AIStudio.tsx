import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Ruler,
    LogOut,
    ListChecks,
    Calculator,
    BookOpen,
    Sparkles,
    Wand2,
    FileText,
    Share2,
    CheckCircle2,
    Lock,
    Loader2,
    Send,
    Plus,
    History,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    Mic,
    Paperclip,
    Menu,
    X,
    LayoutDashboard,
    Settings,
    HardHat,
    DraftingCompass,
    Trees,
    Compass,
    Building2,
    Home,
    ShoppingBag,
    ShieldCheck,
    PenTool,
    AlertTriangle,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
import DesignReviewPanel from "@/components/review/DesignReviewPanel";
import PromptChecklist from "@/components/prompt/PromptChecklist";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { newerBuildAvailable, reloadKeepingPrompt, reloadKeepingSession, takePendingPrompt, takePendingSession } from "@/lib/appVersion";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModeToggle } from "@/components/ModeToggle";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AECFloorPlan from '@/components/aec/AECFloorPlan';
import { AECSitePlan } from '@/components/aec/AECSitePlan';
import AECBillOfQuantities from '@/components/aec/AECBillOfQuantities';
import { downloadPlanDxf } from '@/components/aec/exportPlan';
import { recordDesignEvent, newDesignSession, briefOnly, type DesignEventKind } from '@/lib/aec/designData';
import { briefForEdit, alignToPrevious, briefChanges, roomsKept, newLinks, linksMissed } from '@/lib/aec/editLoop';
import { swapRooms, swappable, editNotes } from '@/lib/aec/swapRooms';
import AECMassingView from '@/components/aec/AECMassingView';
import { AECElevations } from '@/components/aec/AECElevations';
import { AECSection } from '@/components/aec/AECSection';
import { useLayoutOptions, layoutSignature, solveLayoutInWorker, layoutModeSetting } from '@/hooks/use-layout-options';
import { explainFailure, explainUnsupported, isPlan } from '@/lib/aec/solver/engine_v2/failure_messages';
import { buildingSupport } from '@/lib/aec/solver/engine_v2/building_support';
import { plotSize } from '@/lib/aec/solver/engine_v2/plot';
import { withMinimums } from '@/lib/aec/solver/engine_v2/minimums';
import { withFacades } from '@/lib/aec/solver/engine_v2/facades';
import { withAtrium } from '@/lib/aec/solver/engine_v2/atrium';
import { withQuietBedrooms } from '@/lib/aec/solver/engine_v2/quiet';
import { readParkingIntent } from '@/lib/aec/parking';
import { readSetbackIntent, defaultChoice, setbackStudy, setbackAlternatives, SetbackChoice, SetbackStudy } from '@/lib/aec/setbacks';
import { renderPrompt } from '@/lib/aec/render_prompt';
import { ADVISORY_RULES } from '@/lib/aec/solver/engine_v2/placement_validator';
import { runComplianceCheck, ComplianceReport } from '@/lib/aec/compliance_engine';

// --- CLIENT-SIDE SANITIZER: Guarantee no JSON leaks in chat bubble ---
const sanitizeResultText = (raw: any): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    let clean = raw;
    
    try {
        // 1. Purge tag-wrapped AEC data blocks (Standard Protocol)
        clean = clean.replace(/<<<DESIGN_DATA_START>>>[\s\S]*?<<<DESIGN_DATA_END>>>/gi, "");
        
        // 2. Purge any stray start/end tags that might have leaked
        clean = clean.replace(/<<<DESIGN_DATA_(START|END)>>>/gi, "");
        
        // 3. Greedy Scrub: Purge any raw JSON blocks that look like AEC data
        const aecJsonRegex = /(?:^|,)?\s*\{[\s\S]*?"(?:status|project_id|architectural_layout|material_schedule)"[\s\S]*?\}/gi;
        clean = clean.replace(aecJsonRegex, "");

        // 4. Purge markdown code blocks containing AEC data
        clean = clean.replace(/```json[\s\S]*?```/gi, (match) => {
            try {
                const content = match.replace(/```json|```/g, "").trim();
                const parsed = JSON.parse(content);
                if (parsed.status || parsed.architectural_layout || parsed.project_id) return "";
            } catch { 
                if (match.toLowerCase().includes("architectural_layout") || match.toLowerCase().includes("status")) return "";
            }
            return match;
        });

        // 5. Final Polish: Remove trailing commas or artifacts
        clean = clean.replace(/^[,\s]+|[,\s]+$/g, "");
    } catch (err) {
        console.warn("Sanitizer warning:", err);
    }
    
    return clean.trim() || null;
};

/** The AI picture of the building above the plan. Off (owner 2026-10-28): it never showed a building
 * that follows the floor plan. It comes back when the 3D model is built from the plan itself
 * (ledger §6 item 12); while off, no picture is asked for (none is paid for) and the PDF has no picture page. */
const SHOW_BUILDING_PICTURE = false;

const AIStudio = () => {
    const { user, role, serverClaims, switchEnvironmentView, reviewerAccess, signOutTo } = useAuth();
    // a reviewer-only account sees AI Studio and nothing else of the site (owner 2026-10-28)
    const reviewerOnly = reviewerAccess === 'approved';
    const isPro = role === "professional";
    const [searchParams] = useSearchParams();
    const [selectedRole, setSelectedRole] = useState("Architect");
    const [credits, setCredits] = useState<number | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [visualUrl, setVisualUrl] = useState<string | null>(null);
    const [designPackage, setDesignPackage] = useState<any | null>(null);
    const layoutOptions = useLayoutOptions();
    // the pre-screen's inputs from the brief; the report itself is worked out on the plan shown (below)
    const [complianceInput, setComplianceInput] = useState<Parameters<typeof runComplianceCheck>[0] | null>(null);
    const [replanning, setReplanning] = useState(false);
    const [promptText, setPromptText] = useState("");
    // the prompt kept across a reload onto the newer build (lib/appVersion)
    useEffect(() => {
        const session = takePendingSession<{ messages: any[]; design: any; designSession?: string }>();
        if (session?.messages?.length) {
            setMessages(session.messages);
            setDesignPackage(session.design ?? null);
            if (session.designSession) designSession.current = session.designSession;
            setHasActiveSession(true);
        }
        const pending = takePendingPrompt();
        if (pending) {
            setPromptText(pending);
            toast.info(session?.messages?.length
                ? "AI Studio was updated, so the page reloaded. Your design and your prompt are back: press send."
                : "AI Studio was updated, so the page reloaded. Your prompt is back in the box: press send.");
        }
    }, []);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [checklistOpen, setChecklistOpen] = useState(false);
    // this conversation's id in the design data (design_events): a follow-up edit is read against its design
    const designSession = useRef(newDesignSession());
    const [ultraMode, setUltraMode] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatSessions, setChatSessions] = useState<any[]>([]);
    // Latches to true the moment any prompt is submitted — never resets from API failures
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const isMobile = useIsMobile();

    // Full screen once a design is on screen (owner 2026-10-22): the drawings take the whole
    // window; the sidebar, the top bar and the prompt bar slide away and come back when the
    // pointer reaches their edge (left, top, bottom), or while the prompt is being typed.
    // Desktop only: a phone has no pointer to bring them back.
    const [fullScreenPref, setFullScreenPref] = useState(true);
    const [reveal, setReveal] = useState({ side: false, top: false, bottom: false });
    const [promptFocused, setPromptFocused] = useState(false);

    // Static/Frozen Screen logic for DeepSeek effect
    useEffect(() => {
        if (isMobile) {
            const elements = [document.documentElement, document.body, document.getElementById('root')];
            elements.forEach(el => el?.classList.add('is-frozen'));
            
            return () => {
                elements.forEach(el => el?.classList.remove('is-frozen'));
            };
        }
    }, [isMobile]);

    // Mock chat history
    const chatHistory = [
        { id: '1', title: 'Two Bedroom Duplex Building', date: 'Yesterday' },
        { id: '2', title: 'Maximizing AI Material Selection', date: 'Yesterday' },
        { id: '3', title: 'Sustainable Facade Iterations', date: '2025-12' },
        { id: '4', title: 'Urban Museum Massing Concept', date: '2025-10' },
        { id: '5', title: 'Industrial MEP Coordination', date: '2025-10' },
    ];

    useEffect(() => {
        const roleParam = searchParams.get('role');
        if (roleParam) {
            setSelectedRole(roleParam);
        }
    }, [searchParams]);

    const creditPackages = [
        { name: "Starter", credits: 50, price: 5000, description: "Perfect for a single project vision" },
        { name: "Professional", credits: 150, price: 12500, description: "Our most popular project pack", popular: true },
        { name: "Enterprise", credits: 500, price: 35000, description: "For high-volume architectural teams" },
    ];

    useEffect(() => {
        const fetchCredits = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('professionals')
                    .select('credits, subscription_status')
                    .eq('id', user.id)
                    // an account with no professional record (admin, PM, a reviewer) has no row: no credits, not an error (406 with single())
                    .maybeSingle();

                if (error) throw error;

                setCredits(data?.credits ?? 0);
                setSubscriptionStatus(data?.subscription_status ?? 'trial');
            } catch (err: any) {
                console.error("Error fetching credits:", err);
                // Graceful fallback — if subscription_status column is missing (schema drift),
                // do NOT crash the app. Fall back to credits-only query.
                if (err?.code === '42703') {
                    const { data: fallback } = await supabase
                        .from('professionals')
                        .select('credits')
                        .eq('id', user.id)
                        .maybeSingle();
                    if (fallback) setCredits(fallback.credits ?? 0);
                    console.warn("subscription_status column missing from DB — run migration: add_subscription_status_to_professionals.sql");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchCredits();
    }, [user, isPro]);

    const handlePaystackPayment = (pack: typeof creditPackages[0]) => {
        if (!user) return;

        const handler = (window as any).PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_mock_key',
            email: user.email,
            amount: pack.price * 100,
            currency: 'NGN',
            callback: async (response: any) => {
                const newCredits = (credits || 0) + pack.credits;
                const { error } = await supabase
                    .from('professionals')
                    .update({ credits: newCredits })
                    .eq('id', user.id);

                if (!error) {
                    setCredits(newCredits);
                    setShowRefillModal(false);
                    toast.success(`${pack.credits} Credits added to your account.`);
                }
            },
            onClose: () => {
                toast.info("Payment cancelled.");
            }
        });

        handler.openIframe();
    };

    const professionalRoles = [
        {
            name: "Architect",
            icon: <Wand2 className="w-5 h-5 text-primary" />,
            recipes: [
                "Modern sustainable villa, glass facades.",
                "Minimalist white cubic forms.",
                "Parametric urban museum design."
            ]
        },
        {
            name: "Designer",
            icon: <Sparkles className="w-5 h-5 text-primary" />,
            recipes: [
                "Luxury marble living room.",
                "Industrial aesthetic kitchen.",
                "Zen inspired workspace."
            ]
        },
        {
            name: "Quantity Surveyor",
            icon: <Calculator className="w-5 h-5 text-primary" />,
            recipes: [
                "Foundation phase site study.",
                "Steel beam shipment logistics.",
                "Foundation excavation drone view."
            ]
        },
        {
            name: "Structural Engineer",
            icon: <DraftingCompass className="w-5 h-5 text-primary" />,
            recipes: [
                "Steel reinforcement layout for 5-story building.",
                "Cross-section of high-tension concrete beam.",
                "Structural skeleton of a geodesic dome."
            ]
        },
        {
            name: "MEP Engineer",
            icon: <Settings className="w-5 h-5 text-primary" />,
            recipes: [
                "Industrial ceiling HVAC ductwork routing.",
                "Electrical circuit panel diagram overlay.",
                "Isometric plumbing layout for multi-unit apartment."
            ]
        },
        {
            name: "Project Manager",
            icon: <History className="w-5 h-5 text-primary" />,
            recipes: [
                "Construction site logistics & crane positioning.",
                "Gantt chart visualization of milestones.",
                "Daily progress report: shell stage completion."
            ]
        },
        {
            name: "Civil Engineer",
            icon: <Compass className="w-5 h-5 text-primary" />,
            recipes: [
                "Topographic site map with drainage contours.",
                "Asphalt road section with utility piping.",
                "Retaining wall structural detail."
            ]
        },
        {
            name: "Landscape Architect",
            icon: <Trees className="w-5 h-5 text-primary" />,
            recipes: [
                "Corporate plaza hardscape design.",
                "Native planting plan for rooftop garden.",
                "Water feature and walkway integration."
            ]
        },
        {
            name: "Site Supervisor",
            icon: <HardHat className="w-5 h-5 text-primary" />,
            recipes: [
                "Safety inspection: scaffolding fall protection.",
                "Concrete pouring phase with crew view.",
                "Excavation phase safety markers view."
            ]
        }
    ];

    const handleDownloadBlueprint = async () => {
        if (!designPackage) return;

        // SaaS Gating: Unlock only for premium or active packages (admins bypass)
        const isPremium = subscriptionStatus === 'active' || (credits !== null && credits > 10) || role === 'admin' || role === 'pm' || serverClaims.is_reviewer;
        if (!isPremium) {
            toast.error("To download documents, please buy a credit package first.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        toast.info("Preparing a detailed drawing...");

        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(20, 20, 20);
        doc.text("AEC BLUEPRINT REPORT", 14, 22);
        
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Made with the Genuine Stuffs AI Studio`, 14, 30);
        doc.text(`Issuance Date: ${timestamp}`, 14, 35);
        doc.text(`Professional Role: ${selectedRole}`, 14, 40);
        doc.text(`Project Integrity ID: MI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 14, 45);

        // Project Summary
        doc.setDrawColor(230, 230, 230);
        doc.line(14, 50, 196, 50);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Project Brief & Intent", 14, 60);
        
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const splitTitle = doc.splitTextToSize(promptText, 180);
        doc.text(splitTitle, 14, 68);

        let currentY = 68 + (splitTitle.length * 5) + 15;

        // Architectural Layout Table
        if (designPackage.architectural_layout && designPackage.architectural_layout.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Structural/Spatial Layout", 14, currentY);
            currentY += 6;
            
            autoTable(doc, {
                startY: currentY,
                head: [['Element Name', 'Classification', 'Dimensions (LxWxH)']],
                body: designPackage.architectural_layout.map((el: any) => [
                    el.name || "Unnamed Element",
                    el.type || "N/A",
                    `${el.dimensions?.width || '0'}${el.dimensions?.unit || 'm'} x ${el.dimensions?.length || '0'}${el.dimensions?.unit || 'm'}`
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // Material Schedule Table
        if (designPackage.material_schedule && designPackage.material_schedule.length > 0) {
            if (currentY > 240) { doc.addPage(); currentY = 20; }
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Material Schedule & Specifications", 14, currentY);
            currentY += 6;

            autoTable(doc, {
                startY: currentY,
                head: [['Category', 'Quantity', 'Specification', 'Unit Price (NGN)', 'Line Total (NGN)']],
                body: [
                    ...designPackage.material_schedule.map((mat: any) => [
                        mat.category || "General",
                        `${mat.quantity_estimate || '0'} ${mat.unit || 'units'}`,
                        mat.specification || "No spec provided",
                        mat.unit_price ? mat.unit_price.toLocaleString() : '-',
                        (mat.total_price || (mat.quantity_estimate * (mat.unit_price || 0))).toLocaleString()
                    ]),
                    // Add Summary Row
                    [{ content: 'PROJECTED MATERIAL SUB-TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
                     { content: designPackage.material_schedule.reduce((sum: number, mat: any) => sum + (mat.total_price || (mat.quantity_estimate * (mat.unit_price || 0))), 0).toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
                ],
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 20;
        }

        // Compliance Section
        if (designPackage.compliance) {
            if (currentY > 230) { doc.addPage(); currentY = 20; }
            
            doc.setDrawColor(230, 230, 230);
            doc.line(14, currentY, 196, currentY);
            currentY += 10;

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Engineering Compliance & Validation", 14, currentY);
            currentY += 8;
            
            doc.setFontSize(9);
            const isCompliant = designPackage.compliance.status?.toLowerCase() === 'compliant';
            const complianceColor = isCompliant ? [22, 163, 74] : [234, 88, 12];
            doc.setTextColor(complianceColor[0], complianceColor[1], complianceColor[2]);
            doc.text(`VERIFICATION STATUS: ${designPackage.compliance.status?.toUpperCase() || 'PENDING'}`, 14, currentY);
            
            currentY += 5;
            doc.setTextColor(100, 100, 100);
            doc.text(`Regulatory Framework: ${designPackage.compliance.checked_against || 'Standard Global AEC Guidelines'}`, 14, currentY);
            
            // Compliance Seal
            const sealX = 150;
            const sealY = currentY - 5;
            doc.setDrawColor(complianceColor[0], complianceColor[1], complianceColor[2]);
            doc.setLineWidth(0.8);
            doc.rect(sealX, sealY, 45, 20);
            doc.setFontSize(7);
            doc.setTextColor(complianceColor[0], complianceColor[1], complianceColor[2]);
            doc.text("VALIDATED BY AI", sealX + 12, sealY + 8);
            doc.text(timestamp.split(',')[0], sealX + 14, sealY + 15);
        }

        // --- NEW: Visual Preview Page ---
        if (visualUrl) {
            try {
                // Fetch image and convert to base64 for PDF inclusion
                const imgResp = await fetch(visualUrl);
                const blob = await imgResp.blob();
                const base64: string = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                doc.addPage();
                doc.setDrawColor(240, 240, 240);
                doc.rect(10, 10, 190, 277); // Border
                
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text("Conceptual Architectural Visualization", 14, 25);
                
                // Add the image
                doc.addImage(base64, 'JPEG', 14, 35, 182, 120, undefined, 'FAST');
                
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                const disclaimer = "Disclaimer: This visualization is an AI-generated conceptual representation based on the project brief. It serves as design inspiration and should be validated by professional site surveys and structural engineering before construction.";
                const splitDisclaimer = doc.splitTextToSize(disclaimer, 180);
                doc.text(splitDisclaimer, 14, 165);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Project Node: ${designPackage.project_id || 'GS-AUTO'}`, 14, 280);
            } catch (err) {
                console.error("PDF Image Inclusion Error:", err);
            }
        }

        recordDesign('export', 'pdf');
        doc.save(`GenuineStuffs_Drawing_${selectedRole.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
        toast.success("Drawing downloaded!");
    };

    // a plan drawn or used, saved with the words that asked for it (feasibility study §9.1, §9.3)
    const recordDesign = (kind: DesignEventKind, detail?: string, pkg: any = designPackage, layout?: any, prompts?: string[]) => {
        if (!user || !pkg) return;
        recordDesignEvent({ userId: user.id, sessionId: designSession.current, kind, detail, designPackage: pkg, layout,
            prompts: prompts ?? messages.filter(m => m.role === 'user').map(m => String(m.content ?? '')) });
    };

    // Swapping two rooms on the drawn plan (lib/aec/swapRooms.ts): exact and instant, no AI; each swap
    // can be undone, back to the plan before it
    const [swapUndo, setSwapUndo] = useState<any[]>([]);
    const handleSwap = (a: string, b: string, floor: number) => {
        const cur = designPackage?.solvedLayout;
        if (!cur) return;
        const r = swapRooms(cur, a, b, floor);
        if (r.ok === false) { toast.error(r.reason); return; }
        setSwapUndo(prev => [...prev, cur]);
        const pkg = { ...designPackage, solvedLayout: r.layout, edit: { swap: { said: r.said, notes: r.notes } } };
        setDesignPackage(pkg);
        recordDesign('edit', `swap: ${r.said}`, pkg, r.layout);
    };
    // Fit sizes after swaps: the swapped rooms back to the brief's sizes in the places they were given,
    // their floor redrawn from its own tree (SolverOptions.refit), no new search
    const [fitting, setFitting] = useState(false);
    const fitSwapSizes = async () => {
        const cur = designPackage?.solvedLayout, req = designPackage?.solveRequest;
        const pinned = (cur?.search_state?.floors ?? []).filter((f: any) => f.pinned?.length);
        if (!cur || !req || !pinned.length) { toast.error("This plan can't be refitted: swap two rooms first."); return; }
        setFitting(true);
        try {
            const program = { ...designPackage, solvedLayout: undefined, solvedLayoutOptions: undefined, edit: undefined };
            const solved = await solveLayoutInWorker(program, req.envelope, { ...req.options, warm_start: cur.search_state, refit: true, edit_links: undefined });
            if (!solved?.placed_rooms?.length || solved.solver_status === 'UNSAT' || solved.solver_status === 'TIMEOUT') {
                toast.error("The sizes couldn't be fitted on this plan, so the swap stays as it is.");
                return;
            }
            // the floor redrawn as it was: fitting the sizes broke more of the plan's rules than it mended
            const floors = new Set<number>(pinned.map((f: any) => f.floor));
            const same = (r: any) => cur.placed_rooms.some((q: any) => q.room_id === r.room_id && q.floor === r.floor && q.x === r.x && q.y === r.y && q.width === r.width && q.depth === r.depth);
            if (solved.placed_rooms.filter((r: any) => floors.has(r.floor)).every(same)) {
                toast.error("The sizes can't be fitted here without breaking more of the plan's rules, so the swap stays as it is.");
                return;
            }
            const moved = new Set<string>(pinned.flatMap((f: any) => f.pinned));
            const kept = roomsKept(cur, solved, moved);
            const notes = editNotes(cur, solved, pinned.map((f: any) => f.floor));
            setSwapUndo(prev => [...prev, cur]);
            const pkg = { ...designPackage, solvedLayout: solved, edit: { swap: { said: `Sizes fitted to the brief${kept ? `: ${kept.kept} of ${kept.of} other rooms stayed where they were` : ''}`, notes, fitted: true } } };
            setDesignPackage(pkg);
            recordDesign('edit', 'fit sizes after a swap', pkg, solved);
        } catch (err) {
            console.warn('Fit sizes failed:', err);
            toast.error("The sizes couldn't be fitted, so the swap stays as it is.");
        } finally {
            setFitting(false);
        }
    };
    const undoSwap = () => {
        const last = swapUndo[swapUndo.length - 1];
        if (!last) return;
        setSwapUndo(prev => prev.slice(0, -1));
        setDesignPackage((prev: any) => prev ? { ...prev, solvedLayout: last, edit: swapUndo.length > 1 ? { swap: { said: 'Your last change was undone', notes: [], fitted: !last.search_state?.floors?.some((f: any) => f.pinned?.length) } } : undefined } : prev);
    };

    const handleExportDXF = () => {
        // the floor plan itself (walls, doors, windows, room names), not the AI's first sketch of it
        const layout = designPackage?.solvedLayout;
        if (!isPlan(layout)) {
            toast.error("There is no floor plan yet to save as a CAD (Computer-Aided Design) file.");
            return;
        }

        // SaaS Gating: Unlock only for premium or active packages (admins bypass)
        const isPremium = subscriptionStatus === 'active' || (credits !== null && credits > 10) || role === 'admin' || role === 'pm' || serverClaims.is_reviewer;
        if (!isPremium) {
            toast.error("To download CAD (Computer-Aided Design) files, please buy a credit package first.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        downloadPlanDxf(layout, `GS-AI-Studio-floor-plans-${new Date().toISOString().slice(0, 10)}`);
        recordDesign('export', 'dxf');
        toast.success("CAD file (.DXF, opens in AutoCAD) downloaded!");
    };

    const handleGenerate = async () => {
        // Bypass credit check for admin/pm users and hired reviewers based on server-verified claims
        if (!serverClaims.is_admin && !serverClaims.is_pm && !serverClaims.is_reviewer && (credits === null || credits < 2)) {
            toast.error("Not enough credits.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        // A tab older than the live site can't load the planner's workers: reload before a
        // first prompt (nothing on screen to lose), keeping the prompt
        if (await newerBuildAvailable()) {
            if (messages.length === 0) { reloadKeepingPrompt(promptText); return; }
            // a follow-up: the conversation and the design come back after the reload (the plan's
            // loop back to its brief cut, as a saved review does; the other layouts are worked out again)
            const pkg = designPackage && { ...designPackage, solvedLayoutOptions: undefined,
                solvedLayout: designPackage.solvedLayout && { ...designPackage.solvedLayout, program_reference: briefOnly(designPackage.solvedLayout.program_reference) } };
            if (reloadKeepingSession(promptText, { messages, design: pkg, designSession: designSession.current })) return;
        }

        // IMMEDIATELY latch the session open — this is the single gate for the view switch
        setHasActiveSession(true);
        setIsGenerating(true);
        setSwapUndo([]); // a new plan: the swaps before it can't be undone onto it
        setGeneratedImage(null);
        setVisualUrl(null); // Clear previous vision state
        setComplianceInput(null); // a new design's check, or none: never the last design's
        
        // Capture prompt BEFORE clearing the input field
        const submittedPrompt = promptText;
        // the edit loop: a follow-up changes the design on screen, not a new house
        const previousPackage = messages.length > 0 && designPackage?.rooms && !designPackage.unsupported ? designPackage : null;

        // Add user message to history for continuity
        const newUserMessage = { role: 'user', content: submittedPrompt };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        // Clear input AFTER capturing so the edge function still gets the text
        setPromptText("");

        try {
            const { data, error } = await supabase.functions.invoke('ai-studio', {
                body: { 
                    prompt: submittedPrompt,  // ← use captured value, NOT promptText (which is now "")
                    messages: updatedMessages,
                    ...(previousPackage ? { currentBrief: briefForEdit(previousPackage) } : {}),
                    type: 'text',
                    selectedRole: selectedRole 
                }
            });

            if (error) {
                const errorBody = await error.context?.json().catch(() => ({}));
                throw new Error(errorBody?.error || error.message);
            }

            if (data?.error) throw new Error(data.error);

            // Backend handles credit deduction; reflect it locally
            if (!serverClaims.is_admin && !serverClaims.is_pm) {
                setCredits(prev => (prev !== null ? prev - 2 : prev));
            }


            // --- ULTIMATE GREEDY PARSER: Fail-safe recovery logic ---
            let finalDesignData = data.data;
            
            // Accepts BOTH the old architectural_layout schema AND new SpatialProgram (rooms[]) schema
            const hasValidDesignData = (d: any) => d && (d.architectural_layout || d.rooms || d.status);

            // If the backend didn't parse it, or if it looks empty, we hunt the text manually
            if (!hasValidDesignData(finalDesignData)) {
                const rawResult = data.result || "";
                try {
                    // 1. Look for explicit tags first
                    const tagMatch = rawResult.match(/<<<DESIGN_DATA_START>>>([\s\S]*?)<<<DESIGN_DATA_END>>>/i);
                    let jsonToTry = tagMatch ? tagMatch[1] : rawResult;

                    // Clean markdown fences
                    jsonToTry = jsonToTry.replace(/```json/gi, "").replace(/```/g, "").trim();

                    // 1.5 Try parsing the entire block first
                    try {
                        const parsed = JSON.parse(jsonToTry);
                        if (hasValidDesignData(parsed)) {
                            finalDesignData = parsed;
                            console.log("Ultimate Parser recovered full block.");
                        }
                    } catch (e) {
                        // 2. Extract anything that looks like a JSON object containing AEC keys
                        // Using greedy match at the end to capture nested braces
                        const jsonRegex = /\{[\s\S]*?"(?:status|architectural_layout|project_id|rooms|brief_reference)"[\s\S]*\}/gi;
                        const possibleBlocks = jsonToTry.match(jsonRegex);

                        if (possibleBlocks) {
                            for (const block of possibleBlocks) {
                                try {
                                    let cleanedBlock = block.trim();
                                    if (cleanedBlock.startsWith(',')) cleanedBlock = cleanedBlock.substring(1).trim();
                                    
                                    const parsed = JSON.parse(cleanedBlock);
                                    if (hasValidDesignData(parsed)) {
                                        finalDesignData = parsed;
                                        console.log("Ultimate Parser recovered AEC data from raw text.");
                                        break;
                                    }
                                } catch (err) { /* continue to next block */ }
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Ultimate Parser failed to find valid blocks:", e);
                }
            }

            // Store text and structured data
            const cleanText = sanitizeResultText(data.result);
            const hasDesignData = !!(finalDesignData && (finalDesignData.rooms || finalDesignData.architectural_layout || finalDesignData.status));

            // A building type the planner doesn't draw yet (hotel, church): say so, and draw,
            // picture and check nothing (owner's engine brief, capability A)
            const support = hasDesignData && finalDesignData.rooms ? buildingSupport(finalDesignData) : null;
            if (support && !support.supported) finalDesignData.unsupported = support;

            // Run deterministic client-side solver if spatial program intent is provided
            if (hasDesignData && finalDesignData.rooms && !finalDesignData.unsupported) {
                try {
                    // The plot's width x depth from the user's words ("a 15m × 30m plot");
                    // else the square of the stated area; else a standard 15x30m plot.
                    const userTexts = updatedMessages.filter(m => m.role === 'user').map(m => String(m.content ?? ''));
                    // an edit keeps the previous rooms' ids, so the plan can keep them where they were
                    if (previousPackage) finalDesignData.rooms = alignToPrevious(previousPackage.rooms, finalDesignData.rooms);
                    const { width: plotWidth, depth: plotDepth } = plotSize(userTexts, finalDesignData.brief_reference?.plot_size_sqm);
                    // "Sunken Living Lounge (min 40 sqm)": the plan never makes that room smaller
                    finalDesignData.rooms = withMinimums(finalDesignData, userTexts).rooms;
                    // "Master Suite (southern facade)": that room has a wall on that side
                    finalDesignData.rooms = withFacades(finalDesignData, userTexts).rooms;
                    // "double-volume atrium over living area": the upper floor is open above that room
                    finalDesignData.rooms = withAtrium(finalDesignData, userTexts).rooms;
                    // "bedrooms on the quiet side away from the road": the plan prefers them off the street wall
                    finalDesignData.rooms = withQuietBedrooms(finalDesignData, userTexts).rooms;
                    
                    // Pass brief_reference floors to solver so duplex upper floor packs correctly.
                    // Guard both field names (floors / storeys) for schema compatibility.
                    const briefFloors = finalDesignData.brief_reference?.floors
                        ?? finalDesignData.brief_reference?.storeys
                        ?? 1;

                    console.log("[SOLVER_DEBUG] Raw rooms from Hive:", JSON.stringify(finalDesignData.rooms, null, 2));
                    // Setbacks: the law the user names (or the recommended
                    // default), with any figures they state; a clash is
                    // reported with their options, never bent silently.
                    const setbackIntent = readSetbackIntent(userTexts);
                    const setback = setbackStudy(defaultChoice(setbackIntent), { width: plotWidth, depth: plotDepth },
                        setbackIntent.stated, finalDesignData, briefFloors);
                    finalDesignData.setback = setback;
                    // parking asked for in the compound: open ground, no room of the plan, but cars come in by the gate
                    const parking = readParkingIntent(userTexts);
                    if (parking) finalDesignData.brief_reference = { ...finalDesignData.brief_reference, parking };
                    const envelope = { width: plotWidth, depth: plotDepth, setbacks: setback.plan.setbacks };
                    // One seed for both runs, so the plan shown first is
                    // the same geometry as its entry in the options list.
                    // an edit starts from the previous plan (its search and seed); a new design from a new seed
                    const warmFrom = previousPackage?.solvedLayout?.search_state;
                    // a move ("put the terrace between the lounge and the master suite"): the rooms it asked to touch
                    const editLinks = previousPackage ? newLinks(previousPackage.rooms, finalDesignData.rooms) : [];
                    const solverOptions = {
                        floors_override: briefFloors, seed: (warmFrom && previousPackage?.solveRequest?.options?.seed) || Math.floor(Math.random() * 2 ** 31),
                        layoutMode: layoutModeSetting(), outbuildings_in_rear_setback: setback.plan.choice.outbuildingsInRear !== false,
                        ...(warmFrom ? { warm_start: warmFrom } : {}),
                        ...(editLinks.length ? { edit_links: editLinks } : {}),
                    };
                    const program = { ...finalDesignData };
                    // kept so a reviewed plan can be redrawn exactly (seed included)
                    finalDesignData.solveRequest = { envelope, options: solverOptions };
                    const solved = await solveLayoutInWorker(finalDesignData, envelope, solverOptions);
                    finalDesignData.solvedLayout = solved;
                    if (previousPackage) {
                        const changes = briefChanges(previousPackage.rooms, finalDesignData.rooms);
                        const changed = new Set<string>(finalDesignData.rooms.filter((r: any) => changes.some(c => c.name === String(r.name ?? r.room_id))).map((r: any) => String(r.room_id)));
                        finalDesignData.edit = { changes, kept: roomsKept(previousPackage.solvedLayout, solved, changed), warm: solved.warm_started === true, missed: linksMissed(solved, editLinks, finalDesignData.rooms) };
                    }

                    // Show this plan now; alternatives are computed off the
                    // main thread and offered once they arrive — only if the
                    // user is still looking at this same plan.
                    // A fallback plan means nothing solved strictly: the worker
                    // would only repeat that search, so don't offer options.
                    // The gap-free engine already compares every footprint and
                    // returns its best plan; it has no options list yet.
                    if ((solved.solver_status === 'SOLVED' || solved.solver_status === 'SOLVED_RELAXED') && !solved.solver_fallback && solverOptions.layoutMode !== 'gapfree') {
                        const shownSig = layoutSignature(solved);
                        layoutOptions.request({ program, envelope, options: solverOptions }, (variants) => {
                            setDesignPackage((prev: any) => {
                                if (!prev || layoutSignature(prev.solvedLayout) !== shownSig) return prev;
                                const current = variants.find(v => layoutSignature(v) === shownSig);
                                return {
                                    ...prev,
                                    solvedLayout: current ?? prev.solvedLayout,
                                    solvedLayoutOptions: current ? variants : [prev.solvedLayout, ...variants],
                                };
                            });
                        });
                    }
                    console.log(`[SOLVER] ${solved.solver_status}: ${solved.placed_rooms.length} rooms placed`, solved);
                    console.log('[SOLVER_DEBUG] placedRooms:', JSON.stringify(solved.placed_rooms, null, 2));

                    // Run deterministic compliance check against NBC 2006 rules, on a plan only:
                    // with no plan there is nothing to check, so no "passed" either
                    setComplianceInput(!isPlan(solved) ? null : {
                        rooms: finalDesignData.rooms,
                        plot_size_sqm: finalDesignData.brief_reference?.plot_size_sqm,
                        region: finalDesignData.brief_reference?.region || 'lagos_residential',
                        use_type: finalDesignData.brief_reference?.use_type || 'residential',
                    });
                } catch (solverErr) {
                    console.error("Client-side TS Solver failed to generate layout:", solverErr);
                }
            }

            // Batch all state updates together to prevent race-condition render flashes
            setGeneratedImage(cleanText);
            setDesignPackage(hasDesignData ? finalDesignData : null);
            if (hasDesignData) {
                const asked = updatedMessages.filter(m => m.role === 'user').map(m => String(m.content ?? ''));
                recordDesign(asked.length > 1 ? 'edit' : 'design', undefined, finalDesignData, undefined, asked);
            }
            // Remove promptText clear from here since we now clear it immediately on submit
            // Add assistant response to history BEFORE clearing isGenerating so the view never flashes back to idle
            setMessages(prev => [...prev, { role: 'assistant', content: data.result || 'Analysis complete.' }]);
            setIsGenerating(false);
            
            if (hasDesignData) {
                toast.success("Room plan ready.");
            } else if (cleanText) {
                toast.info("Design check ready.");
            } else {
                toast.info("Response received. See results below.");
            }

            // --- PATH 3: Decoupled High-Priority Rendering ---
            // Only fire if the AI deciphered that an image is appropriate
            if (SHOW_BUILDING_PICTURE && data.data?.image_prompt && isPlan(finalDesignData?.solvedLayout)) {
                setIsVisualizing(true);
                try {
                    const { data: vizData, error: vizError } = await supabase.functions.invoke('ai-studio', {
                        body: { 
                            prompt: renderPrompt(finalDesignData, data.data.image_prompt),
                            type: 'visualize',
                            selectedRole: selectedRole 
                        }
                    });

                    if (vizError) throw vizError;
                    // the function returns the picture as `visualization` (is_image), or a text description when no picture was made
                    const picture = vizData?.is_image ? vizData.visualization : vizData?.imageUrl;
                    if (picture) setVisualUrl(picture);
                    else console.warn('Path 3 Visualization: no picture returned');
                } catch (vizErr) {
                    console.error("Path 3 Visualization Error:", vizErr);
                } finally {
                    setIsVisualizing(false);
                }
            }
        } catch (err: any) {
            // On error, add an error message to the chat log so the view stays open
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `**Error:** ${err.message || 'Generation failed. Please try again.'}` 
            }]);
            setIsGenerating(false);
            toast.error(err.message || "Generation failed.");
        }
    };

    const handleNewProject = () => {
        if (messages.length > 0) {
            // Archive current session
            const sessionTitle = messages.find(m => m.role === 'user')?.content?.substring(0, 30) + "..." || "Archived Project";
            setChatSessions(prev => [
                { 
                    id: Date.now().toString(), 
                    title: sessionTitle, 
                    date: new Date().toLocaleTimeString(),
                    messages: [...messages],
                    design: designPackage,
                    designSession: designSession.current,
                }, 
                ...prev
            ]);
        }
        
        // 100% Clean Slate — reset the session latch so idle screen returns
        layoutOptions.cancel();
        designSession.current = newDesignSession();
        setHasActiveSession(false);
        setMessages([]);
        setDesignPackage(null);
        setSwapUndo([]);
        setComplianceInput(null);
        setGeneratedImage(null);
        setVisualUrl(null);
        setPromptText("");
        setSidebarOpen(false);
        setMobileSidebarOpen(false);
        toast.success("New project started. The earlier conversation has been cleared.");
    };

    // Geometry signature, not just plot size + room count: options for the
    // same brief share both, and switching between them must re-render.
    // The user picks the setback law: re-plan the same brief under it
    // (no new AI call), replacing the plan and its setback study.
    const replanSetbacks = async (picked: SetbackChoice) => {
        const study: SetbackStudy | undefined = designPackage?.setback;
        if (!designPackage?.rooms || !study || replanning) return;
        // a change of law keeps the user's outbuilding choice
        const choice = { ...picked, outbuildingsInRear: picked.outbuildingsInRear ?? study.plan.choice.outbuildingsInRear };
        const setback = setbackStudy(choice, study.plot, {}, designPackage, study.storeys);
        setReplanning(true);
        try {
            const envelope = { width: study.plot.width, depth: study.plot.depth, setbacks: setback.plan.setbacks };
            const solved = await solveLayoutInWorker(
                designPackage, envelope,
                { floors_override: study.storeys, seed: Math.floor(Math.random() * 2 ** 31), layoutMode: layoutModeSetting(), outbuildings_in_rear_setback: choice.outbuildingsInRear !== false });
            setSwapUndo([]);
            setDesignPackage((prev: any) => prev ? { ...prev, setback, solvedLayout: solved, solvedLayoutOptions: undefined, edit: prev.edit?.swap ? undefined : prev.edit } : prev);
            recordDesign('replan', setback.plan.label, { ...designPackage, setback }, solved);
            toast.success(`Re-planned under ${setback.plan.label}`);
        } catch (err) {
            console.error('Re-plan under new setbacks failed:', err);
            toast.error('Could not re-plan under those setbacks.');
        } finally {
            setReplanning(false);
        }
    };
    const setback: SetbackStudy | undefined = designPackage?.setback;

    const fullScreen = fullScreenPref && !isMobile && hasActiveSession && !!designPackage && !isGenerating;
    useEffect(() => {
        if (!fullScreen) { setReveal({ side: false, top: false, bottom: false }); return; }
        // each bar shows while the pointer is at its edge or on the bar itself
        const onMove = (e: MouseEvent) => setReveal(prev => {
            const next = {
                side: e.clientX < (prev.side ? (sidebarOpen ? 264 : 72) : 14),
                top: e.clientY < (prev.top ? 64 : 12),
                bottom: e.clientY > window.innerHeight - (prev.bottom ? 140 : 16),
            };
            return next.side === prev.side && next.top === prev.top && next.bottom === prev.bottom ? prev : next;
        });
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [fullScreen, sidebarOpen]);
    const showBottom = !fullScreen || reveal.bottom || promptFocused || !!promptText;

    const layoutKey = layoutSignature(designPackage?.solvedLayout);
    const layoutChoices: any[] = designPackage?.solvedLayoutOptions ?? [];

    const stableLayout = useMemo(() => designPackage?.solvedLayout, [layoutKey]);

    // The pre-screen on the plan shown: its spans from the plan's column grid, so a
    // re-plan or another layout option is checked as drawn; none without a plan
    const complianceReport: ComplianceReport | null = useMemo(() => {
        if (!complianceInput || !isPlan(stableLayout)) return null;
        try { return runComplianceCheck({ ...complianceInput, solved: stableLayout }); }
        catch (err) { console.error("Compliance engine error:", err); return null; }
    }, [complianceInput, layoutKey]);

    // A failed solve has no geometry: explain why instead of drawing an
    // empty plan. Layouts saved before solver_status existed render as before.
    const layoutFailed = stableLayout?.solver_status === 'UNSAT' || stableLayout?.solver_status === 'TIMEOUT';
    const failureExplanation = designPackage?.unsupported
        ? explainUnsupported(designPackage.unsupported.kind, designPackage.unsupported.rooms)
        : layoutFailed ? explainFailure(stableLayout?.solver_failure, setbackAlternatives(designPackage?.setback)) : null;

    // ── Phase 5: placement issues surfaced from SolveResult, no longer
    // console-only. Distinguishes SEVERE (CORRIDOR_ADJACENCY/EXTERNAL_WALL —
    // a room is genuinely unreachable or windowless) from WARN
    // (BATH_VENTILATION — NBC-permitted with mechanical venting, informational).
    const placementIssues = stableLayout?.placement_issues ?? [];
    const severeIssueCount = placementIssues.filter(i => !ADVISORY_RULES.has(i.rule)).length;
    const warnIssueCount = placementIssues.length - severeIssueCount;
    // Fallback plan: complete and valid, but it gave things up — say so
    // above the plan, with the reason the strict layout failed.
    const compromiseExplanation = stableLayout?.solver_fallback ? explainFailure(stableLayout?.solver_failure) : null;

    return (
        <div className="flex flex-col h-screen md:h-[100dvh] md:relative fixed inset-0 overflow-hidden bg-white dark:bg-black z-10">
            {/* Mobile Header (Fixed) */}
            <header className="flex md:hidden items-center justify-between px-4 h-14 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-black fixed top-0 left-0 right-0 z-40">
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)} className="rounded-xl -ml-2">
                    <Menu className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </Button>

                <div className="flex items-center gap-2">
                     <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-32 h-9 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-black text-[9px] uppercase tracking-[0.2em] shadow-sm focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent 
                            className="bg-white dark:bg-card border-slate-200 dark:border-border rounded-xl shadow-2xl z-[200]"
                            position="popper"
                            side="bottom"
                            align="end"
                            style={{ width: '200px', maxHeight: '300px' }}
                        >
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 p-2 border-b dark:border-white/5 mb-1">Pick A Role</p>
                            {professionalRoles.map(r => (
                                <SelectItem
                                    key={r.name}
                                    value={r.name}
                                    className="font-bold text-[10px] uppercase tracking-widest py-3 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        {r.icon}
                                        {r.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative selection:bg-primary/30 pt-14 md:pt-0">
                {/* Mobile Backdrop */}
                {mobileSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                {/* Sidebar (Responsive ChatGPT/DeepSeek style) */}
                <aside
                    className={`fixed inset-y-0 left-0 ${fullScreen ? `md:fixed md:shadow-2xl ${reveal.side ? 'md:translate-x-0' : 'md:-translate-x-full'}` : 'md:relative'} flex flex-col bg-slate-50 dark:bg-card border-r border-slate-200 dark:border-border transition-all duration-300 z-[60] overflow-hidden flex-shrink-0 
                        ${sidebarOpen ? 'md:w-64' : 'md:w-16'}
                        ${mobileSidebarOpen ? 'translate-x-0 w-[280px]' : `-translate-x-full ${fullScreen ? '' : 'md:translate-x-0'}`}
                    `}
                >
                    <div className={`py-4 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar ${sidebarOpen ? 'px-5' : 'px-2'}`}>
                        {isMobile ? (
                            <>
                                {/* Mobile Sidebar — mirrors Desktop layout exactly */}
                                <div className="mb-6 flex items-center justify-between gap-1">
                                    <Button variant="ghost" asChild className="flex-1 justify-start gap-4 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white" onClick={() => setMobileSidebarOpen(false)}>
                                        <Link to={reviewerOnly ? "/reviewers/account" : "/"}>
                                            <Home className="w-4 h-4 text-slate-400" /> {reviewerOnly ? "Account" : "Home"}
                                        </Link>
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleNewProject}
                                            className="rounded-xl h-9 w-9 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                            title="New Project"
                                        >
                                            <Plus className="w-4 h-4 shrink-0" />
                                        </Button>
                                        <div className="shrink-0 flex items-center">
                                            <ModeToggle />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} className="rounded-xl h-9 w-9 text-slate-400 shrink-0 ml-0.5">
                                            <X className="w-4 h-4 shrink-0" />
                                        </Button>
                                    </div>
                                </div>

                                {reviewerOnly ? (
                                    <div className="mb-6">
                                        <Button variant="ghost" onClick={() => signOutTo('/reviewers/login')} className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                            <LogOut className="w-4 h-4 text-slate-400" /> Sign out
                                        </Button>
                                    </div>
                                ) : (
                                <div className="mb-6">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 px-2">Studio Hub</p>
                                    <div className="space-y-0.5">
                                        <Button asChild variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest" onClick={() => setMobileSidebarOpen(false)}>
                                            <Link to="/pro/documentation">
                                                <BookOpen className="w-4 h-4 text-slate-400" /> Documentation
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                            <Building2 className="w-4 h-4 text-slate-400" /> Materials Hub
                                        </Button>
                                        <Button asChild variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest" onClick={() => setMobileSidebarOpen(false)}>
                                            <Link to="/pro-portal">
                                                <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard Feed
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                )}

                                <div className="mb-6">
                                    <Button variant="ghost" onClick={() => { setChecklistOpen(true); setMobileSidebarOpen(false); }} className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                        <ListChecks className="w-4 h-4 text-slate-400" /> Prompt Checklist
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 px-2 mb-4">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Studio</span>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Desktop Sidebar Layout - Smart Expand/Collapse */}
                                
                                <div className={`mb-4 flex ${sidebarOpen ? 'items-center gap-1' : 'flex-col items-center gap-3'} transition-all`}>
                                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className={`rounded-xl shrink-0 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 ${sidebarOpen ? 'order-last h-8 w-8 ml-auto' : 'h-10 w-10 mb-2 mt-1 mx-auto'}`}>
                                        <Menu className="w-5 h-5" />
                                    </Button>
                                    <Button variant="ghost" asChild className={`justify-start gap-4 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-all font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'flex-1 h-10 text-[11px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`}>
                                        <Link to={reviewerOnly ? "/reviewers/account" : "/"} title={reviewerOnly ? "Account" : "Home"}>
                                            <Home className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && (reviewerOnly ? "Account" : "Home")}
                                        </Link>
                                    </Button>
                                </div>
                                <div className={`flex ${sidebarOpen ? 'items-center gap-0.5 mb-2' : 'flex-col items-center gap-3 mb-6'} transition-all`}>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleNewProject} 
                                        className={`rounded-xl shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors ${sidebarOpen ? 'h-8 w-8' : 'h-10 w-10'}`}
                                        title="New Project"
                                    >
                                        <Plus className={`${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                                    </Button>
                                    <ModeToggle />
                                    {/* Excluded redundant X toggle because Menu toggle exists. */}
                                </div>

                                {reviewerOnly ? (
                                    <div className={`mb-4 ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
                                        <Button variant="ghost" onClick={() => signOutTo('/reviewers/login')} title="Sign out" className={`rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'w-full justify-start gap-4 h-9 text-[10px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`}>
                                            <LogOut className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Sign out"}
                                        </Button>
                                    </div>
                                ) : (
                                <div className={`mb-4 ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
                                    {sidebarOpen ? (
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 px-2 line-clamp-1">Studio Hub</p>
                                    ) : (
                                        <div className="w-6 h-[2px] bg-slate-200 dark:bg-border mb-4 rounded-full"></div>
                                    )}
                                    <div className={`space-y-0.5 ${sidebarOpen ? '' : 'space-y-3 w-full flex flex-col items-center'}`}>
                                        <Button asChild variant="ghost" className={`rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'w-full justify-start gap-4 h-9 text-[10px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`} title="Documentation">
                                            <Link to="/pro/documentation">
                                                <BookOpen className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Documentation"}
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className={`rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'w-full justify-start gap-4 h-9 text-[10px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`} title="Materials Hub">
                                            <Building2 className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Materials Hub"}
                                        </Button>
                                        <Button asChild variant="ghost" className={`rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'w-full justify-start gap-4 h-9 text-[10px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`} title="Dashboard Feed">
                                            <Link to="/pro-portal">
                                                <LayoutDashboard className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Dashboard Feed"}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                )}

                                <div className={`mb-4 ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
                                    <Button variant="ghost" onClick={() => setChecklistOpen(true)} title="Prompt Checklist" className={`rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white ${sidebarOpen ? 'w-full justify-start gap-4 h-9 text-[10px]' : 'w-10 h-10 p-0 flex items-center justify-center'}`}>
                                        <ListChecks className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Prompt Checklist"}
                                    </Button>
                                </div>

                                <div className={`flex items-center gap-2 mb-2 ${sidebarOpen ? 'px-2' : 'justify-center py-2'}`} title="AI Studio">
                                    <Sparkles className={`text-primary ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                                    {sidebarOpen && <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Studio</span>}
                                </div>
                            </>
                        )}

                        {sidebarOpen && (
                            <div className="space-y-6 pt-2">
                                <div>
                                    {/* Dynamic Past Sessions */}
                                    {chatSessions.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Archived Sessions</p>
                                            {chatSessions.map((session) => (
                                                <div 
                                                    key={session.id} 
                                                    className="group flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-all cursor-pointer mb-2"
                                                    onClick={() => {
                                                        setMessages(session.messages);
                                                        designSession.current = session.designSession ?? newDesignSession();
                                                        layoutOptions.cancel();
                                                        setDesignPackage(session.design);
                                                        setSidebarOpen(false);
                                                        toast.info(`Switched to: ${session.title}`);
                                                    }}
                                                >
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">
                                                            {session.title}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{session.date}</span>
                                                    </div>
                                                    <History className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Standard Reference</p>
                                    <div className="space-y-0.5">
                                        {chatHistory.map((chat) => (
                                            <button
                                                key={chat.id}
                                                onClick={() => {
                                                    setPromptText(chat.title);
                                                    setMobileSidebarOpen(false);
                                                }}
                                                className="w-full text-left px-3 h-8 flex items-center rounded-lg transition-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:bg-transparent hover:text-current cursor-pointer active:scale-[0.98] group overflow-hidden"
                                            >
                                                <span className="truncate flex-1">{chat.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={`mt-auto pt-4 border-t dark:border-border flex ${sidebarOpen ? 'flex-col' : 'justify-center'}`}>
                            {sidebarOpen ? (
                                <Button 
                                    onClick={() => setShowRefillModal(true)}
                                    className="w-full rounded-[1.5rem] bg-red-600/90 text-white hover:bg-red-700 h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/20"
                                >
                                    Upgrade to Premium
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => setShowRefillModal(true)}
                                    size="icon"
                                    className="w-10 h-10 rounded-xl bg-red-600/90 text-white hover:bg-red-700 shadow-xl shadow-red-600/20 mx-auto"
                                    title="Upgrade to Premium"
                                >
                                    <Sparkles className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </aside>
                <PromptChecklist open={checklistOpen} onOpenChange={setChecklistOpen} />

                {/* Main Content Area - fills remaining space, centers content independently */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="mesh-background opacity-20" />

                    {/* Top Static Bar - Ultra Thin & Professional */}
                    <div className={`hidden md:flex items-center justify-between px-6 py-1.5 bg-white dark:bg-[#15171a] border-b border-slate-200 dark:border-white/5 z-40 shrink-0 w-full min-h-[52px] transition-transform duration-300 ${fullScreen ? `md:absolute md:top-0 md:left-0 md:right-0 md:shadow-lg ${reveal.top ? 'md:translate-y-0' : 'md:-translate-y-full'}` : ''}`}>
                        <div className="flex items-center gap-4">
                             <div>
                                <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none">AI Studio</h2>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#e11d48] mt-0.5 opacity-80">Ready</p>
                            </div>
                            
                            {serverClaims.is_admin && (
                                <div className="flex items-center gap-2 ml-4 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <span className="text-[9px] font-black uppercase text-amber-600 px-2 tracking-widest">Account:</span>
                                    <button 
                                        onClick={() => switchEnvironmentView('professional')}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${role === 'professional' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-600/10'}`}
                                    >
                                        Pro User
                                    </button>
                                    <button 
                                        onClick={() => switchEnvironmentView('admin')}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${role === 'admin' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-600/10'}`}
                                    >
                                        Admin
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {hasActiveSession && designPackage && (
                                <button
                                    onClick={() => setFullScreenPref(v => !v)}
                                    className={`h-8 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${fullScreenPref ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}
                                    title="Full screen: the menus hide until your pointer reaches the edge of the screen"
                                >
                                    Full screen {fullScreenPref ? 'on' : 'off'}
                                </button>
                            )}
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-64 h-8 rounded-lg bg-white dark:bg-[#1c1d21] border border-slate-200 dark:border-white/10 font-bold text-[9px] uppercase tracking-widest shadow-none hover:border-slate-300 dark:hover:border-white/20 focus:ring-1 ring-primary/20 transition-all flex items-center justify-start gap-3 px-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-bold">Pick A Role:</span>
                                        <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />
                                    </div>
                                    <SelectValue placeholder="Select Profession" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#1c1d21] border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    {professionalRoles.map(r => (
                                        <SelectItem
                                            key={r.name}
                                            value={r.name}
                                            className="font-bold text-[9px] uppercase tracking-widest py-2.5 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="scale-75 opacity-70">{r.icon}</span>
                                                {r.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Main Workspace - Genspark Minimalist Style */}
                    <div className={`flex-1 flex flex-col transition-all duration-700 w-full relative z-[30] overflow-y-auto custom-scrollbar ${(hasActiveSession || isGenerating) ? 'bg-white dark:bg-[#15171a]' : 'items-center justify-center p-4 md:p-8 bg-white dark:bg-background'}`}>
                        
                        {!hasActiveSession && !isGenerating ? (
                            /* --- IDLE STATE: Massive Centered UI --- */
                            <div className="w-full max-w-3xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 mb-[10vh]">
                                <div className="text-center mb-8 md:mb-12">
                                    <h1 className="text-3xl md:text-[2.75rem] font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-2">
                                        What are you <span className="text-primary">designing today?</span>
                                    </h1>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-widest uppercase mb-4 md:mb-0">Your brief in, your plans out · {selectedRole} mode</p>
                                </div>
                                
                                <div className="w-full relative">
                                    <div className="bg-white dark:bg-[#1c1d21] rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl focus-within:ring-4 ring-primary/10 transition-all flex flex-col">
                                        <textarea
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder={`Describe your building: its type, plot size, storeys and rooms (e.g. a 5-bedroom duplex on a 15 m x 30 m plot in Lekki)...`}
                                            className="w-full min-h-[140px] bg-transparent resize-none p-6 md:p-8 text-slate-900 dark:text-white font-medium outline-none placeholder:text-slate-400 placeholder:text-lg text-lg"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleGenerate();
                                                }
                                            }}
                                        />
                                        <div className="flex items-center justify-between px-4 pb-4">
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl h-10 w-10 bg-slate-50 dark:bg-white/5"><Plus className="w-5 h-5" /></Button>
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => setUltraMode(!ultraMode)}
                                                    className={`rounded-xl h-10 px-4 font-semibold text-[11px] uppercase tracking-widest transition-all ${ultraMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-white/5'}`}
                                                >
                                                    <Sparkles className={`w-3.5 h-3.5 mr-2 ${ultraMode ? 'animate-pulse' : ''}`} /> Ultra
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl h-10 w-10"><Mic className="w-5 h-5" /></Button>
                                                <Button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating || !promptText}
                                                    className="h-12 w-12 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-0"
                                                >
                                                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -top-3 right-8 bg-white dark:bg-[#1c1d21] border border-slate-200 dark:border-white/5 shadow-sm px-3 py-1 rounded-full flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">Super Agent</span>
                                    </div>
                                </div>
                                {/* the design data notice (design_events): users are told their briefs are kept */}
                                <p className="mt-3 text-center text-[11px] text-slate-400">Your briefs and the plans drawn from them are saved to improve AI Studio's designs for Nigeria. They are never shown to other users.</p>

                                <div className="flex flex-wrap justify-center gap-3 mt-10">
                                    {professionalRoles.find(r => r.name === selectedRole)?.recipes.map((r, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPromptText(r)}
                                            className="px-5 py-3 bg-white dark:bg-[#1c1d21] hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-white/5 transition-all shadow-sm flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                                <PenTool className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            Creative Recipe #{i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                                                ) : (                            /* --- ACTIVE STATE: Conversational Stream --- */
                            <div className="w-full h-full flex flex-col relative animate-in fade-in duration-500">
                                
                                {/* Scrollable Chat Log */}
                                <div className={`flex-1 w-full overflow-y-auto custom-scrollbar pb-40 px-4 ${fullScreen ? 'pt-6 md:px-10' : 'pt-20 md:px-0'}`}>
                                    <div className={`${fullScreen ? 'max-w-none' : 'max-w-4xl'} mx-auto flex flex-col gap-8 md:gap-12 pb-20`}>
                                        
                                        {messages.map((msg, mIdx) => (
                                            <div key={mIdx} className="flex flex-col gap-6">
                                                {msg.role === 'user' ? (
                                                    /* User Prompt Bubble */
                                                    <div className="flex justify-end w-full animate-in slide-in-from-right-4 duration-300">
                                                        <div className="bg-slate-100 dark:bg-[#202123] px-6 py-4 rounded-[1.5rem] rounded-tr-sm max-w-2xl text-slate-800 dark:text-slate-100 font-medium text-[14px] md:text-base leading-relaxed shadow-sm border border-slate-200 dark:border-white/5">
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* AI Response Stream */
                                                    <div className="flex justify-start items-start gap-4 md:gap-6 w-full animate-in slide-in-from-left-4 duration-500">
                                                        <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 shadow-lg mt-1">
                                                            <Sparkles className="w-4 h-4 text-white dark:text-slate-900" />
                                                        </div>
                                                        <div className="flex-1 pt-1 min-w-0">
                                                            <div className="w-full text-slate-700 dark:text-slate-300 text-[14px] md:text-[15px] leading-[1.8] font-medium">
                                                                {/* react-markdown 10 takes no className (dev builds throw on it) */}
                                                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {sanitizeResultText(msg.content) || ""}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Latest AI Technical Output (Pinned to the end of the latest response) */}
                                        {!isGenerating && designPackage && (
                                            <div className="w-full space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                {SHOW_BUILDING_PICTURE && (visualUrl || isVisualizing) && designPackage.status !== 'DISCOVERY' && (
                                                    <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xl group relative">
                                                        {isVisualizing ? (
                                                            <div className="aspect-[16/9] w-full flex flex-col items-center justify-center p-12 space-y-6">
                                                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Drawing Your Design</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <img 
                                                                    src={visualUrl || ""} 
                                                                    alt="AI Visualization" 
                                                                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                />
                                                                <div className="absolute top-4 right-4 flex gap-2">
                                                                    <Badge className="bg-primary text-white border-none text-[8px] font-black">ULTRA-REALISTIC RENDER</Badge>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {designPackage.status === 'DISCOVERY' ? (
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {designPackage.discovery_questions?.map((q: string, i: number) => (
                                                            <button 
                                                                key={i} 
                                                                onClick={() => setPromptText(q)}
                                                                className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:border-primary/30 transition-all flex items-start gap-4 text-left"
                                                            >
                                                                <span className="text-[10px] font-black text-primary/40 mt-1">{String(i + 1).padStart(2, '0')}</span>
                                                                <p className="text-sm text-slate-700 dark:text-slate-200 font-bold">{q}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* the edit loop: what the follow-up changed, and how much of the plan stayed */}
                                                        {designPackage?.edit?.swap && (
                                                            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Your edit</p>
                                                                    <div className="flex items-center gap-4">
                                                                        {!designPackage.edit.swap.fitted && designPackage.solvedLayout?.search_state?.floors?.some((f: any) => f.pinned?.length) && (
                                                                            <button onClick={fitSwapSizes} disabled={fitting} title="Give the swapped rooms the brief's sizes in their new places; the rooms around them give or take the space"
                                                                                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-60">{fitting ? 'Fitting…' : 'Fit sizes'}</button>
                                                                        )}
                                                                        {swapUndo.length > 0 && (
                                                                            <button onClick={undoSwap} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Undo</button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-200">{designPackage.edit.swap.said}.</p>
                                                                {designPackage.edit.swap.notes.length > 0 && (
                                                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Check: {designPackage.edit.swap.notes.join('; ')}.</p>
                                                                )}
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">{designPackage.edit.swap.fitted ? 'The swapped rooms kept their new places.' : 'Every other room stayed where it was; the swapped rooms traded sizes too (Fit sizes gives them their own).'} Doors, windows, the column grid and the code check follow the new plan.</p>
                                                            </div>
                                                        )}
                                                        {designPackage?.edit && !designPackage.edit.swap && (
                                                            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Your edit</p>
                                                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                                                    {designPackage.edit.changes.length
                                                                        ? designPackage.edit.changes.map((c: any) => c.kind === 'added' ? `Added ${c.name} (${c.detail})` : c.kind === 'removed' ? `Removed ${c.name}` : c.kind === 'moved' ? `${c.name} moved from the ${c.detail}` : `${c.name}: ${c.detail}`).join(' · ')
                                                                        : 'No rooms changed in the brief.'}
                                                                </p>
                                                                {designPackage.edit.missed?.length > 0 && (
                                                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                                                        Not done: {designPackage.edit.missed.join('; ')}. The planner couldn't fit {designPackage.edit.missed.length > 1 ? 'these' : 'it'} on this plot with the other rooms where the brief puts them. Try another spot for it, or press Re-plan for other layouts.
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {designPackage.edit.warm && designPackage.edit.kept
                                                                        ? `The plan was kept: ${designPackage.edit.kept.kept} of ${designPackage.edit.kept.of} rooms are where they were.`
                                                                        : designPackage.edit.kept
                                                                            ? `The change didn't fit the previous layout, so the plan was redrawn (${designPackage.edit.kept.kept} of ${designPackage.edit.kept.of} rooms are where they were).`
                                                                            : 'The plan was redrawn.'}
                                                                    {' '}To start again from nothing, press New Project.
                                                                </p>
                                                            </div>
                                                        )}
                                                        {(layoutChoices.length > 1 || layoutOptions.loading) && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Layout options</span>
                                                                {layoutOptions.loading && (
                                                                    <span className="text-[10px] font-bold text-slate-400 animate-pulse">Finding alternatives…</span>
                                                                )}
                                                                {layoutChoices.length > 1 && layoutChoices.map((opt, i) => {
                                                                    const active = layoutSignature(opt) === layoutKey;
                                                                    const s = opt.layout_score;
                                                                    return (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => { setSwapUndo([]); setDesignPackage((prev: any) => prev ? { ...prev, solvedLayout: opt, edit: prev.edit?.swap ? undefined : prev.edit } : prev); recordDesign('option', `Option ${i + 1}`, designPackage, opt); }}
                                                                            title={s ? `Score ${s.total}/100 — area fit ${s.area}, adjacency ${s.adjacency}, compactness ${s.compactness}, windows ${s.window}, circulation ${s.circulation}` : undefined}
                                                                            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                                                                                active
                                                                                    ? 'border-primary bg-primary/10 text-primary'
                                                                                    : 'border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-primary/30'
                                                                            }`}
                                                                        >
                                                                            Option {i + 1}{s ? ` · ${Math.round(s.total)}` : ''}{i === 0 && s ? ' · Best' : ''}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {failureExplanation ? (
                                                            <div className="p-6 rounded-2xl border border-amber-800 bg-amber-950 flex flex-col gap-4 shadow-2xl">
                                                                <div className="flex items-start gap-3">
                                                                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-sm font-black text-amber-100">{failureExplanation.title}</p>
                                                                        <p className="text-xs text-amber-200/80 mt-1">No floor plan was drawn, so there is no picture of the building and no building-code check: both need a plan.</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Why</p>
                                                                    {failureExplanation.reasons.map((r, i) => (
                                                                        <p key={i} className="text-xs text-amber-100">{r}</p>
                                                                    ))}
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">What you can change</p>
                                                                    {failureExplanation.suggestions.map((s, i) => (
                                                                        <p key={i} className="text-xs text-amber-100">• {s}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {compromiseExplanation && (
                                                                    <div className="p-5 rounded-2xl border border-amber-800 bg-amber-950 flex flex-col gap-3 shadow-2xl">
                                                                        <div className="flex items-start gap-3">
                                                                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-sm font-black text-amber-100">Compromise plan — not every requirement could be met</p>
                                                                                <p className="text-xs text-amber-200/80 mt-1">
                                                                                    Every room is placed and nothing overlaps, but some rooms don't touch the rooms they should, lack an outside wall, or were resized. Each one is listed under Placement Notes below for review.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Why a full plan wasn't possible</p>
                                                                            {compromiseExplanation.reasons.map((r, i) => (
                                                                                <p key={i} className="text-xs text-amber-100">{r}</p>
                                                                            ))}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">For a plan without compromises</p>
                                                                            {compromiseExplanation.suggestions.map((t, i) => (
                                                                                <p key={i} className="text-xs text-amber-100">• {t}</p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <AECSitePlan layout={stableLayout} setbacks={designPackage?.setback?.plan?.setbacks} />
                                                                <AECFloorPlan layout={stableLayout} onSwap={handleSwap} canSwap={id => !!stableLayout && swappable(stableLayout, id)} />
                                                                <AECElevations layout={stableLayout} />
                                                                <AECSection layout={stableLayout} />
                                                                <AECMassingView layout={stableLayout} setbacks={designPackage?.setback?.plan?.setbacks} />
                                                                <AECBillOfQuantities layout={stableLayout} />
                                                            </>
                                                        )}

                                                        {/* Hired reviewers (and the admin, to try it) score the plan shown */}
                                                        {user && (serverClaims.is_reviewer || serverClaims.is_admin) && (
                                                            <DesignReviewPanel
                                                                userId={user.id}
                                                                userEmail={user.email}
                                                                discipline={serverClaims.reviewer_discipline}
                                                                prompts={messages.filter(m => m.role === 'user').map(m => String(m.content ?? ''))}
                                                                designPackage={designPackage}
                                                                layout={stableLayout}
                                                            />
                                                        )}
                                                        
                                                        {/* ── REAL COMPLIANCE BANNER — driven by compliance_engine.ts ── */}
                                                        {complianceReport && (
                                                            <div className={`p-6 rounded-2xl border flex flex-col gap-4 shadow-2xl ${
                                                                complianceReport.overall_status === 'COMPLIANT'
                                                                    ? 'bg-emerald-950 border-emerald-800'
                                                                    : complianceReport.overall_status === 'REQUIRES_REVIEW'
                                                                    ? 'bg-amber-950 border-amber-800'
                                                                    : 'bg-red-950 border-red-900'
                                                            }`}>
                                                                {/* Status row */}
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <ShieldCheck className={`w-6 h-6 ${
                                                                            complianceReport.overall_status === 'COMPLIANT' ? 'text-emerald-400'
                                                                            : complianceReport.overall_status === 'REQUIRES_REVIEW' ? 'text-amber-400'
                                                                            : 'text-red-400'
                                                                        }`} />
                                                                        <div>
                                                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">
                                                                                NBC 2006 Pre-Screen: {complianceReport.overall_status.replace('_', ' ')}
                                                                            </h4>
                                                                            <p className="text-[9px] text-slate-400">
                                                                                {complianceReport.pass_count} passed · {complianceReport.fail_count} failed · {complianceReport.warn_count} warning{complianceReport.warn_count === 1 ? '' : 's'} · {complianceReport.checked_against}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button onClick={handleExportDXF} size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
                                                                            Export .DXF
                                                                        </Button>
                                                                        <Button onClick={handleDownloadBlueprint} size="sm" className="bg-primary text-white hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
                                                                            Download PDF
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Rule results — show failures and warnings only */}
                                                                {(complianceReport.fail_count > 0 || complianceReport.warn_count > 0) && (
                                                                    <div className="space-y-1.5 mt-1">
                                                                        {complianceReport.results
                                                                            .filter(r => r.status !== 'PASS')
                                                                            .map((r, i) => (
                                                                            <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg text-[10px] ${
                                                                                r.status === 'FAIL' ? 'bg-red-900/40 text-red-200' : 'bg-amber-900/40 text-amber-200'
                                                                            }`}>
                                                                                <span className="font-black mt-0.5 shrink-0">{r.status}</span>
                                                                                <span>{r.message}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Setback summary */}
                                                                <div className="flex gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider border-t border-white/5 pt-3">
                                                                    <span>Front setback: {setback?.plan.setbacks.front ?? complianceReport.setback_summary.front_m}m</span>
                                                                    <span>Rear: {setback?.plan.setbacks.rear ?? complianceReport.setback_summary.rear_m}m</span>
                                                                    <span>Side: {setback ? `${setback.plan.setbacks.left}/${setback.plan.setbacks.right}` : complianceReport.setback_summary.side_m}m</span>
                                                                    <span>Slab: {complianceReport.structural_summary.slab_thickness_mm}mm</span>
                                                                    <span>Live load: {complianceReport.structural_summary.live_load_kN_per_m2} kN/m²</span>
                                                                </div>

                                                                {/* Disclaimer */}
                                                                <p className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                                                                    {complianceReport.disclaimer}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* ── SETBACKS — the law in force, clashes and the user's choice ── */}
                                                        {setback && (
                                                            <div className={`p-6 rounded-2xl border flex flex-col gap-4 shadow-2xl ${
                                                                setback.advice ? 'bg-amber-950 border-amber-800' : 'bg-slate-900 border-slate-800'
                                                            }`}>
                                                                <div className="flex items-center gap-4">
                                                                    <Ruler className={`w-6 h-6 ${setback.advice ? 'text-amber-400' : 'text-slate-500'}`} />
                                                                    <div>
                                                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-white">
                                                                            Setbacks{setback.advice ? ' — check before you build' : ''}
                                                                        </h4>
                                                                        <p className="text-[9px] text-slate-400">
                                                                            {setback.plan.label} · front {setback.plan.setbacks.front} m · rear {setback.plan.setbacks.rear} m · sides {setback.plan.setbacks.left} / {setback.plan.setbacks.right} m
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {setback.advice && (
                                                                    <div className="space-y-2">
                                                                        <p className="px-3 py-2 rounded-lg text-[10px] bg-amber-900/40 text-amber-200">{setback.advice.message}</p>
                                                                        {setback.advice.other.map((o, i) => (
                                                                            <p key={i} className="px-3 text-[10px] text-amber-200/80">• {o}</p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {/* Outbuildings that don't fit inside the setbacks: the user may allow the rear setback */}
                                                                {!setback.plan.choice.outbuildingsInRear && placementIssues.some(i => i.rule === 'OUTBUILDING_NO_FIT') && (
                                                                    <Button size="sm" variant="outline" disabled={replanning}
                                                                        onClick={() => replanSetbacks({ ...setback.plan.choice, outbuildingsInRear: true })}
                                                                        className="bg-transparent rounded-xl text-[9px] font-black uppercase tracking-widest h-auto py-2 px-3 whitespace-normal text-left text-amber-200 border-amber-700 hover:bg-amber-900/40 self-start">
                                                                        Re-plan: allow the BQ / generator house in the rear setback
                                                                    </Button>
                                                                )}
                                                                {(stableLayout?.outbuildings ?? []).some((b: any) => b.in_rear_setback) && (
                                                                    <p className="px-3 py-2 rounded-lg text-[10px] bg-amber-900/40 text-amber-200">
                                                                        {(stableLayout?.outbuildings ?? []).filter((b: any) => b.in_rear_setback).map((b: any) => b.label).join(' and ')} stand{(stableLayout?.outbuildings ?? []).filter((b: any) => b.in_rear_setback).length > 1 ? '' : 's'} in the rear setback, 3 m behind the house. Confirm with your planning authority.
                                                                    </p>
                                                                )}
                                                                {setback.options.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {setback.options.map((o, i) => (
                                                                            <Button key={i} size="sm" variant="outline" disabled={replanning}
                                                                                onClick={() => replanSetbacks(o.choice)}
                                                                                className={`bg-transparent rounded-xl text-[9px] font-black uppercase tracking-widest h-auto py-2 px-3 whitespace-normal text-left ${
                                                                                    o.fits ? 'text-emerald-200 border-emerald-700 hover:bg-emerald-900/40' : o.squeeze !== null ? 'text-amber-200 border-amber-700 hover:bg-amber-900/40' : 'text-slate-300 border-white/10 hover:bg-white/5'
                                                                                }`}>
                                                                                Re-plan: {o.label} · {Math.round(o.area)} m² {o.fits ? '(fits)' : o.squeeze !== null ? (o.squeeze > 0 ? `(fits with rooms about ${o.squeeze}% smaller)` : '(fits, tight)') : '(too small)'}
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <p className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                                                                    You choose the law: name it in your brief (e.g. "Lagos", "Abuja", "NBC high density", "corner plot", "4.5m front setback") or re-plan above. Confirm setbacks with your planning authority before submission.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* ── PLACEMENT NOTES — driven by SolveResult.issues (Phase 5) ── */}
                                                        {placementIssues.length > 0 && (
                                                            <div className={`p-6 rounded-2xl border flex flex-col gap-4 shadow-2xl ${
                                                                severeIssueCount > 0
                                                                    ? 'bg-amber-950 border-amber-800'
                                                                    : 'bg-slate-900 border-slate-800'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <DraftingCompass className={`w-6 h-6 ${severeIssueCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                                                                        <div>
                                                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">
                                                                                Placement Notes
                                                                            </h4>
                                                                            <p className="text-[9px] text-slate-400">
                                                                                {severeIssueCount} room{severeIssueCount === 1 ? '' : 's'} flagged for review
                                                                                {warnIssueCount > 0 ? ` · ${warnIssueCount} advisory note${warnIssueCount === 1 ? '' : 's'}` : ''}
                                                                                {' · solver-derived, generated automatically'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 mt-1">
                                                                    {placementIssues.map((issue, i) => (
                                                                        <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg text-[10px] ${
                                                                            ADVISORY_RULES.has(issue.rule)
                                                                                ? 'bg-amber-900/40 text-amber-200'
                                                                                : 'bg-red-900/40 text-red-200'
                                                                        }`}>
                                                                            <span className="font-black mt-0.5 shrink-0">
                                                                                {ADVISORY_RULES.has(issue.rule) ? 'WARN' : 'REVIEW'}
                                                                            </span>
                                                                            <span>{issue.detail}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <p className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                                                                    These notes come from the layout solver's own placement rules — not NBC 2006
                                                                    compliance (see the banner above). They flag rooms an architect should double-check
                                                                    before this layout goes to a professional for review.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Fallback banner when compliance engine hasn't run (no rooms in output) */}
                                                        {!complianceReport && designPackage && (
                                                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-2xl">
                                                                <div className="flex items-center gap-4">
                                                                    <ShieldCheck className="w-6 h-6 text-slate-500" />
                                                                    <div>
                                                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Building Code Check Not Done Yet</h4>
                                                                        <p className="text-[9px] text-slate-400">We need each room's size to check the design against the NBC (National Building Code of Nigeria, 2006). Add the rooms you want, and their sizes, to your request.</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button onClick={handleExportDXF} size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
                                                                        Export .DXF
                                                                    </Button>
                                                                    <Button onClick={handleDownloadBlueprint} size="sm" className="bg-primary text-white hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
                                                                        Download PDF
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── MANDATORY DOCUMENT PACKAGE (NBC 2006 / aec_production_guidelines.md) ── */}
                                                        {/* These panels surface the four additional outputs the Hive now returns.    */}
                                                        {/* They appear only when the relevant data is present in designPackage.      */}
                                                        <div className="space-y-3">
                                                            {/* Structural Notes */}
                                                            {designPackage.structural_notes && (
                                                                <details className="group rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                                    <summary className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 cursor-pointer list-none">
                                                                        <div className="flex items-center gap-3">
                                                                            <DraftingCompass className="w-4 h-4 text-primary" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Structural Engineering Notes</span>
                                                                        </div>
                                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                                    </summary>
                                                                    <div className="px-6 py-4 bg-white dark:bg-black/20 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                        {designPackage.structural_notes}
                                                                    </div>
                                                                </details>
                                                            )}

                                                            {/* Buildability Report */}
                                                            {designPackage.buildability_report && (
                                                                <details className="group rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                                    <summary className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 cursor-pointer list-none">
                                                                        <div className="flex items-center gap-3">
                                                                            <HardHat className="w-4 h-4 text-primary" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">How Easy It Is to Build and Look After</span>
                                                                        </div>
                                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                                    </summary>
                                                                    <div className="px-6 py-4 bg-white dark:bg-black/20 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                        {designPackage.buildability_report}
                                                                    </div>
                                                                </details>
                                                            )}

                                                            {/* H&S Plan */}
                                                            {designPackage.h_and_s_notes && (
                                                                <details className="group rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                                    <summary className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 cursor-pointer list-none">
                                                                        <div className="flex items-center gap-3">
                                                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Health & Safety Plan</span>
                                                                        </div>
                                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                                    </summary>
                                                                    <div className="px-6 py-4 bg-white dark:bg-black/20 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                        {designPackage.h_and_s_notes}
                                                                    </div>
                                                                </details>
                                                            )}

                                                            {/* Construction Programme */}
                                                            {designPackage.construction_programme && (
                                                                <details className="group rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                                    <summary className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 cursor-pointer list-none">
                                                                        <div className="flex items-center gap-3">
                                                                            <History className="w-4 h-4 text-primary" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Building Schedule</span>
                                                                        </div>
                                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                                    </summary>
                                                                    <div className="px-6 py-4 bg-white dark:bg-black/20 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                        {designPackage.construction_programme}
                                                                    </div>
                                                                </details>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {isGenerating && (
                                            <div className="flex justify-start items-center gap-4 animate-pulse">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Drafting your design...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Floating Bottom Input Bar */}
                                {fullScreen && !showBottom && (
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-40">
                                        <span className="px-3 py-1 rounded-full bg-slate-900/70 text-white text-[10px] font-bold tracking-wide">Move your pointer to the bottom edge to refine your design, or to the left and top edges for the menus</span>
                                    </div>
                                )}
                                <div className={`absolute bottom-8 left-0 right-0 flex justify-center px-4 z-50 transition-all duration-300 ${showBottom ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'}`}>
                                    <div className="w-full max-w-3xl bg-white dark:bg-[#1c1d21] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl focus-within:ring-2 ring-primary/20 flex items-center p-2 gap-2">
                                        <input
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder="Refine your design: add or resize a room, move the kitchen, change the plot or setbacks..."
                                            onFocus={() => setPromptFocused(true)}
                                            onBlur={() => setPromptFocused(false)}
                                            className="flex-1 bg-transparent px-4 py-2 text-sm font-medium outline-none text-slate-900 dark:text-white"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleGenerate();
                                            }}
                                        />
                                        <Button 
                                            onClick={handleGenerate}
                                            disabled={isGenerating || !promptText}
                                            size="icon"
                                            className="rounded-xl h-10 w-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <Dialog open={showRefillModal} onOpenChange={setShowRefillModal}>
                    <DialogContent className="max-w-4xl p-0 md:rounded-[2.5rem] border-none md:shadow-3xl bg-transparent md:bg-white md:dark:bg-background shadow-none [&>button]:text-white md:[&>button]:text-slate-400 md:dark:[&>button]:text-slate-500 [&>button]:opacity-100 [&>button]:scale-150 md:[&>button]:scale-100">
                        <div className="p-4 md:p-12">
                            <DialogHeader className="mb-4 md:mb-10 text-center">
                                <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tight text-white md:text-slate-900 md:dark:text-white flex items-center justify-center gap-2">
                                    <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-primary" /> Refill AI Credits
                                </DialogTitle>
                                <DialogDescription className="text-xs md:text-lg font-medium italic text-slate-300 md:text-slate-500 max-w-xl mx-auto mt-1 md:mt-4">
                                    Choose a package to power your AEC design visions.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                                {creditPackages.map((pack) => (
                                    <Card
                                        key={pack.name}
                                        className={`relative border-2 transition-all p-3 md:p-6 flex flex-col rounded-2xl md:rounded-[2.5rem] cursor-pointer w-full md:w-auto ${pack.popular 
                                            ? 'border-red-500 bg-slate-900/90 text-white dark:bg-red-500/10 dark:text-white backdrop-blur-md shadow-[0_0_20px_-5px_rgba(59,130,246,0.6)]' 
                                            : 'border-slate-100 dark:border-white/5 bg-white text-slate-900 dark:bg-white/5 dark:text-white dark:backdrop-blur-md'
                                            }`}
                                        onClick={() => handlePaystackPayment(pack)}
                                    >
                                        {pack.popular && (
                                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] md:text-[10px] font-black px-3 md:px-4 py-0.5 md:py-1 rounded-full uppercase tracking-widest">
                                                Most Popular
                                            </span>
                                        )}
                                        <div className="mb-2 md:mb-6">
                                            <h4 className={`text-[10px] md:text-sm font-black uppercase tracking-widest mb-0.5 md:mb-1 ${pack.popular ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>{pack.name}</h4>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl md:text-4xl font-black italic">{pack.credits}</span>
                                                <span className={`text-[8px] md:text-xs font-bold uppercase ${pack.popular ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>Credits</span>
                                            </div>
                                        </div>
                                        <p className={`hidden md:block text-sm font-medium italic mb-8 flex-grow ${pack.popular ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {pack.description}
                                        </p>
                                        <div className="mt-2 md:mt-auto">
                                            <div className="text-lg md:text-2xl font-black mb-2 md:mb-4 italic">
                                                ₦{pack.price.toLocaleString()}
                                            </div>
                                            <Button className={`w-full transition-all rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs h-9 md:h-12 ${pack.popular ? 'bg-white text-slate-900 hover:bg-primary hover:text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-primary hover:text-white'}`}>
                                                Buy Node
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default AIStudio;
