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
    Plus,
    PenTool
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
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

const AIStudio = () => {
    const { user, role } = useAuth();
    const isPro = role === "professional";
    const [searchParams] = useSearchParams();
    const [selectedRole, setSelectedRole] = useState("Architect");
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [promptText, setPromptText] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [ultraMode, setUltraMode] = useState(false);
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
                    .select('credits')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                setCredits(data?.credits ?? 0);
            } catch (err) {
                console.error("Error fetching credits:", err);
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

    const handleGenerate = async () => {
        if (credits === null || credits < 2) {
            toast.error("Insufficient credits.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const { data, error } = await supabase.functions.invoke('ai-studio', {
                body: { prompt: promptText, type: 'text' }
            });

            if (error) {
                const errorBody = await error.context?.json().catch(() => ({}));
                throw new Error(errorBody?.error || error.message);
            }

            if (data?.error) throw new Error(data.error);

            // Backend handles credit deduction; reflect it locally
            setCredits(prev => (prev !== null ? prev - 2 : prev));

            // Store text result for display
            setGeneratedImage(data.result);

            toast.success("Design Analysis Ready!");
        } catch (err: any) {
            toast.error(err.message || "Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

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
                                            onClick={() => { setPromptText(""); setGeneratedImage(null); toast.info("New project session initiated."); setMobileSidebarOpen(false); }}
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
                                        onClick={() => { setPromptText(""); setGeneratedImage(null); toast.info("New project session initiated."); }} 
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
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Recent Projects</p>
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

                    {/* Top Static Bar - Compact & Professional */}
                    <div className="hidden md:flex items-center justify-between px-6 py-2 bg-white dark:bg-[#15171a] border-b border-slate-200 dark:border-white/5 z-40 shrink-0 w-full h-[60px]">
                        <div className="flex items-center gap-4">
                             <div>
                                <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Studio Environment</h2>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#e11d48] mt-1 opacity-90">Active AI Node</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Pick A Role</span>
                                <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="w-48 h-7 bg-transparent border-none font-bold text-[10px] uppercase tracking-widest shadow-none hover:bg-transparent focus:ring-0 p-0 text-slate-700 dark:text-slate-200">
                                        <SelectValue placeholder="Select Profession" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1c1d21] border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                        {professionalRoles.map(r => (
                                            <SelectItem
                                                key={r.name}
                                                value={r.name}
                                                className="font-bold text-[10px] uppercase tracking-widest py-2.5 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="opacity-70 scale-75">{r.icon}</span>
                                                    {r.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Main Workspace - Genspark Minimalist Style */}
                    <div className={`flex-1 flex flex-col transition-all duration-700 w-full relative z-[30] overflow-y-auto custom-scrollbar ${(generatedImage || isGenerating) ? 'bg-white dark:bg-[#15171a]' : 'items-center justify-center p-4 md:p-8 bg-white dark:bg-background'}`}>
                        
                        {!generatedImage && !isGenerating ? (
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
                        ) : (
                            /* --- ACTIVE STATE: Conversational Stream --- */
                            <div className="w-full h-full flex flex-col relative animate-in fade-in duration-500">
                                
                                {/* Scrollable Chat Log */}
                                <div className="flex-1 w-full overflow-y-auto custom-scrollbar pt-32 pb-40 px-4 md:px-0">
                                    <div className="max-w-4xl mx-auto flex flex-col gap-8 md:gap-12">
                                        
                                        {/* User Prompt Bubble */}
                                        <div className="flex justify-end w-full">
                                            <div className="bg-slate-100 dark:bg-[#202123] px-6 py-4 rounded-[2rem] rounded-tr-lg max-w-2xl text-slate-800 dark:text-slate-100 font-medium text-[15px] md:text-base leading-relaxed shadow-sm">
                                                {promptText}
                                            </div>
                                        </div>

                                        {/* AI Response Stream */}
                                        <div className="flex justify-start items-start gap-4 md:gap-8 w-full">
                                            <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 dark:bg-white dark:border-slate-200 flex items-center justify-center shrink-0 shadow-lg mt-1 relative z-10">
                                                <Sparkles className="w-5 h-5 text-white dark:text-slate-900" />
                                            </div>
                                            <div className="flex-1 pt-1.5 pb-8 min-w-0">
                                                {isGenerating ? (
                                                    <div className="flex items-center gap-4 h-8 animate-pulse text-slate-400">
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        <span className="text-sm font-semibold tracking-wider uppercase">
                                                            {ultraMode ? "Synthesizing Deep Reasoning Protocol..." : "Synthesizing Protocol..."}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full text-slate-700 dark:text-slate-300 text-[15px] md:text-base leading-[1.8] font-medium">
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]} 
                                                            className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white prose-headings:font-black prose-headings:tracking-tight max-w-none break-words w-full"
                                                        >
                                                            {generatedImage || ""}
                                                        </ReactMarkdown>
                                                        
                                                        {/* Actions append at the bottom of the response */}
                                                        <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                                                            <Button variant="outline" className="text-slate-700 dark:text-white border-slate-300 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-[9px] h-10 px-5 shadow-sm bg-white dark:bg-transparent"><Share2 className="w-3.5 h-3.5 mr-2" /> Dispatch Node</Button>
                                                            <Button className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-primary dark:hover:bg-primary hover:text-white rounded-xl font-bold uppercase tracking-widest text-[9px] h-10 px-5 shadow-lg">Save Architecture</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Dock Text Input */}
                                <div className="absolute bottom-6 left-0 right-0 px-4 md:px-0 flex justify-center z-[50]">
                                    <div className="w-full max-w-3xl bg-white dark:bg-[#1c1d21] rounded-full border border-slate-200 dark:border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] md:shadow-2xl flex items-center p-1.5 md:p-2 transition-all focus-within:ring-2 ring-primary/20 bg-opacity-95 dark:bg-opacity-95 backdrop-blur-md">
                                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full h-10 w-10 md:h-12 md:w-12 mx-1 hidden sm:flex">
                                            <Plus className="w-5 h-5 md:w-6 md:h-6" />
                                        </Button>
                                        <Button variant="ghost" className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full h-10 md:h-12 px-3 md:px-4 hidden sm:flex font-semibold text-[10px] md:text-[11px] uppercase tracking-widest">
                                            <Sparkles className="w-3.5 h-3.5 mr-2" /> Ultra
                                        </Button>
                                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 mx-2 hidden sm:block"></div>
                                        <textarea
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder="Ask anything, follow up..."
                                            rows={1}
                                            className="flex-1 bg-transparent resize-none py-3 md:py-4 px-4 min-h-[48px] md:min-h-[56px] text-slate-800 dark:text-white font-medium outline-none placeholder:text-slate-400 text-sm md:text-base whitespace-nowrap overflow-hidden"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleGenerate();
                                                }
                                            }}
                                        />
                                        <div className="flex items-center shrink-0 gap-1 md:gap-2">
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full h-10 w-10 md:h-12 md:w-12">
                                                <Mic className="w-4 h-4 md:w-5 md:h-5" />
                                            </Button>
                                            <Button onClick={handleGenerate} disabled={isGenerating || !promptText} className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center p-0 shrink-0">
                                                {isGenerating ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />}
                                            </Button>
                                        </div>
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
        </div >
    );
};

export default AIStudio;
