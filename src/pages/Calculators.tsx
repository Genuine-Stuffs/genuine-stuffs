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
    
    // States for Concrete Volume
    const [concreteL, setConcreteL] = useState("");
    const [concreteW, setConcreteW] = useState("");
    const [concreteD, setConcreteD] = useState("");
    const [concreteRes, setConcreteRes] = useState<{ volume: number; cement: number; sand: number; gravel: number } | null>(null);

    // States for Roofing Shingles
    const [roofArea, setRoofArea] = useState("");
    const [roofPitch, setRoofPitch] = useState("");
    const [roofRes, setRoofRes] = useState<{ actualArea: number; bundles: number; squares: number } | null>(null);

    // States for Block & Mortar
    const [blockL, setBlockL] = useState("");
    const [blockH, setBlockH] = useState("");
    const [blockRes, setBlockRes] = useState<{ area: number; blocks: number; cement: number; sand: number } | null>(null);

    // States for Tile Spacer
    const [tileArea, setTileArea] = useState("");
    const [tileSize, setTileSize] = useState("60x60");
    const [tileSpacerGap, setTileSpacerGap] = useState("3");
    const [tileRes, setTileRes] = useState<{ tiles: number; spacers: number; packs: number } | null>(null);

    // Calculation Handlers
    const handleConcreteCalc = () => {
        const l = parseFloat(concreteL) || 0;
        const w = parseFloat(concreteW) || 0;
        const d = parseFloat(concreteD) || 0;
        if (l <= 0 || w <= 0 || d <= 0) return;
        const volume = l * w * d;
        // Standard 1:2:4 concrete mix estimation
        const cement = Math.ceil(volume * 8.4);
        const sand = parseFloat((volume * 0.45).toFixed(2));
        const gravel = parseFloat((volume * 0.9).toFixed(2));
        setConcreteRes({ volume, cement, sand, gravel });
    };

    const handleRoofCalc = () => {
        const area = parseFloat(roofArea) || 0;
        const pitchDeg = parseFloat(roofPitch) || 0;
        if (area <= 0) return;
        const pitchRad = (pitchDeg * Math.PI) / 180;
        const cosPitch = Math.cos(pitchRad);
        const actualArea = cosPitch > 0 ? area / cosPitch : area;
        const bundles = Math.ceil(actualArea / 3.0);
        const squares = parseFloat((actualArea / 9.3).toFixed(1));
        setRoofRes({ actualArea, bundles, squares });
    };

    const handleBlockCalc = () => {
        const l = parseFloat(blockL) || 0;
        const h = parseFloat(blockH) || 0;
        if (l <= 0 || h <= 0) return;
        const area = l * h;
        // Standard 9" blocks (10 blocks per m2)
        const blocks = Math.ceil(area * 10);
        const cement = Math.ceil(area * 0.6);
        const sand = parseFloat((area * 0.05).toFixed(2));
        setBlockRes({ area, blocks, cement, sand });
    };

    const handleTileCalc = () => {
        const area = parseFloat(tileArea) || 0;
        if (area <= 0) return;
        const parts = tileSize.toLowerCase().split('x');
        const w = parseFloat(parts[0]) || 60;
        const h = parseFloat(parts[1]) || 60;
        
        const tileAreaM2 = (w / 100) * (h / 100);
        const tiles = Math.ceil((area / tileAreaM2) * 1.10); // 10% wastage
        const spacers = tiles * 4;
        const packs = Math.ceil(spacers / 250);
        setTileRes({ tiles, spacers, packs });
    };

    const renderContent = () => {
        switch (title) {
            case "Concrete Volume":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">L (m)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={concreteL}
                                    onChange={(e) => setConcreteL(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">W (m)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={concreteW}
                                    onChange={(e) => setConcreteW(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">D (m)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={concreteD}
                                    onChange={(e) => setConcreteD(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            onClick={handleConcreteCalc}
                        >
                            Calculate Volume
                        </Button>
                        {concreteRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Total Volume:</span>
                                    <span className="text-slate-950 dark:text-white">{concreteRes.volume.toFixed(2)} m³</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Cement (50kg):</span>
                                    <span className="text-primary">{concreteRes.cement} bags</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Sand:</span>
                                    <span className="text-slate-950 dark:text-white">{concreteRes.sand} m³</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Gravel:</span>
                                    <span className="text-slate-950 dark:text-white">{concreteRes.gravel} m³</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "Roofing Shingles":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Area (m²)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={roofArea}
                                    onChange={(e) => setRoofArea(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Pitch (deg)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={roofPitch}
                                    onChange={(e) => setRoofPitch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            onClick={handleRoofCalc}
                        >
                            Bundles Estimate
                        </Button>
                        {roofRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Actual Area:</span>
                                    <span className="text-slate-950 dark:text-white">{roofRes.actualArea.toFixed(1)} m²</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Bundles Required:</span>
                                    <span className="text-primary">{roofRes.bundles} bundles</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Squares Cover:</span>
                                    <span className="text-slate-950 dark:text-white">{roofRes.squares} SQ</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "Block & Mortar":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Length (m)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={blockL}
                                    onChange={(e) => setBlockL(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Height (m)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="0.00" 
                                    value={blockH}
                                    onChange={(e) => setBlockH(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            onClick={handleBlockCalc}
                        >
                            Units Required
                        </Button>
                        {blockRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Wall Area:</span>
                                    <span className="text-slate-950 dark:text-white">{blockRes.area.toFixed(1)} m²</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Blocks (9"):</span>
                                    <span className="text-primary">{blockRes.blocks} units</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Cement (Mortar):</span>
                                    <span className="text-slate-950 dark:text-white">{blockRes.cement} bags</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Sand (Mortar):</span>
                                    <span className="text-slate-950 dark:text-white">{blockRes.sand} Tons</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "Tile Spacer":
                return (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-slate-400">Floor Area (m²)</p>
                            <Input 
                                className="h-8 rounded-lg text-xs" 
                                placeholder="0.00" 
                                value={tileArea}
                                onChange={(e) => setTileArea(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Tile Size (cm)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="60x60" 
                                    value={tileSize}
                                    onChange={(e) => setTileSize(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Gap (mm)</p>
                                <Input 
                                    className="h-8 rounded-lg text-xs" 
                                    placeholder="3" 
                                    value={tileSpacerGap}
                                    onChange={(e) => setTileSpacerGap(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            onClick={handleTileCalc}
                        >
                            Pack Count
                        </Button>
                        {tileRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Tiles Needed:</span>
                                    <span className="text-slate-950 dark:text-white">{tileRes.tiles} (+10% waste)</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Total Spacers:</span>
                                    <span className="text-slate-950 dark:text-white">{tileRes.spacers} spacers</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500 uppercase text-[9px]">Packs (250/pk):</span>
                                    <span className="text-primary">{tileRes.packs} pack(s)</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <Popover onOpenChange={setIsOpen}>
            <div className="relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-tr from-primary via-slate-200 to-sky-500 rounded-[1.5rem] lg:rounded-[2rem] opacity-40 group-hover:opacity-100 transition-opacity blur-[1px]"></div>
                
                <PopoverTrigger asChild>
                    <button className="relative w-full flex flex-col lg:flex-row items-center lg:justify-between px-4 lg:px-6 py-4 lg:py-5 bg-white dark:bg-card rounded-[1.5rem] lg:rounded-[2rem] border-none group-hover:bg-slate-50 transition-all shadow-sm z-10">
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-lg group-hover:bg-primary/10 transition-colors">
                                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="text-[9px] lg:text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tight text-left leading-tight lg:leading-normal">{title}</span>
                        </div>
                        <div className="absolute right-4 lg:relative lg:right-0">
                            {isOpen ? <ChevronDown className="w-3 h-3 text-primary animate-in zoom-in-50" /> : <ChevronUp className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />}
                        </div>
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

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    const startAiAnalysis = () => {
        setIsSurveying(true);
        setTimeout(() => {
            setIsSurveying(false);
            setSurveyComplete(true);
        }, 3000);
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
        <div className="min-h-screen bg-background dark:bg-black transition-colors duration-300 pb-20 lg:pb-0 overflow-x-hidden">
            {/* Desktop-only Global Nav: effectively hidden on Mobile */}
            <div className="hidden lg:block">
                <Navbar />
            </div>

            <main className="container mx-auto px-4 py-4 md:py-10 max-w-[1600px]">
                
                <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8">
                    
                    {!surveyComplete ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                            
                            <div className="lg:col-span-4 relative group">
                                <div className="absolute -inset-[2px] bg-gradient-to-tr from-primary via-slate-200 to-sky-500 rounded-[2.5rem] opacity-30 lg:opacity-40 blur-[1px]"></div>
                                
                                <Card className="relative border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-card overflow-hidden h-full z-10">
                                    <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 px-6 py-4 lg:px-8 lg:py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl">
                                                 <Database className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-base lg:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Project Input</h3>
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Node Configuration</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="p-6 space-y-6">
                                        <div className="lg:hidden text-center space-y-4 mb-2">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em]">
                                                <BrainCircuit className="w-3 h-3" /> Neural QS v4.0
                                            </div>
                                            {/* Optimized Layout to prevent text cut-off: using better font size and padding */}
                                            <div className="px-2">
                                                <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                                    AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500 italic block sm:inline">BoQ</span>
                                                </h1>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight max-w-[260px] mx-auto italic">
                                                Transform architectural prompts or blueprints into detailed material estimations.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <textarea
                                                className="w-full min-h-[140px] p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 focus:ring-1 ring-primary/20 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-medium text-xs leading-relaxed border-slate-100 dark:border-white/5 shadow-inner"
                                                placeholder="E.g., A 3-story boutique hotel with industrial aesthetics..."
                                            />
                                        </div>

                                        <div 
                                            className="relative group cursor-pointer"
                                            onClick={handleUploadClick}
                                        >
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                className="hidden"
                                                accept=".pdf,application/pdf,.dwg,image/vnd.dwg,image/x-dwg,application/acad,application/x-acad,application/autocad_dwg,application/dwg,application/x-dwg,application/x-autocad,drawing/dwg,drawing/x-dwg,.dxf,application/dxf,application/x-dxf,text/x-dxf,.rvt,application/octet-stream,.ifc,.skp,.jpg,.jpeg,.png"
                                            />
                                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-sky-500/10 to-primary/10 rounded-[1.5rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                                            <div className={`relative border border-slate-100 dark:border-white/5 rounded-[2rem] p-8 text-center transition-all ${
                                                selectedFile 
                                                    ? "bg-primary/5 dark:bg-primary/10 border-primary/20" 
                                                    : "bg-slate-50/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                                             }`}>
                                                 {selectedFile ? (
                                                     <div className="animate-in zoom-in-95 duration-300 flex items-center justify-center gap-4">
                                                         <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg relative shrink-0">
                                                             <File className="w-6 h-6" />
                                                             <button 
                                                                 onClick={clearFile}
                                                                 className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                                             >
                                                                 <X className="w-3 h-3" />
                                                             </button>
                                                         </div>
                                                         <div className="text-left">
                                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs line-clamp-1">{selectedFile.name}</p>
                                                            <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mt-1">Ready for Analysis</p>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <div className="flex flex-col items-center justify-center gap-4">
                                                         <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-[1.5rem] flex items-center justify-center shrink-0">
                                                             <UploadCloud className="w-6 h-6 text-red-500 opacity-80" />
                                                         </div>
                                                         <div className="text-center">
                                                             <p className="font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] text-[11px]">Upload Plan</p>
                                                             <p className="text-[8px] text-slate-400 uppercase tracking-[0.2em] font-black italic mt-1">PDF · DWG · RVT · DXF · IFC · SKP</p>
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
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

                            <div className="hidden lg:flex lg:col-span-8 relative">
                                <div className="flex-grow flex flex-col justify-center items-start lg:p-12 animate-in fade-in duration-1000">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8 w-fit shrink-0">
                                        <BrainCircuit className="w-3.5 h-3.5" /> Neural QS v4.0
                                    </div>
                                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.8] mb-8">
                                        AI-Powered <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-orange-500 italic">Bill of Quantities</span>
                                    </h1>
                                    <p className="text-sm md:text-lg lg:text-2xl text-slate-400 dark:text-slate-500 font-medium leading-tight max-w-xl italic lg:max-w-2xl">
                                        Transform architectural prompts or blueprints into detailed, phased material estimations in seconds.
                                    </p>
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
                            </div>
                        </div>
                    ) : (
                        <div className="lg:col-span-12 relative animate-in zoom-in-95 fade-in duration-700">
                             <div className="absolute -inset-[2px] bg-gradient-to-tr from-primary via-slate-200 to-sky-500 rounded-[2.5rem] opacity-30 lg:opacity-100 blur-[1px]"></div>
                             <div className="relative bg-white dark:bg-card min-h-[500px] rounded-[2.5rem] overflow-hidden flex flex-col p-6 lg:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic text-center lg:text-left w-full lg:w-auto">Analysis <span className="text-primary italic">#QS-9421</span></h2>
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center lg:justify-start gap-2 mt-1 uppercase tracking-widest"><Activity className="w-3.5 h-3.5 text-emerald-500" /> 98.2% Accuracy Rating</p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full lg:w-auto">
                                        <Button variant="outline" className="flex-1 lg:flex-none h-10 rounded-xl px-6 border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2"><BarChart className="w-4 h-4" /> CSV</Button>
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
                                                <div key={i} className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-primary/20 transition-all group gap-3 lg:gap-0">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-black text-slate-800 dark:text-white text-[11px] lg:text-sm uppercase tracking-tighter">{row.item}</h4>
                                                            <Badge className="text-[7px] lg:text-[8px] h-3.5 px-1 font-black uppercase bg-primary/10 text-primary border-none">{row.provider}</Badge>
                                                        </div>
                                                        <p className="text-[8px] lg:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{row.qty} required</p>
                                                    </div>
                                                    <div className="text-right w-full lg:w-auto border-t lg:border-none pt-2 lg:pt-0">
                                                        <p className="font-black text-base lg:text-lg text-slate-900 dark:text-white leading-none italic">{row.price}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </TabsContent>
                                    </div>

                                    <div className="mt-4 p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 flex flex-col lg:flex-row justify-between items-center gap-4">
                                        <div className="text-center lg:text-left">
                                            <p className="text-emerald-800 dark:text-green-400 font-black uppercase tracking-[0.2em] text-[8px] mb-1">Phase 1 Total Index</p>
                                            <p className="text-3xl lg:text-4xl font-black text-emerald-900 dark:text-green-200 italic">₦75.3M</p>
                                        </div>
                                        <Button className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 h-14 lg:h-12 rounded-xl text-xs uppercase tracking-widest gap-3 shadow-lg shadow-emerald-500/20">
                                            Procurement <ShoppingCart className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Tabs>
                             </div>
                        </div>
                    )}

                    <div className="mt-4 lg:mt-6 animate-in slide-in-from-bottom-5 duration-700">
                        <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 mb-4 text-center lg:text-left">Legacy Estimation Protocol Modules</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pb-2">
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
