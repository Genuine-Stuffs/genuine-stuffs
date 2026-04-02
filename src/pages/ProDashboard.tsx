import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    ShieldCheck,
    User
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

                const mappedData = (data as any[] || []).map(event => {
                    const material = event.materials as { name: string; image_url: string | null } | null;
                    return {
                        ...event,
                        materials: material ? {
                            ...material,
                            image_url: assetMap[material.name] || material.image_url
                        } : null
                    };
                });

                setInteractions(mappedData);
            } catch (err) {
                console.error("Error fetching interactions:", err);
            }
        };

        fetchProData();
        fetchInteractions();
    }, [user]);

    const activeProjectMock = [
        { name: "Steven Terry", project: "Luxury Villa Concept", price: "₦1.2M", delivery: "4 Days", progress: 90, status: "Finalizing" },
        { name: "Audrey Jones", project: "Sustainable Facade", price: "₦450k", delivery: "12 Days", progress: 50, status: "Materials" },
        { name: "Brian Fisher", project: "MEP Precision Kit", price: "₦800k", delivery: "2 Days", progress: 20, status: "Drafting" },
    ];

    return (
        <div className="relative min-h-screen bg-background dark:bg-black overflow-hidden selection:bg-primary/30">
            <div className="mesh-background opacity-20" />
            
            <Navbar />
            <VerificationBanner />

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Welcome & Header */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-6">
                    <div className="w-full lg:w-auto">
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Welcome back, <br className="sm:hidden" /><span className="text-primary italic">{user?.email?.split('@')[0] || 'Pro'}</span> 👋
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 mt-2 uppercase tracking-[0.2em]">Workspace Protocol v4.0 · Node Active</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                         <div className="w-full sm:w-auto">
                            <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full rounded-[2rem] gap-3 font-black uppercase tracking-widest text-[10px] bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/5 h-14 shadow-sm px-6 backdrop-blur-md">
                                        <Bell className="w-5 h-5 text-primary" /> 
                                        <span className="flex-grow text-left">Notifications</span>
                                        <Badge className="bg-primary text-white border-none text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">3</Badge>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 rounded-3xl p-4 border-slate-200 shadow-2xl glass-card z-[1000]">
                                     <div className="flex items-center justify-between mb-4 px-2">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Professional Alerts</h4>
                                     </div>
                                     <div className="space-y-2">
                                         {[
                                             { title: "Market Spike", desc: "Reinforcement Steel (12mm) up by 12.4% this morning.", time: "2m ago" },
                                             { title: "Studio Update", desc: "New Neural QS component activated for your account.", time: "1h ago" },
                                             { title: "Verification Link", desc: "Your vendor partnership request with Dangote is pending.", time: "5h ago" },
                                         ].map((n, i) => (
                                             <div key={i} className="p-4 bg-slate-50 dark:bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                                                 <div className="flex justify-between items-start mb-1">
                                                     <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{n.title}</p>
                                                     <span className="text-[9px] text-slate-400 font-bold">{n.time}</span>
                                                 </div>
                                                 <p className="text-[10px] text-slate-500 italic leading-relaxed">{n.desc}</p>
                                             </div>
                                         ))}
                                     </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                         <Button asChild className="w-full sm:w-auto rounded-[2rem] px-8 h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                            <Link to="/pro/ai-studio"><Plus className="w-5 h-5" /> New Project</Link>
                         </Button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-6 md:gap-8">
                    
                    {/* LEFT COLUMN: NAVIGATION & PROJECTS */}
                    <div className="col-span-12 lg:col-span-8 space-y-6 md:space-y-8">
                        
                        {/* Analytics Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                            <Card className="rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden group">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                                            <Sparkles className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">AI Credits</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white italic tabular-nums">{credits ?? '--'}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full transition-all duration-1000" style={{ width: credits && credits > 50 ? '80%' : '30%' }} />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-4 italic uppercase tracking-wider">Projected for 12 more syncs</p>
                                </CardContent>
                            </Card>

                             <Card className="rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden group">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Net Savings</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white italic tabular-nums">₦425k</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[65%]" />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-500 mt-4 italic uppercase tracking-wider">+12.4% From Last Month</p>
                                </CardContent>
                            </Card>

                             <Card className="rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-slate-900 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden group">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-primary rounded-2xl">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 leading-none">Sync Accuracy</p>
                                            <p className="text-3xl font-black text-white italic tabular-nums">98.2%</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full w-[98%]" />
                                    </div>
                                    <p className="text-[10px] font-bold text-white/60 mt-4 italic uppercase tracking-wider">Neural BoQ Active</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Active Pipeline Table / Card List */}
                        <Card className="rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-card/40 backdrop-blur-3xl shadow-2xl overflow-hidden">
                            <CardHeader className="p-6 md:p-10 border-b border-slate-100 dark:border-white/5">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-primary/10 rounded-2xl">
                                            <Layers className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Active <span className="text-primary italic">Pipeline</span></CardTitle>
                                            <CardDescription className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">3 Production Nodes</CardDescription>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="w-full sm:w-auto rounded-2xl px-6 h-12 hover:bg-slate-100 dark:hover:bg-white/5 font-black uppercase text-[10px] tracking-widest border border-slate-100 dark:border-white/10">
                                        System History <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                                {/* Desktop Table View */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-white/5">
                                                <th className="pb-6 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Entity</th>
                                                <th className="pb-6 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Production Vision</th>
                                                <th className="pb-6 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Est. Value</th>
                                                <th className="pb-6 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {activeProjectMock.map((project, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                                    <td className="py-6 px-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-xs text-primary shadow-sm">
                                                                {project.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{project.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold mt-1 italic">{project.delivery} Delivery</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-4">
                                                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 max-w-[200px] leading-tight">{project.project}</p>
                                                    </td>
                                                    <td className="py-6 px-4">
                                                         <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{project.price}</p>
                                                    </td>
                                                    <td className="py-6 px-4">
                                                        <div className="w-32 ml-auto">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{project.status}</span>
                                                                <span className="text-[9px] font-black text-primary uppercase">{project.progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                                <div className="bg-primary h-full transition-all duration-700" style={{ width: `${project.progress}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List View */}
                                <div className="sm:hidden space-y-4">
                                    {activeProjectMock.map((project, i) => (
                                        <div key={i} className="p-6 bg-slate-50 dark:bg-muted/20 rounded-3xl border border-slate-100 dark:border-white/5 space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-xs text-primary shadow-sm">
                                                        {project.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{project.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1 italic">{project.delivery} Delivery</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{project.price}</p>
                                                    <p className="text-[9px] font-black text-primary uppercase mt-1">{project.status}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic">"{project.project}"</p>
                                                <div className="w-full">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Progress</span>
                                                        <span className="text-[9px] font-black text-primary uppercase">{project.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-white dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-100 dark:border-white/5">
                                                        <div className="bg-primary h-full" style={{ width: `${project.progress}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Button variant="outline" className="w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                                                View Production Node
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: ANALYTICS & QUICK ACTIONS */}
                    <div className="col-span-12 lg:col-span-4 space-y-8">
                        
                        {/* Profile Overview (Inspired by Sample) */}
                        <Card className="rounded-[3rem] border-none bg-primary text-white p-1 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                           <CardContent className="bg-slate-900 dark:bg-[#0F1115] rounded-[2.8rem] p-10 h-full relative z-10">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-primary to-rose-500 flex items-center justify-center p-1 shadow-2xl transform group-hover:rotate-6 transition-all duration-500">
                                            <div className="w-full h-full rounded-[2.3rem] bg-slate-900 flex items-center justify-center overflow-hidden">
                                                <User className="w-10 h-10 text-white opacity-80" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 border-4 border-slate-900 w-8 h-8 rounded-2xl flex items-center justify-center shadow-lg">
                                            <ShieldCheck className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white leading-none capitalize">{user?.email?.split('@')[0] || 'Professional'}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mt-2 italic">{role || 'Registered Expert'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 w-full gap-4 mt-10 border-t border-white/5 pt-10">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Impact Score</p>
                                            <p className="text-lg font-black text-white italic">A+</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Rank</p>
                                            <p className="text-lg font-black text-white italic">Elite</p>
                                        </div>
                                    </div>
                                    <Button asChild className="w-full mt-10 h-12 rounded-2xl bg-white text-slate-900 hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-[10px]">
                                        <Link to={`/pro/profile/${user?.id}`}>Edit Identity Node</Link>
                                    </Button>
                                </div>
                           </CardContent>
                        </Card>

                        {/* Market Volatility (Market Trend Chart) */}
                        <Card className="rounded-[3rem] border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Trend <span className="text-emerald-500">Node</span></h3>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded uppercase tracking-tighter">Real-Time</span>
                            </div>
                            <div className="h-40 w-full mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={mockMarketData}>
                                        <Line 
                                            type="monotone" 
                                            dataKey="price" 
                                            stroke="hsl(var(--primary))" 
                                            strokeWidth={4} 
                                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                background: 'rgba(0,0,0,0.85)', 
                                                border: 'none', 
                                                borderRadius: '16px', 
                                                color: '#fff',
                                                backdropFilter: 'blur(10px)',
                                                fontSize: '10px',
                                                fontWeight: '900',
                                                textTransform: 'uppercase'
                                            }} 
                                            labelStyle={{ display: 'none' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: "Portland Cement", price: "₦10,450", trend: "+2.4%" },
                                    { name: "Structural Steel", price: "₦1.2M", trend: "-1.1%" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 transition-all hover:border-primary/20 cursor-pointer">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.name}</span>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white">{item.price}</p>
                                            <p className={`text-[8px] font-black ${item.trend.startsWith('+') ? 'text-emerald-500' : 'text-primary'}`}>{item.trend}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Technical Toolkits Quick Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: "AI Workspace", icon: Sparkles, path: "/pro/ai-studio", color: "text-primary" },
                                { name: "Materials", icon: Building2, path: "/marketplace", color: "text-blue-500" },
                                { name: "Neural BoQ", icon: Cpu, path: "/calculators", color: "text-amber-500" },
                                { name: "QS Calculator", icon: Calculator, path: "/calculators", color: "text-sky-500" },
                            ].map((tool, i) => (
                                <Link 
                                    key={i} 
                                    to={tool.path}
                                    className="p-6 bg-white dark:bg-card rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col items-center text-center group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-background/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <tool.icon className={`w-6 h-6 ${tool.color}`} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 group-hover:text-primary transition-colors">{tool.name}</span>
                                </Link>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
            <div className="h-20" /> {/* Bottom spacer for mobile nav padding */}
        </div>
    );
};

export default ProDashboard;
