import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
    Calculator, UploadCloud, FileText, CheckCircle2, ChevronDown, ChevronUp,
    BarChart, Activity, RefreshCw, Zap, Layers, Wrench, Sparkles,
    BrainCircuit, Search, Info, History, Database, Cpu, ShoppingCart,
    X, File, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LegacyModule = ({ title, icon: Icon }: { title: string; icon: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Simple calculator state (placeholders)
    const renderContent = () => {
        switch (title) {
            case "Concrete Volume":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">L (m)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">W (m)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">D (m)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900">Calculate Volume</Button>
                    </div>
                );
            case "Roofing Shingles":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Area (m²)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Pitch (deg)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900">Bundles Estimate</Button>
                    </div>
                );
            case "Block & Mortar":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Length (m)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Height (m)</p><Input className="h-8 rounded-lg text-xs" placeholder="0.00" /></div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900">Units Required</Button>
                    </div>
                );
            case "Tile Spacer":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Tile Size (cm)</p><Input className="h-8 rounded-lg text-xs" placeholder="60x60" /></div>
                            <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Gap (mm)</p><Input className="h-8 rounded-lg text-xs" placeholder="3" /></div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900">Pack Count</Button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <Popover onOpenChange={setIsOpen}>
            <div className="relative group">
                {/* Fancy Red/Blue Glow Border */}
                <div className="absolute -inset-[1px] bg-gradient-to-tr from-primary via-slate-200 to-sky-500 rounded-[2rem] opacity-30 group-hover:opacity-100 transition-opacity blur-[1px]"></div>
                
                <PopoverTrigger asChild>
                    <button className="relative w-full flex items-center justify-between px-6 py-5 bg-white dark:bg-card rounded-[2rem] border-none group-hover:bg-slate-50 transition-all shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-lg group-hover:bg-primary/10 transition-colors">
                                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tight">{title}</span>
                        </div>
                        {isOpen ? <ChevronDown className="w-3 h-3 text-primary animate-in zoom-in-50" /> : <ChevronUp className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />}
                    </button>
                </PopoverTrigger>
            </div>
            
            <PopoverContent 
                side="top" 
                className="w-64 p-5 rounded-3xl shadow-2xl border-none bg-white dark:bg-card animate-in slide-in-from-bottom-2 duration-300 z-50 mb-4"
                align="center"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary">{title} Module</h4>
                        <ArrowUpRight className="w-3 h-3 text-slate-300" />
                    </div>
                    {renderContent()}
                </div>
            </PopoverContent>
        </Popover>
    );
};

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
        <div className="min-h-screen bg-background transition-colors duration-300 pb-20 lg:pb-0 overflow-x-hidden">
            <Navbar />

            <main className="container mx-auto px-4 py-6 md:py-10 max-w-[1600px]">
                
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    
                    {/* Main Workspace: 2 Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                        
                        {/* LEFT COLUMN: CONTROL PANEL */}
                        <div className="lg:col-span-4 space-y-6 animate-in fade-in slide-in-from-left-10 duration-700">
                            
                            {/* Project Configuration Card */}
                            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-card overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 px-8 py-5">
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
                                <CardContent className="p-6 space-y-6">
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
                                        <div className={`relative border-2 border-dashed rounded-[2rem] p-8 md:p-10 text-center transition-all ${
                                            selectedFile 
                                                ? "border-primary bg-primary/5 dark:bg-primary/10" 
                                                : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        }`}>
                                            {selectedFile ? (
                                                <div className="animate-in zoom-in-95 duration-300">
                                                    <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl shadow-primary/30 relative">
                                                        <File className="w-7 h-7" />
                                                        <button 
                                                            onClick={clearFile}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs line-clamp-1 px-4">{selectedFile.name}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-inner">
                                                        <UploadCloud className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter text-xs">Upload Blueprints</p>
                                                    <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest font-black italic">PDF • DWG • RVT • IFC</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Neural Prompt */}
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full min-h-[120px] p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 focus:ring-1 ring-primary/20 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-medium text-xs leading-relaxed border-slate-100 dark:border-white/5 shadow-inner"
                                            placeholder="E.g., A 3-story boutique hotel with industrial aesthetics..."
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-14 text-[10px] font-black gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl bg-primary hover:bg-primary/90 text-white uppercase tracking-[0.2em]"
                                        onClick={startAiAnalysis}
                                        disabled={isSurveying}
                                    >
                                        {isSurveying ? (
                                            <><RefreshCw className="w-4 h-4 animate-spin" /> SYNTHESIZING...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4 text-yellow-300" /> GENERATE BoQ</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: DYNAMIC RESULTS WORKSPACE */}
                        <div className="lg:col-span-8 relative">
                            {/* Fancy Red/Blue Border Container */}
                            <div className="absolute -inset-[2px] bg-gradient-to-tr from-primary via-slate-200 to-sky-500 rounded-[2.5rem] opacity-30 lg:opacity-100 blur-[1px] hidden lg:block"></div>
                            
                            <div className="relative bg-white dark:bg-card h-full rounded-[2.5rem] overflow-hidden flex flex-col">
                                {surveyComplete ? (
                                    <div className="flex-grow flex flex-col p-6 lg:p-10 animate-in slide-in-from-bottom-10 fade-in duration-700">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                            <div>
                                                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Analysis <span className="text-primary italic">#QS-9421</span></h2>
                                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-1 uppercase tracking-widest"><Activity className="w-3.5 h-3.5 text-emerald-500" /> 98.2% Accuracy Rating</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" className="h-10 rounded-xl px-6 border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2"><BarChart className="w-4 h-4" /> CSV</Button>
                                                <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200"><History className="w-4 h-4" /></Button>
                                            </div>
                                        </div>

                                        <Tabs defaultValue="phase1" className="w-full flex-grow flex flex-col">
                                            <div className="bg-slate-50 dark:bg-white/5 p-1 px-4 border rounded-2xl mb-6">
                                                <TabsList className="bg-transparent border-none w-full justify-start gap-2 overflow-x-auto h-auto p-0 scrollbar-hide">
                                                    <TabsTrigger value="phase1" className="rounded-xl px-5 py-2.5 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all italic">Phase 1</TabsTrigger>
                                                    <TabsTrigger value="phase2" className="rounded-xl px-5 py-2.5 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all italic">Phase 2</TabsTrigger>
                                                    <TabsTrigger value="phase3" className="rounded-xl px-5 py-2.5 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all italic">Phase 3</TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <div className="flex-grow overflow-y-auto max-h-[400px] lg:max-h-[350px] custom-scrollbar px-2">
                                                <TabsContent value="phase1" className="space-y-3 m-0 pb-4">
                                                    {[
                                                        { item: "Portland Cement (50kg)", qty: "1,200 bags", price: "₦14.4M", provider: "Dangote" },
                                                        { item: "Granite (3/4 inch)", qty: "450 Tons", price: "₦6.75M", provider: "Vetted" },
                                                        { item: "Sharp Sand", qty: "320 Tons", price: "₦3.2M", provider: "Vetted" },
                                                        { item: "Reinforcement Steel (16mm)", qty: "85 Tons", price: "₦51M", provider: "Universal" }
                                                    ].map((row, i) => (
                                                        <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-primary/20 transition-all group">
                                                            <div className="flex-grow">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tighter">{row.item}</h4>
                                                                    <Badge className="text-[8px] h-3.5 px-1 font-black uppercase bg-primary/10 text-primary border-none">{row.provider}</Badge>
                                                                </div>
                                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{row.qty} required</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-lg text-slate-900 dark:text-white leading-none italic">{row.price}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </TabsContent>
                                            </div>

                                            <div className="mt-4 p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 flex justify-between items-center">
                                                <div>
                                                    <p className="text-emerald-800 dark:text-green-400 font-black uppercase tracking-[0.2em] text-[8px] mb-1">Phase 1 Total Index</p>
                                                    <p className="text-3xl font-black text-emerald-900 dark:text-green-200 italic">₦75.3M</p>
                                                </div>
                                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 h-12 rounded-xl text-xs uppercase tracking-widest gap-3 shadow-lg shadow-emerald-500/20">
                                                    Procurement <ShoppingCart className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Tabs>
                                    </div>
                                ) : (
                                    <div className="flex-grow flex flex-col justify-center items-center lg:items-start p-8 lg:p-12 animate-in fade-in duration-1000">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8 w-fit shrink-0">
                                            <BrainCircuit className="w-3.5 h-3.5" /> Neural QS v4.0
                                        </div>
                                        
                                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.8] mb-8">
                                            AI-Powered <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-orange-500 italic">Bill of Quantities</span>
                                        </h1>
                                        
                                        <p className="text-sm md:text-lg lg:text-2xl text-slate-400 dark:text-slate-500 font-medium leading-tight max-w-xl italic lg:max-w-2xl">
                                            Transform architectural prompts or blueprints into detailed, phased material estimations in seconds.
                                        </p>
                                        
                                        {/* Process Overview */}
                                        <div className="flex gap-10 mt-16 opacity-30 lg:mt-20">
                                            {[
                                                { icon: UploadCloud, label: "Vault" },
                                                { icon: Sparkles, label: "Neural Engine" },
                                                { icon: BarChart, label: "BoQ Deliver" }
                                            ].map((step, i) => (
                                                <div key={i} className="flex flex-col items-center lg:items-start gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <step.icon className="w-5 h-5 shadow-inner" />
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{step.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* DESKTOP ONLY: LEGACY MODULES WITH FANCY BORDERS & UPWARD DROPDOWNS */}
                    <div className="mt-4 lg:mt-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 mb-4">Legacy Estimation Protocol Modules</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                            {[
                                { title: "Concrete Volume", icon: Calculator },
                                { title: "Roofing Shingles", icon: Calculator },
                                { title: "Block & Mortar", icon: Calculator },
                                { title: "Tile Spacer", icon: Calculator }
                            ].map((mod) => (
                                <LegacyModule key={mod.title} {...mod} />
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Calculators;
