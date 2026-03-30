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
            name: "QS",
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
                body: { prompt: promptText, type: 'image', model: 'openai/dall-e-3' }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setGeneratedImage(data.result);
            const nextCredits = credits - 2;
            setCredits(nextCredits);

            await supabase.from('professionals').update({ credits: nextCredits }).eq('id', user.id);

            toast.success("Design Vision Rendered!");
        } catch (err: any) {
            toast.error(err.message || "Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen md:h-[100dvh] md:relative fixed inset-0 overflow-hidden bg-white dark:bg-background z-0">
            {/* Mobile Header (Fixed) */}
            <header className="flex md:hidden items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-border bg-white dark:bg-card fixed top-0 left-0 right-0 z-[100]">
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)} className="rounded-xl">
                    <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Button>
                
                {/* Center empty as per standard (skipping 'Get App' button) */}
                <div />

                <Button variant="ghost" size="icon" onClick={() => { setPromptText(""); setGeneratedImage(null); toast.info("New project initiated."); }} className="rounded-xl">
                    <Plus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden relative selection:bg-primary/30 pt-14 md:pt-0">
                {/* Mobile Backdrop */}
                {mobileSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden animate-in fade-in duration-300"
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
                    <div className="px-6 py-6 flex flex-col h-full overflow-hidden">
                        <div className="mb-8">
                            <div className="flex items-center justify-between px-2 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Main Menu</span>
                                <Button variant="ghost" size="icon" onClick={() => { setSidebarOpen(false); setMobileSidebarOpen(false); }} className="rounded-xl h-8 w-8">
                                    <X className="w-5 h-5 text-slate-400" />
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <Button variant="ghost" asChild className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-xs" onClick={() => setMobileSidebarOpen(false)}>
                                    <Link to="/">
                                        <Home className="w-4 h-4 text-slate-400" /> Home
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-xs" onClick={() => setMobileSidebarOpen(false)}>
                                    <Link to="/pro-portal">
                                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10 transition-all font-black text-xs" onClick={() => setMobileSidebarOpen(false)}>
                                    <Link to="/pro/documentation">
                                        <BookOpen className="w-4 h-4 text-slate-400" /> Resources
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-8 px-2">
                            <Link to="/" className="group transition-transform active:scale-95">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </Link>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">AI Studio</span>
                        </div>

                        <button
                            onClick={() => {
                                setPromptText("");
                                setGeneratedImage(null);
                                setMobileSidebarOpen(false);
                                toast.info("New project session initiated.");
                            }}
                            className="flex items-center gap-3 w-full p-4 mb-8 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white text-xs text-left">New Project</span>
                        </button>

                        <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 italic mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    V4.0 Live Rendering
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Recent Projects</p>
                                <div className="space-y-1">
                                    {chatHistory.map((chat) => (
                                        <Button
                                            key={chat.id}
                                            variant="ghost"
                                            className="w-full justify-start px-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-9 transition-all text-[11px] font-medium text-slate-600 dark:text-slate-400 group overflow-hidden"
                                            onClick={() => {
                                                setPromptText(chat.title);
                                                setMobileSidebarOpen(false);
                                            }}
                                        >
                                            <span className="truncate flex-1">{chat.title}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t dark:border-border">
                            <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/5 mb-4 group cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-white/10">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'User'}</p>
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Professional</p>
                                </div>
                                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <CreditInfo
                                credits={credits ?? 0}
                                variant="compact"
                                isPro={true}
                                onRefill={() => setShowRefillModal(true)}
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Content Area - fills remaining space, centers content independently */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="mesh-background opacity-20" />

                    {/* Header (Top Nav) */}
                    <nav className="h-20 hidden md:flex items-center justify-between px-8 border-b border-slate-200/50 dark:border-border relative z-10 bg-white/50 dark:bg-card/50 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            {!sidebarOpen && (
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl">
                                    <Menu className="w-5 h-5 text-slate-500" />
                                </Button>
                            )}
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Studio Environment</h2>
                                <p className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">Active AI Node</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Pick A Profession</span>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="w-56 h-11 rounded-xl bg-white dark:bg-background border-slate-200 dark:border-border font-bold text-xs uppercase tracking-widest shadow-sm focus:ring-primary/20 transition-all">
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
                    </nav>

                    {/* Centered Area - uses absolute inset to stay centered in main regardless of sidebar state */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10 transition-all ${(!generatedImage && !isGenerating) ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden custom-scrollbar'}`}>
                        <div className="w-full max-w-2xl py-2 md:py-8 flex flex-col">
                        {!generatedImage && !isGenerating ? (
                            <div className="text-center mb-4 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h1 className="text-xl md:text-3xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-1 md:mb-2">
                                    What can I <span className="text-primary">design?</span>
                                </h1>
                                <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mb-4 md:mb-0">Studio AI · {selectedRole} Mode</p>
                            </div>
                        ) : null}

                        {/* Result View */}
                        {(generatedImage || isGenerating) && (
                            <div className="w-full flex-1 flex flex-col justify-center mb-8 max-h-[60vh]">
                                <div className="glass-card rounded-[3rem] overflow-hidden shadow-3xl border-slate-200 dark:border-border bg-white/70 dark:bg-card/50 relative group">
                                    {isGenerating ? (
                                        <div className="aspect-video flex flex-col items-center justify-center space-y-4">
                                            <div className="relative">
                                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                                <Sparkles className="absolute -top-4 -right-4 w-6 h-6 text-yellow-500 animate-pulse" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesizing Protocol...</p>
                                        </div>
                                    ) : (
                                        <div className="relative aspect-video">
                                            <img src={generatedImage!} alt="Generated Vision" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10">
                                                <h4 className="text-white font-black uppercase tracking-tight text-xl mb-2">{selectedRole} Concept</h4>
                                                <p className="text-white/60 text-sm italic line-clamp-2 max-w-xl">"{promptText}"</p>
                                                <div className="flex gap-4 mt-6">
                                                    <Button size="sm" className="bg-white text-slate-900 hover:bg-primary hover:text-white rounded-xl font-black uppercase tracking-widest text-[9px]">Save Node</Button>
                                                    <Button size="sm" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[9px]"><Share2 className="w-3 h-3 mr-2" /> Dispatch</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Chat Input Container */}
                        <div className="w-full mt-auto relative mb-6">
                            <div className="relative">
                                <div className="bg-white dark:bg-card rounded-3xl border border-slate-200 dark:border-border shadow-xl focus-within:border-primary/40 transition-all flex flex-col">
                                    <textarea
                                        value={promptText}
                                        onChange={(e) => setPromptText(e.target.value)}
                                        placeholder={`Ask ${selectedRole} anything...`}
                                        className="w-full min-h-[60px] md:min-h-[120px] bg-transparent resize-none p-4 md:p-5 text-slate-900 dark:text-white font-medium outline-none placeholder:text-slate-400 placeholder:text-sm"
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

                             {/* Recipe Pills - BELOW Input (Claude style) */}
                             {!isGenerating && (
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

                             <p className="text-center text-[9px] text-slate-400 mt-4 md:mt-6 tracking-widest opacity-40">Studio AI v4.0 · Verify critical outputs.</p>
                        </div>
                        </div>{/* end max-w-2xl wrapper */}
                    </div>
                </main>

                <Dialog open={showRefillModal} onOpenChange={setShowRefillModal}>
                    <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-3xl bg-white dark:bg-background">
                        <div className="p-8 md:p-12">
                            <DialogHeader className="mb-10 text-center">
                                <DialogTitle className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-3">
                                    <Sparkles className="w-8 h-8 text-primary" /> Refill AI Credits
                                </DialogTitle>
                                <DialogDescription className="text-lg font-medium italic text-slate-500 max-w-xl mx-auto mt-4">
                                    Choose a package to power your architectural design visions.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {creditPackages.map((pack) => (
                                    <Card
                                        key={pack.name}
                                        className={`relative group border-2 transition-all p-6 flex flex-col rounded-[2rem] hover:scale-[1.02] cursor-pointer ${pack.popular ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-card'
                                            }`}
                                        onClick={() => handlePaystackPayment(pack)}
                                    >
                                        {pack.popular && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                                                Most Popular
                                            </span>
                                        )}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{pack.name}</h4>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-slate-900 dark:text-white italic">{pack.credits}</span>
                                                <span className="text-xs font-bold text-slate-400 uppercase">Credits</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic mb-8 flex-grow">
                                            {pack.description}
                                        </p>
                                        <div className="mt-auto">
                                            <div className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                                                ₦{pack.price.toLocaleString()}
                                            </div>
                                            <Button className="w-full bg-slate-900 dark:bg-white dark:text-black hover:bg-primary hover:text-white transition-all rounded-xl font-black uppercase tracking-widest text-xs h-12">
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
