import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PencilRuler,
    Sparkles,
    Layers,
    Map,
    FileText,
    Calculator,
    Settings,
    Plus,
    Bell,
    Clock,
    ArrowRight,
    Cpu,
    Loader2,
    History,
    MessageCircle,
    PhoneCall,
    Building2,
    TrendingUp,
    Zap,
    Scale,
    ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
import { VerificationBanner } from "@/components/VerificationBanner";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const mockMarketData = [
    { name: "Jan", price: 4200 },
    { name: "Feb", price: 4500 },
    { name: "Mar", price: 4300 },
    { name: "Apr", price: 4800 },
    { name: "May", price: 5100 },
    { name: "Jun", price: 4900 },
];

const ProDashboard = () => {
    const { user, role } = useAuth();
    const isPro = role === "professional";
    const [credits, setCredits] = useState<number | null>(null);
    const [interactions, setInteractions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProData = async () => {
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

        const fetchInteractions = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('pro_interactions')
                    .select('*, materials(name, image_url), vendors(company_name, phone)')
                    .eq('pro_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Temporary local asset mapping for interactions
                const assetMap: Record<string, string> = {
                    "Plumbing Network Pipes": "/images/materials/plumbing_pipes.png",
                    "Coleman Copper Cable (1.5mm)": "/images/materials/copper_cables.png",
                    "Polished Granite Slabs": "/images/materials/granite_slabs.png",
                    "Longspan Aluminum Roofing (0.55mm)": "/images/materials/roofing_sheets.png",
                    "Vitrified Floor Tiles (60x60)": "/images/materials/floor_tiles.png",
                    "Premium Wall Paint (White)": "/images/materials/dulux_paint.png",
                    "Reinforcement Steel (12mm)": "/images/materials/steel_rebars.png",
                    "Portland Cement (Dangote)": "/images/materials/cement_bags.png",
                };

                const mappedData = (data || []).map(event => ({
                    ...event,
                    materials: event.materials ? {
                        ...event.materials,
                        image_url: assetMap[event.materials.name] || event.materials.image_url
                    } : null
                }));

                setInteractions(mappedData);
            } catch (err) {
                console.error("Error fetching interactions:", err);
            }
        };

        fetchProData();
        fetchInteractions();
    }, [user]);

    return (
        <div className="relative min-h-screen bg-transparent overflow-hidden selection:bg-primary/30">
            <div className="mesh-background" />
            <div className="noise-overlay" />

            <Navbar />
            <VerificationBanner />

            <main className="container relative mx-auto px-4 py-12 z-10">
                {/* Bento Grid Main Layout */}
                <div className="bento-grid lg:grid-rows-[auto_auto_auto] gap-px bg-slate-200/20 dark:bg-border p-px rounded-[3rem] overflow-hidden border border-slate-200/50 dark:border-border backdrop-blur-3xl shadow-3xl">

                    {/* Header Block (Col 1-12) */}
                    <div className="col-span-12 p-10 bg-white/70 dark:bg-card/40 backdrop-blur-md flex flex-col md:flex-row justify-between items-center border-b border-slate-200 dark:border-border">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                                <Building2 className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                    Studio <span className="text-primary italic">Workspace</span>
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Professional Environment v4.0</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6 md:mt-0">
                            <CreditInfo
                                credits={credits ?? 0}
                                variant="compact"
                                isPro={true}
                                onRefill={() => { }}
                            />
                            <Button size="icon" variant="ghost" className="rounded-xl border border-slate-200 dark:border-white/10 hover:bg-primary/5">
                                <Bell className="w-5 h-5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="rounded-xl border border-slate-200 dark:border-white/10 hover:bg-primary/5">
                                <Settings className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Left Column: Material Index (Col 1-4) */}
                    <div className="col-span-12 lg:col-span-4 p-8 bg-white/60 dark:bg-background/20 backdrop-blur-sm border-r border-slate-200 dark:border-border space-y-8 animate-cascade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Material Volatility</h3>
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+12.4% Est.</span>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mockMarketData}>
                                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cement (Local)</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">₦10,450/bag</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reinforcement (12mm)</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">₦1.2M/Ton</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: ROI & Rapid Actions (Col 5-8) */}
                    <div className="col-span-12 lg:col-span-4 p-8 bg-white/50 dark:bg-card/40 backdrop-blur-sm border-r border-slate-200 dark:border-border space-y-10 animate-cascade-in" style={{ animationDelay: '100ms' }}>
                        <div className="p-8 rounded-[2.5rem] bg-slate-900 dark:bg-slate-950/40 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
                            <Zap className="w-8 h-8 text-primary mb-6" />
                            <h4 className="text-2xl font-black uppercase tracking-tighter italic">AI Cost Savings</h4>
                            <div className="mt-4 flex items-baseline gap-2">
                                <span className="text-4xl font-black text-primary tabular-nums">₦425k</span>
                                <span className="text-[10px] font-bold text-white/40 uppercase">This Month</span>
                            </div>
                            <p className="text-[10px] text-white/60 mt-4 leading-relaxed font-medium italic">Estimated revenue preserved through neural procurement optimization.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button asChild className="h-28 flex-col gap-3 rounded-[2rem] bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-white hover:bg-primary hover:text-white transition-all group">
                                <Link to="/pro/ai-studio">
                                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">New Concept</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-28 flex-col gap-3 rounded-[2rem] border-dashed border-2 bg-transparent text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                                <Link to="/pro/ai-studio">
                                    <Plus className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Workspace</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: History & Delivery (Col 9-12) */}
                    <div className="col-span-12 lg:col-span-4 p-8 bg-white/40 dark:bg-card/20 backdrop-blur-sm space-y-8 animate-cascade-in" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-primary" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Active Pipeline</h3>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {interactions.length > 0 ? (
                                interactions.map((event, i) => (
                                    <div key={i} className="p-5 bg-white/60 dark:bg-muted/20 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[9px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded uppercase tracking-tighter">
                                                {event.interaction_type === 'phone_reveal' ? 'Voice Link' : 'Digital Sync'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold">{new Date(event.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-xs font-black dark:text-white uppercase tracking-tight truncate">{event.materials?.name || "Material Request"}</h4>
                                        <div className="flex items-center gap-2 mt-2 opacity-60">
                                            <Building2 className="w-3 h-3" />
                                            <p className="text-[9px] font-bold uppercase">{event.vendors?.company_name}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-400 italic">
                                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Active Intent Logs</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/20 space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Security Node</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium italic">All marketplace interactions are encrypted and verified under Studio Protocol v4.0.</p>
                        </div>
                    </div>

                    {/* Bottom Row: Technical Toolkits (Col 1-12) */}
                    <div className="col-span-12 p-8 bg-white/80 dark:bg-card/60 backdrop-blur-md border-t border-slate-200 dark:border-border animate-cascade-in" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <Scale className="w-6 h-6 text-primary" />
                                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Neural Toolkit Dispatch</h2>
                            </div>
                            <div className="h-[1px] flex-grow mx-10 bg-gradient-to-r from-primary/30 to-transparent rounded-full hidden md:block" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { name: "Structural Integrity", icon: Layers, path: "/pro/ai-studio?role=Structural Engineer" },
                                { name: "MEP Precision", icon: Calculator, path: "/pro/ai-studio?role=MEP Engineer" },
                                { name: "Urban Site Flow", icon: Map, path: "/pro/ai-studio?role=Civil Engineer" },
                                { name: "Dynamic BoQ", icon: FileText, path: "/calculators" },
                            ].map((tool, i) => (
                                <Link key={i} to={tool.path} className="group p-6 bg-white/50 dark:bg-muted/10 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-primary/50 hover:-translate-y-2 transition-all duration-500 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-background/50 border border-slate-100 dark:border-white/10 group-hover:bg-primary group-hover:text-white group-hover:rotate-3 transition-all">
                                        <tool.icon className="w-8 h-8" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">{tool.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProDashboard;
