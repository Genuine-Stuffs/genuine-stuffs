import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
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
    PenTool
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
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
import AECBillOfQuantities from '@/components/aec/AECBillOfQuantities';
import AECMassingView from '@/components/aec/AECMassingView';
import { solveLayout } from '@/lib/aec/solver/engine';
import { solveLayoutV2 } from '@/lib/aec/solver/engine_v2';
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

const AIStudio = () => {
    const { user, role, serverClaims, switchEnvironmentView } = useAuth();
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
    const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
    const [promptText, setPromptText] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [ultraMode, setUltraMode] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatSessions, setChatSessions] = useState<any[]>([]);
    // Latches to true the moment any prompt is submitted — never resets from API failures
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const isMobile = useIsMobile();

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
                    .single();

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
                        .single();
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
        const isPremium = subscriptionStatus === 'active' || (credits !== null && credits > 10) || role === 'admin' || role === 'pm';
        if (!isPremium) {
            toast.error("Download blocked. Please purchase a credit package to unlock document exports.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        toast.info("Preparing high-resolution blueprint...");

        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(20, 20, 20);
        doc.text("AEC BLUEPRINT REPORT", 14, 22);
        
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated via Material Insight AI Studio Node`, 14, 30);
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

        doc.save(`MaterialInsight_Blueprint_${selectedRole.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
        toast.success("Professional Blueprint Exported!");
    };

    const handleExportDXF = () => {
        if (!designPackage || !designPackage.architectural_layout) {
            toast.error("No design data available for CAD export.");
            return;
        }

        // SaaS Gating: Unlock only for premium or active packages (admins bypass)
        const isPremium = subscriptionStatus === 'active' || (credits !== null && credits > 10) || role === 'admin' || role === 'pm';
        if (!isPremium) {
            toast.error("Export blocked. Please purchase a credit package to unlock CAD downloads.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        // DXF Minimum Header
        let dxfContent = "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";

        designPackage.architectural_layout.forEach((element: any) => {
            if (element.svg_path) {
                // Parse SVG path to DXF LINE entities
                const commands = element.svg_path.split(/(?=[MLZ])/);
                let startPoint = { x: 0, y: 0 };
                let currentPoint = { x: 0, y: 0 };

                commands.forEach((cmd: string) => {
                    const type = cmd[0];
                    const rawCoords = cmd.slice(1).split(',').filter(p => p.trim() !== "");
                    const coords = rawCoords.map(Number);

                    if (type === 'M' && coords.length >= 2) {
                        startPoint = { x: coords[0], y: coords[1] };
                        currentPoint = { ...startPoint };
                    } else if (type === 'L' && coords.length >= 2) {
                        const nextPoint = { x: coords[0], y: coords[1] };
                        dxfContent += `0\nLINE\n8\n${element.type.toUpperCase()}\n10\n${currentPoint.x}\n20\n${currentPoint.y}\n30\n0.0\n11\n${nextPoint.x}\n21\n${nextPoint.y}\n31\n0.0\n`;
                        currentPoint = { ...nextPoint };
                    } else if (type === 'Z') {
                        dxfContent += `0\nLINE\n8\n${element.type.toUpperCase()}\n10\n${currentPoint.x}\n20\n${currentPoint.y}\n30\n0.0\n11\n${startPoint.x}\n21\n${startPoint.y}\n31\n0.0\n`;
                    }
                });
            }
        });

        dxfContent += "0\nENDSEC\n0\nEOF";

        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MaterialInsight_CAD_${designPackage.project_id || 'Design'}.dxf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("CAD File (.DXF) exported successfully!");
    };

    const handleGenerate = async () => {
        // Bypass credit check for admin/pm users based on server-verified claims
        if (!serverClaims.is_admin && !serverClaims.is_pm && (credits === null || credits < 2)) {
            toast.error("Insufficient credits.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        // IMMEDIATELY latch the session open — this is the single gate for the view switch
        setHasActiveSession(true);
        setIsGenerating(true);
        setGeneratedImage(null);
        setVisualUrl(null); // Clear previous vision state
        
        // Capture prompt BEFORE clearing the input field
        const submittedPrompt = promptText;

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

            // Run deterministic client-side solver if spatial program intent is provided
            if (hasDesignData && finalDesignData.rooms) {
                try {
                    // Assume standard 15x30m plot if unspecified
                    const plotWidth = finalDesignData.brief_reference?.plot_size_sqm ? Math.sqrt(finalDesignData.brief_reference.plot_size_sqm) : 15;
                    const plotDepth = finalDesignData.brief_reference?.plot_size_sqm ? (finalDesignData.brief_reference.plot_size_sqm / plotWidth) : 30;
                    
                    // Pass brief_reference floors to solver so duplex upper floor packs correctly.
                    // Guard both field names (floors / storeys) for schema compatibility.
                    const briefFloors = finalDesignData.brief_reference?.floors
                        ?? finalDesignData.brief_reference?.storeys
                        ?? 1;

                    const USE_SOLVER_V2 = false;
                    const solved = USE_SOLVER_V2 ? solveLayoutV2(finalDesignData, {
                        width: plotWidth,
                        depth: plotDepth,
                        setbacks: { front: 6, rear: 3, left: 3, right: 3 }
                    }, {
                        floors_override: briefFloors
                    }) : solveLayout(finalDesignData, {
                        width: plotWidth,
                        depth: plotDepth,
                        setbacks: { front: 6, rear: 3, left: 3, right: 3 }
                    }, {
                        floors_override: briefFloors
                    });
                    finalDesignData.solvedLayout = solved;
                    console.log("Client-side TS Solver generated geometry successfully.", solved);

                    // Run deterministic compliance check against NBC 2006 rules
                    try {
                        const report = runComplianceCheck({
                            rooms: finalDesignData.rooms,
                            plot_size_sqm: finalDesignData.brief_reference?.plot_size_sqm,
                            region: finalDesignData.brief_reference?.region || 'lagos_residential',
                            use_type: finalDesignData.brief_reference?.use_type || 'residential',
                        });
                        setComplianceReport(report);
                    } catch (complianceErr) {
                        console.error("Compliance engine error:", complianceErr);
                        setComplianceReport(null);
                    }
                } catch (solverErr) {
                    console.error("Client-side TS Solver failed to generate layout:", solverErr);
                }
            }

            // Batch all state updates together to prevent race-condition render flashes
            setGeneratedImage(cleanText);
            setDesignPackage(hasDesignData ? finalDesignData : null);
            // Remove promptText clear from here since we now clear it immediately on submit
            // Add assistant response to history BEFORE clearing isGenerating so the view never flashes back to idle
            setMessages(prev => [...prev, { role: 'assistant', content: data.result || 'Analysis complete.' }]);
            setIsGenerating(false);
            
            if (hasDesignData) {
                toast.success("AEC Spatial Program Synchronized.");
            } else if (cleanText) {
                toast.info("Design Analysis Ready.");
            } else {
                toast.info("Response received. See results below.");
            }

            // --- PATH 3: Decoupled High-Priority Rendering ---
            // Only fire if the AI deciphered that an image is appropriate
            if (data.data?.image_prompt) {
                setIsVisualizing(true);
                try {
                    const { data: vizData, error: vizError } = await supabase.functions.invoke('ai-studio', {
                        body: { 
                            prompt: data.data.image_prompt, 
                            type: 'visualize',
                            selectedRole: selectedRole 
                        }
                    });

                    if (vizError) throw vizError;
                    if (vizData?.imageUrl) {
                        setVisualUrl(vizData.imageUrl);
                    }
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
                    design: designPackage
                }, 
                ...prev
            ]);
        }
        
        // 100% Clean Slate — reset the session latch so idle screen returns
        setHasActiveSession(false);
        setMessages([]);
        setDesignPackage(null);
        setComplianceReport(null);
        setGeneratedImage(null);
        setVisualUrl(null);
        setPromptText("");
        setSidebarOpen(false);
        setMobileSidebarOpen(false);
        toast.success("New Project Session Initiated (Memory Cleared).");
    };

    const layoutKey = designPackage?.solvedLayout 
      ? `${designPackage.solvedLayout.plot_width}-${designPackage.solvedLayout.plot_depth}-${designPackage.solvedLayout.placed_rooms?.length}`
      : null;

    const stableLayout = useMemo(() => designPackage?.solvedLayout, [layoutKey]);

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
                    className={`fixed inset-y-0 left-0 md:relative flex flex-col bg-slate-50 dark:bg-card border-r border-slate-200 dark:border-border transition-all duration-300 z-[60] overflow-hidden flex-shrink-0 
                        ${sidebarOpen ? 'md:w-64' : 'md:w-16'}
                        ${mobileSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'}
                    `}
                >
                    <div className={`py-4 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar ${sidebarOpen ? 'px-5' : 'px-2'}`}>
                        {isMobile ? (
                            <>
                                {/* Mobile Sidebar — mirrors Desktop layout exactly */}
                                <div className="mb-6 flex items-center justify-between gap-1">
                                    <Button variant="ghost" asChild className="flex-1 justify-start gap-4 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white" onClick={() => setMobileSidebarOpen(false)}>
                                        <Link to="/">
                                            <Home className="w-4 h-4 text-slate-400" /> Home
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
                                        <Link to="/" title="Home">
                                            <Home className={`text-slate-400 ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'}`} /> {sidebarOpen && "Home"}
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

                {/* Main Content Area - fills remaining space, centers content independently */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="mesh-background opacity-20" />

                    {/* Top Static Bar - Ultra Thin & Professional */}
                    <div className="hidden md:flex items-center justify-between px-6 py-1.5 bg-white dark:bg-[#15171a] border-b border-slate-200 dark:border-white/5 z-40 shrink-0 w-full min-h-[52px]">
                        <div className="flex items-center gap-4">
                             <div>
                                <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none">Studio Environment</h2>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#e11d48] mt-0.5 opacity-80">Active AI Node</p>
                            </div>
                            
                            {serverClaims.is_admin && (
                                <div className="flex items-center gap-2 ml-4 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <span className="text-[9px] font-black uppercase text-amber-600 px-2 tracking-widest">Environment:</span>
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
                                        What can I <span className="text-primary">design?</span>
                                    </h1>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-widest uppercase mb-4 md:mb-0">Studio AI · {selectedRole} Mode</p>
                                </div>
                                
                                <div className="w-full relative">
                                    <div className="bg-white dark:bg-[#1c1d21] rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl focus-within:ring-4 ring-primary/10 transition-all flex flex-col">
                                        <textarea
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder={`Ask anything, create anything as ${selectedRole}...`}
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
                                <div className="flex-1 w-full overflow-y-auto custom-scrollbar pt-20 pb-40 px-4 md:px-0">
                                    <div className="max-w-4xl mx-auto flex flex-col gap-8 md:gap-12 pb-20">
                                        
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
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-slate dark:prose-invert max-w-none">
                                                                    {sanitizeResultText(msg.content) || ""}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Latest AI Technical Output (Pinned to the end of the latest response) */}
                                        {!isGenerating && designPackage && (
                                            <div className="w-full space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                {(visualUrl || isVisualizing) && designPackage.status !== 'DISCOVERY' && (
                                                    <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xl group relative">
                                                        {isVisualizing ? (
                                                            <div className="aspect-[16/9] w-full flex flex-col items-center justify-center p-12 space-y-6">
                                                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Rendering Design Vision</p>
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
                                                        <AECFloorPlan layout={stableLayout} />
                                                        <AECMassingView layout={stableLayout} />
                                                        <AECBillOfQuantities layout={stableLayout} materials={designPackage.material_schedule || []} />
                                                        
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
                                                                                {complianceReport.pass_count} passed · {complianceReport.fail_count} failed · {complianceReport.warn_count} warnings · {complianceReport.checked_against}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button onClick={handleExportDXF} size="sm" variant="outline" className="text-white border-white/10 hover:bg-white/5 rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
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
                                                                    <span>Front setback: {complianceReport.setback_summary.front_m}m</span>
                                                                    <span>Rear: {complianceReport.setback_summary.rear_m}m</span>
                                                                    <span>Side: {complianceReport.setback_summary.side_m}m</span>
                                                                    <span>Slab: {complianceReport.structural_summary.slab_thickness_mm}mm</span>
                                                                    <span>Live load: {complianceReport.structural_summary.live_load_kN_per_m2} kN/m²</span>
                                                                </div>

                                                                {/* Disclaimer */}
                                                                <p className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                                                                    {complianceReport.disclaimer}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Fallback banner when compliance engine hasn't run (no rooms in output) */}
                                                        {!complianceReport && designPackage && (
                                                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-2xl">
                                                                <div className="flex items-center gap-4">
                                                                    <ShieldCheck className="w-6 h-6 text-slate-500" />
                                                                    <div>
                                                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Compliance Pre-Screen Pending</h4>
                                                                        <p className="text-[9px] text-slate-400">Room geometry required for NBC 2006 validation. Refine your brief to include room specifications.</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button onClick={handleExportDXF} size="sm" variant="outline" className="text-white border-white/10 hover:bg-white/5 rounded-xl font-black uppercase tracking-widest text-[9px] px-6 h-9">
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
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Buildability & Maintainability Report</span>
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
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Construction Programme</span>
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
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AI is thinking...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Floating Bottom Input Bar */}
                                <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 z-50">
                                    <div className="w-full max-w-3xl bg-white dark:bg-[#1c1d21] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl focus-within:ring-2 ring-primary/20 flex items-center p-2 gap-2">
                                        <input
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder="Ask a follow-up or refine the design..."
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
