import { useState, useEffect } from "react";
import { 
    Activity, 
    Server, 
    Cpu, 
    Zap, 
    ShieldCheck, 
    BarChart3, 
    Database, 
    AlertTriangle, 
    RefreshCw, 
    HardDrive,
    Search,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    LayoutDashboard,
    Play,
    Pause,
    History,
    Settings,
    MessageSquare,
    Terminal,
    ArrowLeft,
    Power
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

const SystemMaintenance = () => {
    const [scrolled, setScrolled] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(timer);
        };
    }, []);

    const metrics = [
        { label: "Core API Latency", value: "142ms", trend: "-12ms", status: "optimal", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Uptime (30d)", value: "99.992%", trend: "Stable", status: "optimal", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Memory Utilization", value: "42.8%", trend: "+2.1%", status: "warning", icon: Cpu, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "AI Inference Delay", value: "1.8s", trend: "+0.4s", status: "warning", icon: Terminal, color: "text-purple-500", bg: "bg-purple-500/10" },
    ];

    const nodes = [
        { name: "Material Index Edge-01", region: "Lagos, NG", status: "Healthy", load: 24, uptime: "142d" },
        { name: "Material Index Edge-02", region: "Abuja, NG", status: "Healthy", load: 18, uptime: "89d" },
        { name: "AI Studio Backend-Primary", region: "London, UK", status: "Healthy", load: 68, uptime: "12d" },
        { name: "Database Cluster-Replica", region: "London, UK", status: "Syncing", load: 45, uptime: "214d" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] text-slate-900 dark:text-slate-100 transition-colors duration-500 selection:bg-red-500/30">
            {/* Header / Nav Area */}
            <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#0b0c10]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 py-4' : 'py-8'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/pm-dashboard" className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 transition-all text-slate-500 hover:text-slate-900 dark:hover:text-white">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Observability & Health</h1>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0 h-4 text-[8px] font-black tracking-widest">INFRASTRUCTURE STABLE</Badge>
                                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{currentTime.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            className="hidden md:flex font-bold text-[10px] uppercase tracking-widest gap-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
                            onClick={() => {
                                toast.info("Fetching real-time incident logs...", {
                                    description: "Standard infrastructure logs retrieved (24h scope)."
                                });
                            }}
                        >
                            <History size={16} /> Incident Logs
                        </Button>
                        <Button 
                            onClick={async () => {
                                const id = toast.loading("Initiating Global Infrastructure Audit...");
                                // Simulated audit sequence
                                setTimeout(() => {
                                    toast.success("Audit Complete: All 4 Edge Nodes Healthy", { 
                                        id,
                                        description: "Database replication at 100% sync."
                                    });
                                }, 2000);
                            }}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl px-6 h-11 shadow-xl hover:scale-105 transition-all"
                        >
                            Run Global Audit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {metrics.map((m, idx) => (
                        <Card key={idx} className="bg-white dark:bg-[#15171a] border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm group hover:border-red-600/30 transition-all overflow-hidden relative">
                            <div className={`absolute top-0 right-0 w-24 h-24 ${m.bg} rounded-full -mr-12 -mt-12 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                                    <m.icon size={22} />
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black ${m.trend.startsWith('-') || m.trend === 'Stable' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {m.trend.startsWith('-') ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                    {m.trend}
                                </div>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">{m.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{m.value}</h3>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column: Infrastructure Observability */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Real-time Traffic Simulation (Placeholder for Prometheus/Grafana style UI) */}
                        <Card className="bg-white dark:bg-[#15171a] border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Prometheus Traffic Matrix</h3>
                                    <p className="text-xs text-slate-400 font-medium italic">Inbound requests per second across all edge nodes.</p>
                                </div>
                                <Select defaultValue="1h">
                                    <SelectTrigger className="w-24 h-9 rounded-lg border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest">
                                        <SelectValue />
                                    </SelectTrigger>
                                </Select>
                            </div>

                            <div className="h-48 w-full flex items-end gap-1 mb-6">
                                {[...Array(40)].map((_, i) => {
                                    const height = Math.floor(Math.random() * 80) + 20;
                                    return (
                                        <div 
                                            key={i} 
                                            className="flex-1 rounded-t-sm transition-all duration-1000 bg-gradient-to-t from-red-600/20 to-red-500/80 group relative"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                {Math.floor(height * 2.4)} req/s
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Peak Intensity</p>
                                    <h4 className="font-black text-slate-900 dark:text-white">4.2k RPS</h4>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Errors (4xx/5xx)</p>
                                    <h4 className="font-black text-red-500 text-sm">0.02%</h4>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">P95 Latency</p>
                                    <h4 className="font-black text-slate-900 dark:text-white">218ms</h4>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bandwidth Out</p>
                                    <h4 className="font-black text-slate-900 dark:text-white">12.4 TB</h4>
                                </div>
                            </div>
                        </Card>

                        {/* Development Priority Matrix */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                <Database className="text-red-500" size={20} /> Development Priority Matrix
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="p-6 bg-white dark:bg-[#15171a] border-slate-200 dark:border-white/5 rounded-3xl shadow-sm border-l-4 border-l-red-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge className="bg-red-500 text-white border-none text-[8px] tracking-widest font-black uppercase">CRITICAL PATH</Badge>
                                        <span className="text-[10px] font-bold text-slate-400">#DEV-402</span>
                                    </div>
                                    <h5 className="font-black text-slate-900 dark:text-white mb-2 uppercase">AI Studio Context Refresh</h5>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                        AI Studio state loss during backgrounding on mobile. Direct impact on user retention for "High Performance" professionals.
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5">
                                        <div className="flex -space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-[#15171a]" title="Senior Dev" />
                                            <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#15171a]" title="Frontend Lead" />
                                        </div>
                                        <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900">Sprint Map</Button>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-white dark:bg-[#15171a] border-slate-200 dark:border-white/5 rounded-3xl shadow-sm border-l-4 border-l-amber-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge className="bg-amber-500 text-white border-none text-[8px] tracking-widest font-black uppercase">OPTIMIZATION</Badge>
                                        <span className="text-[10px] font-bold text-slate-400">#OPS-128</span>
                                    </div>
                                    <h5 className="font-black text-slate-900 dark:text-white mb-2 uppercase">Vendor Media CDN Purge</h5>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                        Stale product images on Vendor Dashboard causes marketplace friction. Requires automated event triggers from storage bucket.
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5">
                                        <div className="flex -space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white dark:border-[#15171a]" title="Ops Engineer" />
                                        </div>
                                        <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg bg-slate-50 text-slate-500">Backlog</Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Node Management & Quick Actions */}
                    <div className="space-y-8">
                        <Card className="bg-white dark:bg-[#15171a] border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Cluster Distribution</h3>
                            <div className="space-y-6">
                                {nodes.map((node, i) => (
                                    <div key={i} className="group cursor-default">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${node.status === 'Healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{node.name}</span>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{node.region}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${node.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                style={{ width: `${node.load}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-2 px-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Load: {node.load}%</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Uptime: {node.uptime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-[60px] translate-x-12 -translate-y-12 opacity-50 group-hover:opacity-80 transition-opacity" />
                           <h3 className="text-lg font-black uppercase tracking-tight relative z-10 mb-2">Master Controls</h3>
                           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-8 relative z-10 italic">Global state modification portal.</p>
                           
                           <div className="space-y-4 relative z-10">
                               <Button 
                                    onClick={() => {
                                        const id = toast.loading("Purging global CDN edge cache...");
                                        setTimeout(() => toast.success("CDN Purged Successfully (Global Scope)", { id }), 2000);
                                    }}
                                    className="w-full h-14 rounded-2xl bg-white/10 dark:bg-black/5 hover:bg-white/20 border border-white/10 dark:border-black/5 font-black uppercase tracking-widest text-[10px] flex items-center justify-between px-6 transition-all"
                                >
                                   CDN Refresh <RefreshCw size={18} className="text-blue-400" />
                               </Button>
                               <Button 
                                    onClick={() => {
                                        const id = toast.loading("Rebuilding search index matrices...");
                                        setTimeout(() => toast.success("Marketplace Search Index Rebuilt", { id }), 3000);
                                    }}
                                    className="w-full h-14 rounded-2xl bg-white/10 dark:bg-black/5 hover:bg-white/20 border border-white/10 dark:border-black/5 font-black uppercase tracking-widest text-[10px] flex items-center justify-between px-6 transition-all"
                                >
                                   Rebuild Search Index <BarChart3 size={18} className="text-purple-400" />
                               </Button>
                               <Button 
                                    onClick={() => {
                                        toast.warning("Warning: Maintenance Mode", {
                                            description: "This action requires secondary approval from Lead DevOps."
                                        });
                                    }}
                                    className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-between px-6 shadow-xl shadow-red-600/20 translate-y-4 transition-all hover:scale-[1.02]"
                                >
                                   MAINTENANCE MODE <Power size={18} />
                               </Button>
                           </div>
                        </Card>

                        <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-3xl">
                            <div className="flex gap-4">
                                <AlertTriangle className="text-red-600 shrink-0" size={24} />
                                <div>
                                    <h5 className="font-black text-red-600 uppercase text-xs mb-1">Security Advisory</h5>
                                    <p className="text-[10px] font-medium text-red-600/80 leading-relaxed italic">
                                        Manual DB override is currently disabled from the web portal. Please use the material-insight-core CLI for structural migrations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SystemMaintenance;
