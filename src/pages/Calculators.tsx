import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, UploadCloud, FileText, CheckCircle2, ChevronDown,
    BarChart, Activity, RefreshCw, Zap, Layers, Wrench, Sparkles,
    BrainCircuit, Search, Info, History, Database, Cpu, ShoppingCart,
    X, File
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Calculators = () => {
    const [isSurveying, setIsSurveying] = useState(false);
    const [surveyComplete, setSurveyComplete] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 pb-20">
            <Navbar />

            <main className="container mx-auto px-4 py-8 md:py-16">
                
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
                                    {/* Functional Upload Zone */}
                                    <div 
                                        className="relative group cursor-pointer"
                                        onClick={handleUploadClick}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".pdf,.dwg,.rvt,.ifc,.jpg,.png"
                                        />
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-sky-500/20 to-primary/20 rounded-[2rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                                        <div className={`relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all ${
                                            selectedFile 
                                                ? "border-primary bg-primary/5 dark:bg-primary/10" 
                                                : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        }`}>
                                            {selectedFile ? (
                                                <div className="animate-in zoom-in-95 duration-300">
                                                    <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30 relative">
                                                        <File className="w-8 h-8" />
                                                        <button 
                                                            onClick={clearFile}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm line-clamp-1 px-4">{selectedFile.name}</p>
                                                    <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-2">Ready for Analysis</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                                        <UploadCloud className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter text-sm">Upload Blueprints</p>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.2em] font-black">PDF • DWG • RVT • IFC</p>
                                                </>
                                            )}
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
                                        disabled={isSurveying || (!selectedFile && !document.querySelector('textarea')?.value)}
                                    >
                                        {isSurveying ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" /> Synthesizing Data...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5 text-yellow-300" /> Generate Detailed BoQ
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Secondary Toolkit */}
                            <div className="grid grid-cols-1 gap-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-4">Legacy Estimation Modules</p>
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

                        {/* RIGHT COLUMN: DYNAMIC RESULTS WORKSPACE */}
                        <div className="lg:col-span-8 h-full">
                            {surveyComplete ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                                Analysis Report <span className="text-primary italic">#QS-9421</span>
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1">
                                                <Activity className="w-3.5 h-3.5 text-emerald-500" /> 
                                                98.2% Accuracy Rating • Generated {new Date().toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl px-6 border-slate-200 font-bold text-xs gap-2">
                                                <BarChart className="w-4 h-4" /> Export CSV
                                            </Button>
                                            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-200">
                                                <History className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-card overflow-hidden h-full">
                                        <Tabs defaultValue="phase1" className="w-full">
                                            <div className="bg-slate-50 dark:bg-white/5 p-2 px-4 border-b dark:border-white/5">
                                                <TabsList className="bg-transparent border-none w-full justify-start gap-4 overflow-x-auto h-auto p-0 scrollbar-hide">
                                                    <TabsTrigger value="phase1" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">Phase 1: Foundation</TabsTrigger>
                                                    <TabsTrigger value="phase2" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">Phase 2: Shell/Structure</TabsTrigger>
                                                    <TabsTrigger value="phase3" className="rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">Phase 3: Finishing</TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <CardContent className="p-4 md:p-8">
                                                <TabsContent value="phase1" className="space-y-4 m-0">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {[
                                                            { item: "Portland Cement (50kg)", qty: "1,200 bags", price: "₦14.4M", trend: "Market Stable", provider: "Dangote Group" },
                                                            { item: "Granite (3/4 inch)", qty: "450 Tons", price: "₦6.75M", trend: "Rising (2%)", provider: "Vetted Aggregates" },
                                                            { item: "Sharp Sand", qty: "320 Tons", price: "₦3.2M", trend: "Market Stable", provider: "Local Vetted" },
                                                            { item: "Reinforcement Steel (16mm)", qty: "85 Tons", price: "₦51M", trend: "Declining (1%)", provider: "Universal Steels" }
                                                        ].map((row, i) => (
                                                            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-primary/20 transition-all group relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                                                                    <Layers className="w-20 h-20 rotate-12" />
                                                                </div>
                                                                <div className="relative z-10 flex-1">
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <h4 className="font-black text-slate-800 dark:text-white text-base md:text-lg tracking-tight uppercase leading-none">{row.item}</h4>
                                                                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-black uppercase bg-primary/5 text-primary border-none">{row.provider}</Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{row.qty} required</p>
                                                                       <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                                                                       <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{row.trend}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-4 mt-6 sm:mt-0">
                                                                    <div className="text-right">
                                                                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black mb-1">Market Logic</p>
                                                                        <p className="font-black text-xl md:text-2xl text-slate-900 dark:text-white leading-none italic">{row.price}</p>
                                                                    </div>
                                                                    <Button size="sm" variant="secondary" className="h-9 px-4 bg-white dark:bg-slate-800 font-bold text-[10px] uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all rounded-xl shadow-sm">
                                                                        Verify
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-8 relative group">
                                                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                                        <div className="relative p-8 md:p-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/50 flex flex-col lg:flex-row justify-between items-center gap-8">
                                                            <div className="text-center lg:text-left">
                                                                <p className="text-emerald-800 dark:text-green-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Cumulative Phase Cost Index</p>
                                                                <p className="text-5xl md:text-6xl font-black text-emerald-900 dark:text-green-200 lowercase tracking-tighter italic">₦75.3M</p>
                                                            </div>
                                                            <div className="flex flex-col gap-3 w-full lg:w-auto">
                                                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-12 h-16 rounded-2xl shadow-2xl shadow-emerald-600/30 text-base uppercase tracking-widest gap-3 w-full lg:w-auto">
                                                                    <ShoppingCart className="w-5 h-5" /> Procurement Link
                                                                </Button>
                                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-500/60 font-medium text-center italic">* Vetted Material Sourcing available for Phase 1</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="phase2" className="py-20 text-center animate-in fade-in duration-500">
                                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                                        <Cpu className="w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-lg font-black uppercase tracking-tighter text-slate-400">Processing Shell Structure</h3>
                                                </TabsContent>

                                                <TabsContent value="phase3" className="py-20 text-center animate-in fade-in duration-500">
                                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                                        <Wrench className="w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-lg font-black uppercase tracking-tighter text-slate-400">Finishing Workspace</h3>
                                                </TabsContent>
                                            </CardContent>
                                        </Tabs>
                                    </Card>
                                </div>
                            ) : (
                                <div className="lg:text-left h-full flex flex-col justify-center animate-in fade-in slide-in-from-right-10 duration-1000">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-sm w-fit">
                                        <BrainCircuit className="w-4 h-4" /> 
                                        Neural QS v4.0
                                    </div>
                                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.9] mb-8">
                                        AI-Powered <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-orange-500 italic">Bill of Quantities</span>
                                    </h1>
                                    <p className="text-sm md:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl italic">
                                        Transform architectural prompts or blueprints into detailed, phased material estimations in seconds.
                                    </p>
                                    
                                    {/* Simplified Process Indicator */}
                                    <div className="flex gap-12 mt-16 opacity-30">
                                        {[
                                            { icon: UploadCloud, label: "Input" },
                                            { icon: Sparkles, label: "Neural Engine" },
                                            { icon: BarChart, label: "BoQ Report" }
                                        ].map((step, i) => (
                                            <div key={i} className="flex flex-col items-center lg:items-start gap-2">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <step.icon className="w-6 h-6" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
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
