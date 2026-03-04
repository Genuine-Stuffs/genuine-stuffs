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
    Compass
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
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
        <div className="flex h-screen bg-white dark:bg-slate-950 transition-colors overflow-hidden selection:bg-primary/30">
            {/* Sidebar (Minimalist ChatGPT style) */}
            <aside
                className={`flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 transition-all duration-300 z-50 ${sidebarOpen ? 'w-72' : 'w-0'
                    }`}
            >
                <div className="p-6 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => {
                                setPromptText("");
                                setGeneratedImage(null);
                                toast.info("New project session initiated.");
                            }}
                            className="flex items-center gap-2 group w-full text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="font-black uppercase tracking-tighter text-slate-900 dark:text-white text-xs">New Project</span>
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-xl lg:hidden">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Historical Nodes</p>
                            <div className="space-y-1">
                                {[
                                    "Residential Villa v1",
                                    "Office Complex Massing",
                                    "Kitchen Detail - Marble",
                                    "Structural Study 04"
                                ].map((item, i) => (
                                    <button key={i} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 transition-all truncate">
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Studio Hub</p>
                            <div className="space-y-1">
                                <Button variant="ghost" asChild className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10">
                                    <Link to="/pro-portal"><LayoutDashboard className="w-4 h-4 text-primary" /> <span className="text-xs font-bold">Dashboard Feed</span></Link>
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10">
                                    <BookOpen className="w-4 h-4 text-slate-400" /> <span className="text-xs font-bold">Documentation</span>
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-white dark:hover:bg-white/5 h-10">
                                    <Calculator className="w-4 h-4 text-slate-400" /> <span className="text-xs font-bold">BoQ Engine</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t dark:border-white/5">
                        <CreditInfo
                            credits={credits ?? 0}
                            variant="compact"
                            isPro={true}
                            onRefill={() => setShowRefillModal(true)}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden backdrop-blur-3xl">
                <div className="mesh-background opacity-20" />

                {/* Header (Top Nav) */}
                <nav className="h-20 flex items-center justify-between px-8 border-b border-slate-200/50 dark:border-white/5 relative z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
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
                                <SelectTrigger className="w-56 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-bold text-xs uppercase tracking-widest shadow-sm focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder="Select Profession" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl">
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

                {/* Centered Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 max-w-4xl mx-auto w-full">
                    {!generatedImage && !isGenerating ? (
                        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                                Where should we <span className="text-primary italic">begin?</span>
                            </h1>
                            <p className="text-slate-500 font-medium italic">Execute your {selectedRole.toLowerCase()} vision with Studio Intelligence.</p>
                        </div>
                    ) : null}

                    {/* Result View */}
                    {(generatedImage || isGenerating) && (
                        <div className="w-full flex-1 flex flex-col justify-center mb-8 max-h-[60vh]">
                            <div className="glass-card rounded-[3rem] overflow-hidden shadow-3xl border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-900/50 relative group">
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
                    <div className="w-full mt-auto relative">
                        {/* Recipe Pills */}
                        {!isGenerating && (
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {professionalRoles.find(r => r.name === selectedRole)?.recipes.map((r, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPromptText(r)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-primary/10 hover:border-primary/50 text-[10px] font-bold text-slate-500 hover:text-primary rounded-2xl border border-transparent transition-all whitespace-nowrap"
                                    >
                                        Creative Recipe #{i + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative max-w-2xl mx-auto">
                            <div className="p-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-3xl focus-within:border-primary/50 transition-all flex flex-col gap-2">
                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder={`Ask ${selectedRole.toLowerCase()} anything...`}
                                    className="w-full min-h-[100px] bg-transparent resize-none p-4 text-slate-900 dark:text-white font-medium outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <div className="flex items-center justify-between px-4 pb-2">
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-lg h-9 w-9"><Paperclip className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-lg h-9 w-9"><ImageIcon className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-lg h-9 w-9"><Mic className="w-4 h-4" /></Button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">2 Credits / Sync</span>
                                        <Button
                                            onClick={handleGenerate}
                                            disabled={isGenerating || !promptText}
                                            className="h-10 w-10 p-0 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-[9px] text-slate-400 mt-6 font-medium italic opacity-50">Studio AI can analyze and render architectural concepts but may provide approximate data. Verify critical BoQ metrics.</p>
                    </div>
                </div>
            </main>

            <Dialog open={showRefillModal} onOpenChange={setShowRefillModal}>
                <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-3xl bg-white dark:bg-slate-950">
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
                                    className={`relative group border-2 transition-all p-6 flex flex-col rounded-[2rem] hover:scale-[1.02] cursor-pointer ${pack.popular ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
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
    );
};

export default AIStudio;
