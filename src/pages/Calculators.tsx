import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, UploadCloud, FileText, CheckCircle2, ChevronDown,
    BarChart, Activity, RefreshCw, Zap, Layers, Wrench, Sparkles,
    BrainCircuit, Search, Info, History, Database, Cpu, ShoppingCart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Calculators = () => {
    const [isSurveying, setIsSurveying] = useState(false);
    const [surveyComplete, setSurveyComplete] = useState(false);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    const startAiAnalysis = () => {
        setIsSurveying(true);
        setTimeout(() => {
            setIsSurveying(false);
            setSurveyComplete(true);
        }, 3000); // Simulate 3 seconds of AI processing
    };

    const HeroContent = () => (
        <div className="lg:text-left animate-in fade-in slide-in-from-right-10 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-sm">
                <BrainCircuit className="w-4 h-4" /> 
                Neural QS v4.0
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.9] mb-8">
                AI-Powered <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-orange-500 italic">Bill of Quantities</span>
            </h1>
            <p className="text-sm md:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl italic">
                Transform architectural prompts or blueprints into detailed, phased material estimations in seconds.
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 pb-20">
            <Navbar />

            <main className="container mx-auto px-4 py-8 md:py-16">
                
                {/* Unified Desktop/Mobile Grid */}
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center lg:items-start">
                        
                        {/* LEFT COLUMN: CONTROL PANEL */}
                        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-left-10 duration-700">
                            
                            {/* Project Configuration Card */}
                            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-card overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-xl">
                                             <Database className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Project Input</h3>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Node Configuration</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    {/* Upload Zone */}
                                    <div className="relative group cursor-pointer">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-sky-500/20 to-primary/20 rounded-[2rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                                        <div className="relative border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-12 text-center bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                                <UploadCloud className="w-8 h-8 text-primary" />
                                            </div>
                                            <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter text-sm">Upload Blueprints</p>
                                        </div>
                                    </div>

                                    <div className="relative py-2">
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-100 dark:border-white/5" />
                                        <span className="relative z-10 mx-auto px-4 bg-white dark:bg-card text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block w-fit">OR</span>
                                    </div>

                                    {/* Neural Prompt */}
                                    <div className="space-y-3">
                                        <textarea
                                            className="w-full min-h-[160px] p-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 focus:ring-2 ring-primary/20 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-medium text-sm leading-relaxed"
                                            placeholder="E.g., A 3-story boutique hotel with industrial aesthetics, 12 rooms per floor..."
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-16 text-[11px] font-black gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl bg-primary hover:bg-primary/90 text-white uppercase tracking-[0.2em]"
                                        onClick={startAiAnalysis}
                                        disabled={isSurveying}
                                    >
                                        {isSurveying ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Nodes...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Generate Detailed BoQ
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Legacy Toolkit */}
                            <div className="grid grid-cols-1 gap-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-4">Legacy Estimators</p>
                                {["Concrete Volume", "Roofing Shingles", "Block & Mortar", "Tile Spacer"].map((tool) => (
                                    <button key={tool} className="flex items-center justify-between p-5 bg-white dark:bg-card rounded-2xl border border-transparent hover:border-primary/20 transition-all group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-xl group-hover:text-primary transition-colors">
                                                <Calculator className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{tool}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: HERO (Initial) or RESULTS (Generated) */}
                        <div className="lg:col-span-8">
                            {surveyComplete ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                                                Analysis Report <span className="text-primary italic">#QS-9421</span>
                                            </h2>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Activity className="w-3.5 h-3.5 text-emerald-500" /> 
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Accuracy Index</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="h-11 rounded-xl px-6 border-slate-200 font-black text-[10px] uppercase tracking-widest gap-2">
                                            <BarChart className="w-4 h-4" /> Export CSV
                                        </Button>
                                    </div>

                                    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-card overflow-hidden">
                                        <Tabs defaultValue="phase1" className="w-full">
                                            <TabsList className="bg-slate-50 dark:bg-white/5 border-b dark:border-white/5 w-full justify-start gap-4 h-auto p-4 px-6 overflow-x-auto scrollbar-hide">
                                                <TabsTrigger value="phase1" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all shrink-0">Phase 1: Foundation</TabsTrigger>
                                                <TabsTrigger value="phase2" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all shrink-0">Phase 2: Structure</TabsTrigger>
                                                <TabsTrigger value="phase3" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all shrink-0">Phase 3: Finishing</TabsTrigger>
                                            </TabsList>

                                            <CardContent className="p-4 md:p-8 space-y-4">
                                                <TabsContent value="phase1" className="space-y-4 m-0">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {[
                                                            { item: "Portland Cement (50kg)", qty: "1,200 bags", price: "₦14.4M", provider: "Dangote" },
                                                            { item: "Reinforcement Steel (16mm)", qty: "85 Tons", price: "₦51M", provider: "Universal" }
                                                        ].map((row, i) => (
                                                            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-primary/20 transition-all">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <h4 className="font-black text-slate-800 dark:text-white text-base md:text-lg tracking-tight uppercase leading-none">{row.item}</h4>
                                                                        <Badge className="text-[8px] font-black bg-primary/5 text-primary border-none">{row.provider}</Badge>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{row.qty} required</p>
                                                                </div>
                                                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-4 mt-6 sm:mt-0">
                                                                    <div className="text-right">
                                                                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black mb-1">Index Price</p>
                                                                        <p className="font-black text-2xl text-slate-900 dark:text-white italic leading-none">{row.price}</p>
                                                                    </div>
                                                                    <Button size="sm" variant="secondary" className="h-9 px-4 bg-white dark:bg-slate-800 font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white rounded-xl">Verify</Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-8 p-10 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center text-center gap-6">
                                                        <p className="text-5xl md:text-7xl font-black text-emerald-900 dark:text-green-200 lowercase tracking-tighter italic">₦75.3M</p>
                                                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-12 h-16 rounded-2xl shadow-2xl shadow-emerald-600/30 text-base uppercase tracking-widest gap-3 w-full sm:w-auto">
                                                            <ShoppingCart className="w-5 h-5" /> Procurement Link
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                                <TabsContent value="phase2" className="py-20 text-center text-slate-400 uppercase font-black tracking-widest">Processing Structure Nodes...</TabsContent>
                                                <TabsContent value="phase3" className="py-20 text-center text-slate-400 uppercase font-black tracking-widest">Processing Finishing Nodes...</TabsContent>
                                            </CardContent>
                                        </Tabs>
                                    </Card>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col justify-center py-12 lg:py-0">
                                     <HeroContent />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Calculators;
