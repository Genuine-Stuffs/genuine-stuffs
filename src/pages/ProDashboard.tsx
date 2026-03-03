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
    Building2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
import { VerificationBanner } from "@/components/VerificationBanner";

const ProDashboard = () => {
    const { user, role } = useAuth();
    const isPro = role === "pro";
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
                setInteractions(data || []);
            } catch (err) {
                console.error("Error fetching interactions:", err);
            }
        };

        fetchProData();
        fetchInteractions();
    }, [user]);


    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />
            <VerificationBanner />

            <main className="container mx-auto px-4 py-8">
                <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Workspace Hub</h1>
                        <p className="text-sm text-muted-foreground dark:text-slate-500 font-medium italic mt-2">Manage your AI-integrated construction workflows.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 w-10 p-0 dark:border-white/10 rounded-xl">
                            <Bell className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="outline" className="h-10 w-10 p-0 dark:border-white/10 rounded-xl">
                            <Settings className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button asChild className="gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xl shadow-slate-200 dark:shadow-none transition-all font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl">
                            <Link to="/pro/ai-studio"><Plus className="w-4 h-4" /> New Project</Link>
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Action Hub - Tabs */}
                    <div className="lg:col-span-2 space-y-8">
                        <Tabs defaultValue="workspaces" className="w-full">
                            <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl mb-8 border dark:border-white/10">
                                <TabsTrigger value="workspaces" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm px-6">
                                    <Cpu className="w-3.5 h-3.5 mr-2" /> Workspaces
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm px-6">
                                    <History className="w-3.5 h-3.5 mr-2" /> Interaction Log
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="workspaces" className="space-y-8 mt-0 focus-visible:ring-0">
                                <section>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card asChild className="border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent dark:hover:bg-white/5 flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:bg-slate-100/50 transition-all rounded-[2.5rem] group min-h-[300px]">
                                            <Link to="/pro/ai-studio">
                                                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-white/5 border dark:border-white/5 shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                    <Plus className="w-10 h-10 text-primary" />
                                                </div>
                                                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Create First Project</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium italic mb-6">Start your construction journey with AI-powered tools.</p>
                                                <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] px-8 h-10">Initialize Workspace</Button>
                                            </Link>
                                        </Card>

                                        <Card className="border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Quick Tip</p>
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">AI-Driven Insights</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                                                Use the AI Studio to generate optimized material lists or verify structural drawings in seconds.
                                            </p>
                                            <Button variant="link" className="text-primary p-0 h-auto justify-start mt-4 font-black uppercase tracking-widest text-[10px] gap-2">
                                                Explore AI Studio <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Card>
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="history" className="space-y-6 mt-0 focus-visible:ring-0">
                                {interactions.length > 0 ? (
                                    <div className="space-y-4">
                                        {interactions.map((event, i) => (
                                            <Card key={i} className="border border-slate-100 dark:border-white/5 bg-white dark:bg-card rounded-2xl overflow-hidden group hover:border-primary/30 transition-all">
                                                <CardContent className="p-5 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center overflow-hidden border dark:border-white/5">
                                                            {event.materials?.image_url ? (
                                                                <img src={event.materials.image_url} alt={event.materials.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <FileText className="w-5 h-5 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{event.materials?.name || "Product Inquiry"}</h4>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                                                <Building2 className="w-3 h-3 text-primary" /> {event.vendors?.company_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-2 mb-1.5">
                                                            {event.interaction_type === 'phone_reveal' ? (
                                                                <span className="text-[8px] font-black uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md flex items-center gap-1 border border-blue-100 dark:border-blue-500/20">
                                                                    <PhoneCall className="w-2.5 h-2.5" /> Call Intent
                                                                </span>
                                                            ) : (
                                                                <span className="text-[8px] font-black uppercase bg-green-50 dark:bg-green-500/10 text-green-600 px-2 py-1 rounded-md flex items-center gap-1 border border-green-100 dark:border-green-500/20">
                                                                    <MessageCircle className="w-2.5 h-2.5" /> WhatsApp Chat
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium italic tabular-nums">{new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem]">
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/5 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-700">
                                            <History className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">No interaction history</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium italic">Your engagement with vendors in the marketplace will appear here.</p>
                                        <Button asChild variant="link" className="text-primary font-black uppercase tracking-widest text-[10px] mt-4">
                                            <Link to="/marketplace">Explore Marketplace</Link>
                                        </Button>
                                    </Card>
                                )}
                            </TabsContent>
                        </Tabs>

                        <section>
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                                <Sparkles className="w-6 h-6 text-primary" /> Technical Toolkits
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {[
                                    { name: "Structural", icon: Layers, path: "/pro/ai-studio" },
                                    { name: "MEP Design", icon: Calculator, path: "/pro/ai-studio" },
                                    { name: "Site Planning", icon: Map, path: "/pro/ai-studio" },
                                    { name: "BoQ Engine", icon: FileText, path: "/calculators" },
                                ].map((tool, i) => (
                                    <Card key={i} asChild className="group border border-slate-100 dark:border-white/5 hover:border-primary shadow-sm transition-all duration-300 cursor-pointer bg-white dark:bg-card rounded-2xl">
                                        <Link to={tool.path}>
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-50 dark:bg-white/5 group-hover:bg-primary group-hover:text-white text-slate-400`}>
                                                    <tool.icon className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">{tool.name}</span>
                                            </CardContent>
                                        </Link>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Side Info / Resources */}
                    <div className="space-y-8">
                        {/* Pro Hub Launchpad */}
                        <Card className="bg-slate-900 dark:bg-black text-white rounded-[2.5rem] border-none shadow-2xl transition-all hover:scale-[1.01] overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black text-primary uppercase tracking-widest">AI Launcher</CardTitle>
                                <CardDescription className="text-slate-400 font-medium italic">
                                    Instant architectural workflows.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-4">
                                <Button asChild variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <Link to="/pro/ai-studio"><Sparkles className="w-4 h-4" /> Render New Concept</Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <Link to="/calculators"><Calculator className="w-4 h-4" /> Start AI Surveying</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm dark:bg-card transition-colors rounded-[2.5rem]">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Industry Insights</CardTitle>
                                <CardDescription className="dark:text-slate-500 font-medium italic">Nigeria's construction trends.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">New Report</p>
                                        <h5 className="text-xs font-black dark:text-white uppercase">Cement price stability forecast for Q2 2024.</h5>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Sustainability</p>
                                        <h5 className="text-xs font-black dark:text-white uppercase">Recycled reinforcement bars adoption rates rising.</h5>
                                    </div>
                                </div>
                                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">View Resource Library</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProDashboard;
