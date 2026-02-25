import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";

const ProDashboard = () => {
    const { user, role } = useAuth();
    const isPro = role === "pro";
    const [credits, setCredits] = useState<number | null>(null);
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

        fetchProData();
    }, [user]);

    const activeProjects = [
        { title: "Lekki Residential Villa", type: "Architectural Drawing", status: "In AI Review", progress: 65, lastEdit: "10 mins ago" },
        { title: "Mainland Health Plaza", type: "Quantity Surveying", status: "Awaiting Market Prices", progress: 40, lastEdit: "2 hours ago" },
        { title: "Eco-Tech Office Complex", type: "BIM Coordination", status: "Clash Detected", progress: 85, lastEdit: "Yesterday" },
    ];

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                {!isPro && (
                    <div className="mb-8 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 rounded-2xl flex items-center justify-between transition-colors">
                        <p className="text-primary font-bold text-sm">You are viewing this as a <span className="underline">{role}</span>. Full Pro features require an upgrade.</p>
                        <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] h-8 px-4" asChild>
                            <Link to="/register/pro">Upgrade Now</Link>
                        </Button>
                    </div>
                )}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Professional Portal</h1>
                        <p className="text-muted-foreground dark:text-slate-400 font-medium italic mt-1">Access your AI tools and manage your workflows. <span className="font-black text-primary uppercase tracking-widest text-xs ml-2">{role} Account</span></p>
                    </div>
                    <div className="flex gap-3">
                        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all font-black uppercase tracking-widest text-xs h-11 px-6 rounded-xl">
                            <Plus className="w-4 h-4" /> New Project
                        </Button>
                        <Button variant="outline" className="h-11 w-11 p-0 bg-white dark:bg-card dark:border-white/10 rounded-xl">
                            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                        <Button variant="outline" className="h-11 w-11 p-0 bg-white dark:bg-card dark:border-white/10 rounded-xl">
                            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Action Hub - AI Tools */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                                <Cpu className="w-6 h-6 text-primary" /> Active Workspaces
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeProjects.map((project, i) => (
                                    <Card key={i} className="border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group overflow-hidden bg-white dark:bg-card rounded-[2rem]">
                                        <div className={`h-1.5 w-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-orange-500' : 'bg-red-500'}`} />
                                        <CardContent className="p-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h4 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight uppercase tracking-tight">{project.title}</h4>
                                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-2">{project.type}</p>
                                                </div>
                                                <span className="text-[10px] bg-slate-50 dark:bg-white/5 border dark:border-white/5 px-3 py-1.5 rounded-full font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" /> {project.lastEdit}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mb-8">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                    <span>Phase Progress</span>
                                                    <span>{project.progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-black/40 h-2.5 rounded-full overflow-hidden border dark:border-white/5">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                                        style={{ width: `${project.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${project.status === 'Clash Detected' ? 'bg-red-50 dark:bg-red-950/30 text-red-600' :
                                                    project.status === 'In AI Review' ? 'bg-primary/10 text-primary' : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                                <Button size="sm" variant="ghost" className="gap-2 p-0 h-auto hover:bg-transparent font-black uppercase tracking-widest text-[10px] text-slate-900 dark:text-white group-hover:text-primary transition-all">
                                                    Resume <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Card className="border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent dark:hover:bg-white/5 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-100/50 transition-all rounded-[2rem] group">
                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/5 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Plus className="w-7 h-7 text-primary" />
                                    </div>
                                    <p className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">New Project</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest font-black">Prompt or Model Upload</p>
                                </Card>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                                <Sparkles className="w-6 h-6 text-primary" /> Technical Toolkits
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {[
                                    { name: "Structural", icon: Layers, color: "primary" },
                                    { name: "MEP Design", icon: Calculator, color: "orange-500" },
                                    { name: "Site Planning", icon: Map, color: "green-500" },
                                    { name: "BoQ Engine", icon: FileText, color: "purple-500" },
                                ].map((tool, i) => (
                                    <Card key={i} className="border-none shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group bg-white dark:bg-card rounded-3xl">
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                            <div className={`p-4 rounded-2xl mb-4 text-white shadow-xl transition-all group-hover:scale-110 ${tool.color === 'primary' ? 'bg-primary shadow-primary/30' : `bg-${tool.color} shadow-${tool.color.split('-')[0]}-500/30`}`}>
                                                <tool.icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white transition-colors group-hover:text-primary">{tool.name}</span>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Side Info / Resources */}
                    <div className="space-y-8">
                        {isLoading ? (
                            <Card className="border-none shadow-xl dark:bg-card rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Trial Data...</p>
                            </Card>
                        ) : (
                            <CreditInfo credits={credits ?? 0} />
                        )}

                        <Card className="border-none shadow-sm dark:bg-card transition-colors rounded-[2.5rem]">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Market Pulse</CardTitle>
                                <CardDescription className="dark:text-slate-500 font-medium italic">Live data for BoQ estimates.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-4">
                                {[
                                    { item: "Cement (Standard)", price: "₦ 7,200", trend: "up" },
                                    { item: "Reinforcement (16mm)", price: "₦ 12,500", trend: "down" },
                                    { item: "Hardwood Granite", price: "₦ 15,200", trend: "stable" },
                                ].map((p, i) => (
                                    <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 border-slate-50 dark:border-white/5 transition-colors">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{p.item}</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{p.price}</span>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 mt-4">Full Market Index</Button>
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
