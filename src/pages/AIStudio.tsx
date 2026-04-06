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
    ShieldCheck
} from "lucide-react";
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
                        ${sidebarOpen ? 'md:w-64' : 'md:w-0 md:min-w-0 md:border-r-0'}
                        ${mobileSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'}
                    `}
                >
                    <div className="px-5 py-4 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
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
                                {/* Desktop Sidebar Layout - Condensed */}
                                <div className="mb-2 flex items-center gap-1">
                                    <Button variant="ghost" asChild className="flex-1 justify-start gap-4 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white">
                                        <Link to="/">
                                            <Home className="w-4 h-4 text-slate-400" /> Home
                                        </Link>
                                    </Button>
                                    <div className="flex items-center gap-0.5">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => { setPromptText(""); setGeneratedImage(null); toast.info("New project session initiated."); }} 
                                            className="rounded-xl h-8 w-8 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                                            title="New Project"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                        <ModeToggle />
                                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-xl h-8 w-8 shrink-0 hover:bg-white dark:hover:bg-white/5">
                                            <X className="w-5 h-5 text-slate-400" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 px-2">Studio Hub</p>
                                    <div className="space-y-0.5">
                                        <Button asChild variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                            <Link to="/pro/documentation">
                                                <BookOpen className="w-4 h-4 text-slate-400" /> Documentation
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                            <Building2 className="w-4 h-4 text-slate-400" /> Materials Hub
                                        </Button>
                                        <Button asChild variant="ghost" className="w-full justify-start gap-4 h-9 rounded-xl text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                                            <Link to="/pro-portal">
                                                <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard Feed
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Studio</span>
                                </div>
                            </>
                        )}

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

                        <div className="mt-auto pt-4 border-t dark:border-border">
                            <Button 
                                onClick={() => setShowRefillModal(true)}
                                className="w-full rounded-[1.5rem] bg-red-600/90 text-white hover:bg-red-700 h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/20"
                            >
                                Upgrade to Premium
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area - fills remaining space, centers content independently */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="mesh-background opacity-20" />

                    {/* Floating Header Controls */}
                    <div className="absolute top-0 right-0 left-0 hidden md:flex items-center justify-between p-6 z-30 pointer-events-none">
                        <div className="flex items-center gap-4 pointer-events-auto">
                            {!sidebarOpen && (
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl bg-white/50 dark:bg-card/50 backdrop-blur-md border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                                    <Menu className="w-5 h-5 text-slate-900 dark:text-white" />
                                </Button>
                            )}
                             <div className="bg-white/50 dark:bg-card/50 backdrop-blur-md border border-slate-200/50 dark:border-white/5 px-5 py-3 rounded-[1.5rem] shadow-sm">
                                <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Studio Environment</h2>
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-0.5">Active AI Node</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pointer-events-auto">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5 drop-shadow-sm bg-white/30 dark:bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">Pick A Role</span>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="w-56 h-12 rounded-2xl bg-white/70 dark:bg-background/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 font-bold text-xs uppercase tracking-widest shadow-lg focus:ring-primary/20 transition-all hover:bg-white dark:hover:bg-background">
                                        <SelectValue placeholder="Select Profession" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-card border-slate-200 dark:border-border rounded-xl overflow-hidden shadow-2xl">
                                        {professionalRoles.map(r => (
                                            <SelectItem
                                                key={r.name}
                                                value={r.name}
                                                className="font-bold text-xs uppercase tracking-widest py-3 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
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
                        </div>
                    </div>

                    {/* Centered Area - Scrollable space z-30 (Over Pick a Role, Under Studio Env) */}
                    <div className={`flex-1 flex flex-col transition-all duration-500 w-full relative z-[30] ${(!generatedImage && !isGenerating) ? 'items-center p-4 md:p-6 pt-[12dvh] md:pt-[100px] justify-start md:justify-center overflow-hidden' : 'p-0 justify-start overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-black'}`}>
                        <div className={`transition-all duration-500 flex flex-col min-h-full ${(!generatedImage && !isGenerating) ? 'w-full max-w-2xl py-2 md:py-4' : 'w-full'}`}>
                            
                            {!generatedImage && !isGenerating && (
                                <div className="text-center mb-4 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <h1 className="text-xl md:text-3xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-1 md:mb-2">
                                        What can I <span className="text-primary">design?</span>
                                    </h1>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mb-4 md:mb-0">Studio AI · {selectedRole} Mode</p>
                                </div>
                            )}

                            {/* Full-Screen Result View */}
                            {(generatedImage || isGenerating) && (
                                <div className="w-full flex-1 min-h-[100dvh] flex flex-col bg-slate-100 dark:bg-black/50 relative animate-in fade-in duration-700">
                                    {isGenerating ? (
                                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 pt-[100px]">
                                            <div className="relative">
                                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                                <Sparkles className="absolute -top-4 -right-4 w-6 h-6 text-yellow-500 animate-pulse" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesizing Protocol...</p>
                                        </div>
                                    ) : (
                                        <div className="relative flex-1 w-full h-full flex flex-col justify-end">
                                            {/* Cinematic architectural backdrop for the generated text */}
                                            <div className="absolute inset-0 z-0">
                                                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070" className="w-full h-full object-cover" alt="Architecture Core" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/30"></div>
                                            </div>

                                            {/* Text Analysis Content Layer */}
                                            <div className="relative z-10 flex flex-col justify-end p-8 md:p-16 pt-[20vh] pb-32">
                                                <h4 className="text-white font-black uppercase tracking-tight text-3xl md:text-5xl mb-2 drop-shadow-lg">{selectedRole} Analysis</h4>
                                                <p className="text-white/60 text-sm md:text-lg font-medium italic mb-8 max-w-3xl drop-shadow-md">"{promptText}"</p>
                                                
                                                <div className="text-white/90 text-sm md:text-base font-medium max-w-4xl whitespace-pre-wrap leading-[1.8] tracking-wide mb-10">
                                                    {generatedImage}
                                                </div>

                                                <div className="flex gap-4">
                                                    <Button size="lg" className="bg-white text-slate-900 hover:bg-primary hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Save Node</Button>
                                                    <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] backdrop-blur-sm"><Share2 className="w-4 h-4 mr-2" /> Dispatch</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Chat Input Container */}
                            <div className={`w-full relative ${(!generatedImage && !isGenerating) ? 'mt-auto mb-6' : 'max-w-3xl mx-auto px-4 md:px-0 -mt-20 mb-12 z-[40] relative'}`}>
                                <div className="relative">
                                    <div className="bg-white dark:bg-card rounded-3xl border border-slate-200 dark:border-border shadow-2xl focus-within:border-primary/40 transition-all flex flex-col">
                                        <textarea
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            placeholder={`Ask ${selectedRole} anything...`}
                                            className="w-full min-h-[60px] md:min-h-[100px] bg-transparent resize-none p-4 md:p-5 text-slate-900 dark:text-white font-medium outline-none placeholder:text-slate-400 placeholder:text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleGenerate();
                                                }
                                            }}
                                        />
                                            <div className="flex items-center justify-between px-3 pb-3">
                                                <div className="flex items-center gap-0.5">
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl h-8 w-8"><Paperclip className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl h-8 w-8"><ImageIcon className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl h-8 w-8"><Mic className="w-4 h-4" /></Button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[8px] font-semibold tracking-widest text-slate-400 uppercase hidden sm:block">2 Credits / Sync</span>
                                                    <Button
                                                        onClick={handleGenerate}
                                                        disabled={isGenerating || !promptText}
                                                        className="h-9 w-9 p-0 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                    >
                                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                    </div>
                                </div>
                            </div>

                             {/* Recipe Pills - BELOW Input (Claude style) */}
                             {!isGenerating && !generatedImage && (
                                 <div className="flex flex-wrap justify-center gap-2 mt-3 md:mt-5">
                                     {professionalRoles.find(r => r.name === selectedRole)?.recipes.map((r, i) => (
                                         <button
                                             key={i}
                                             onClick={() => setPromptText(r)}
                                             className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 dark:bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-primary rounded-xl border border-slate-200 dark:border-border transition-all whitespace-nowrap"
                                         >
                                             Creative Recipe #{i + 1}
                                         </button>
                                     ))}
                                 </div>
                             )}

                             {!isGenerating && !generatedImage && (
                                 <p className="text-center text-[9px] text-slate-400 mt-4 md:mt-6 tracking-widest opacity-40">Studio AI v4.0 · Verify critical outputs.</p>
                             )}
                        </div>{/* end min-h-full wrapper */}
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
