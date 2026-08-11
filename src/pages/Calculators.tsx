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
    X, File, ArrowUpRight, Download, Mail, LogIn
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import AECBillOfQuantities from "@/components/aec/AECBillOfQuantities";

// ─────────────────────────────────────────────────────────────
// LegacyModule (unchanged)
// ─────────────────────────────────────────────────────────────
const LegacyModule = ({ title, icon: Icon }: { title: string; icon: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const [concreteL, setConcreteL] = useState("");
    const [concreteW, setConcreteW] = useState("");
    const [concreteD, setConcreteD] = useState("");
    const [concreteRes, setConcreteRes] = useState<{ volume: number; cement: number; sand: number; gravel: number } | null>(null);

    const [roofArea, setRoofArea] = useState("");
    const [roofPitch, setRoofPitch] = useState("");
    const [roofRes, setRoofRes] = useState<{ actualArea: number; bundles: number; squares: number } | null>(null);

    const [blockL, setBlockL] = useState("");
    const [blockH, setBlockH] = useState("");
    const [blockRes, setBlockRes] = useState<{ area: number; blocks: number; cement: number; sand: number } | null>(null);

    const [tileArea, setTileArea] = useState("");
    const [tileSize, setTileSize] = useState("60x60");
    const [tileSpacerGap, setTileSpacerGap] = useState("3");
    const [tileRes, setTileRes] = useState<{ tiles: number; spacers: number; packs: number } | null>(null);

    const handleConcreteCalc = () => {
        const l = parseFloat(concreteL) || 0;
        const w = parseFloat(concreteW) || 0;
        const d = parseFloat(concreteD) || 0;
        if (l <= 0 || w <= 0 || d <= 0) return;
        const volume = l * w * d;
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
        const tiles = Math.ceil((area / tileAreaM2) * 1.10);
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
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={concreteL} onChange={(e) => setConcreteL(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">W (m)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={concreteW} onChange={(e) => setConcreteW(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">D (m)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={concreteD} onChange={(e) => setConcreteD(e.target.value)} />
                            </div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800" onClick={handleConcreteCalc}>Calculate Volume</Button>
                        {concreteRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Total Volume:</span><span className="text-slate-950 dark:text-white">{concreteRes.volume.toFixed(2)} m³</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Cement (50kg):</span><span className="text-primary">{concreteRes.cement} bags</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Sand:</span><span className="text-slate-950 dark:text-white">{concreteRes.sand} m³</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Gravel:</span><span className="text-slate-950 dark:text-white">{concreteRes.gravel} m³</span></div>
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
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={roofArea} onChange={(e) => setRoofArea(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Pitch (deg)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={roofPitch} onChange={(e) => setRoofPitch(e.target.value)} />
                            </div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800" onClick={handleRoofCalc}>Bundles Estimate</Button>
                        {roofRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Actual Area:</span><span className="text-slate-950 dark:text-white">{roofRes.actualArea.toFixed(1)} m²</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Bundles Required:</span><span className="text-primary">{roofRes.bundles} bundles</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Squares Cover:</span><span className="text-slate-950 dark:text-white">{roofRes.squares} SQ</span></div>
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
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={blockL} onChange={(e) => setBlockL(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Height (m)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={blockH} onChange={(e) => setBlockH(e.target.value)} />
                            </div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800" onClick={handleBlockCalc}>Units Required</Button>
                        {blockRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Wall Area:</span><span className="text-slate-950 dark:text-white">{blockRes.area.toFixed(1)} m²</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Blocks (9"):</span><span className="text-primary">{blockRes.blocks} units</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Cement (Mortar):</span><span className="text-slate-950 dark:text-white">{blockRes.cement} bags</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Sand (Mortar):</span><span className="text-slate-950 dark:text-white">{blockRes.sand} Tons</span></div>
                            </div>
                        )}
                    </div>
                );
            case "Tile Spacer":
                return (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-slate-400">Floor Area (m²)</p>
                            <Input className="h-8 rounded-lg text-xs" placeholder="0.00" value={tileArea} onChange={(e) => setTileArea(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Tile Size (cm)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="60x60" value={tileSize} onChange={(e) => setTileSize(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Gap (mm)</p>
                                <Input className="h-8 rounded-lg text-xs" placeholder="3" value={tileSpacerGap} onChange={(e) => setTileSpacerGap(e.target.value)} />
                            </div>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800" onClick={handleTileCalc}>Pack Count</Button>
                        {tileRes && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 text-slate-900 dark:text-slate-200">
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Tiles Needed:</span><span className="text-slate-950 dark:text-white">{tileRes.tiles} (+10% waste)</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Total Spacers:</span><span className="text-slate-950 dark:text-white">{tileRes.spacers} spacers</span></div>
                                <div className="flex justify-between font-bold"><span className="text-slate-500 uppercase text-[9px]">Packs (250/pk):</span><span className="text-primary">{tileRes.packs} pack(s)</span></div>
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
            <PopoverContent side="top" className="w-64 p-5 rounded-3xl shadow-2xl border-none bg-white dark:bg-card animate-in slide-in-from-bottom-2 duration-300 z-50 mb-4" align="center">
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

// ─────────────────────────────────────────────────────────────
// Calculators — main page
// ─────────────────────────────────────────────────────────────
const Calculators = () => {
    const { user } = useAuth();

    // AI analysis state
    const [prompt, setPrompt] = useState('');
    const [isSurveying, setIsSurveying] = useState(false);
    const [surveyComplete, setSurveyComplete] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedMaterials, setExtractedMaterials] = useState<any[]>([]);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth gate state
    const [showAuthGate, setShowAuthGate] = useState(false);
    const [authEmail, setAuthEmail] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authSent, setAuthSent] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // ── File handlers ─────────────────────────────────────────
    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    // ── AI analysis ───────────────────────────────────────────
    const startAiAnalysis = async () => {
        if (!prompt.trim() && !selectedFile) return;
        setIsSurveying(true);
        setAnalysisError(null);
        setExtractedMaterials([]);
        setSurveyComplete(false);

        try {
            let requestBody: any = { type: 'text', selectedRole: 'Quantity Surveyor' };

            if (selectedFile) {
                const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
                const isVisual = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);

                if (isVisual) {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(selectedFile);
                    });
                    requestBody = {
                        type: 'analyze_boq',
                        fileData: base64,
                        fileName: selectedFile.name,
                        fileType: ext,
                        mimeType: selectedFile.type || `application/${ext}`,
                        prompt: prompt || `Analyze this construction file: ${selectedFile.name}`,
                    };
                } else {
                    requestBody = {
                        type: 'analyze_boq',
                        fileData: '',
                        fileName: selectedFile.name,
                        fileType: ext,
                        mimeType: `application/${ext}`,
                        prompt: prompt || `Generate a BOQ for: ${selectedFile.name}`,
                    };
                }
            } else {
                requestBody = {
                    type: 'analyze_boq',
                    fileData: '',
                    fileName: '',
                    fileType: 'text',
                    mimeType: 'text/plain',
                    prompt: prompt,
                };
            }

            const { data, error } = await supabase.functions.invoke('ai-studio', { body: requestBody });

            if (error) throw error;
            if (data?.materials && Array.isArray(data.materials) && data.materials.length > 0) {
                setExtractedMaterials(data.materials);
                setSurveyComplete(true);
            } else {
                throw new Error('The AI returned no materials. Please try a more detailed prompt or different file.');
            }
        } catch (err: any) {
            setAnalysisError(err?.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSurveying(false);
        }
    };

    // ── PDF download (auth-gated) ─────────────────────────────
    const handlePdfDownload = () => {
        if (user) {
            triggerPdfDownload();
        } else {
            setShowAuthGate(true);
        }
    };

    const triggerPdfDownload = () => {
        window.print();
    };

    const handleMagicLinkLogin = async () => {
        if (!authEmail) return;
        setAuthLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email: authEmail,
            options: { emailRedirectTo: window.location.href }
        });
        setAuthLoading(false);
        if (!error) setAuthSent(true);
    };

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    };

    // ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background dark:bg-black transition-colors duration-300 pb-20 lg:pb-0 overflow-x-hidden">
            <div className="hidden lg:block"><Navbar /></div>

            {/* ── Auth Gate Dialog ── */}
            <Dialog open={showAuthGate} onOpenChange={setShowAuthGate}>
                <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Sign in to Download</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Your BOQ is ready. Create a free account or sign in to download the PDF.
                        </DialogDescription>
                    </DialogHeader>
                    {authSent ? (
                        <div className="py-8 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Check your email!</p>
                            <p className="text-sm text-slate-500 mt-2">
                                We sent a magic link to <strong>{authEmail}</strong>. Click it to sign in and download your BOQ.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    className="flex-1 h-12 rounded-xl"
                                    onKeyDown={(e) => e.key === 'Enter' && handleMagicLinkLogin()}
                                />
                                <Button
                                    onClick={handleMagicLinkLogin}
                                    disabled={authLoading || !authEmail}
                                    className="h-12 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black"
                                >
                                    {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">We'll email you a magic link — no password needed.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <main className="container mx-auto px-4 py-4 md:py-10 max-w-[1600px]">
                <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8">

                    {/* ── Main 12-col grid ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

                        {/* LEFT PANEL: Project Input (always visible) */}
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
                                    {/* Mobile hero (hidden on desktop) */}
                                    <div className="lg:hidden text-center space-y-4 mb-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em]">
                                            <BrainCircuit className="w-3 h-3" /> Neural QS v4.0
                                        </div>
                                        <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                            AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500 italic block sm:inline">BoQ</span>
                                        </h1>
                                        <p className="text-[10px] text-slate-500 font-medium leading-tight max-w-[260px] mx-auto italic">
                                            Transform architectural prompts or blueprints into detailed material estimations.
                                        </p>
                                    </div>

                                    {/* Prompt textarea */}
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full min-h-[120px] p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 focus:ring-1 ring-primary/20 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-medium text-xs leading-relaxed border-slate-100 dark:border-white/5 shadow-inner"
                                            placeholder="E.g., A 4-bedroom duplex in Lekki, Lagos with BQ for structural phase..."
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </div>

                                    {/* File upload zone */}
                                    <div className="relative group/upload cursor-pointer" onClick={handleUploadClick}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".pdf,.dwg,.rvt,.dxf,.ifc,.skp,.jpg,.jpeg,.png,image/*,application/pdf"
                                        />
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-sky-500/10 to-primary/10 rounded-[1.5rem] blur opacity-25 group-hover/upload:opacity-75 transition duration-1000"></div>
                                        <div className={`relative border rounded-[2rem] p-8 text-center transition-all ${
                                            selectedFile
                                                ? 'bg-primary/5 dark:bg-primary/10 border-primary/30'
                                                : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                                        }`}>
                                            {selectedFile ? (
                                                <div className="animate-in zoom-in-95 duration-300 flex items-center justify-center gap-4">
                                                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg relative shrink-0">
                                                        <File className="w-6 h-6" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFile(null);
                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                            }}
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

                                    {/* Error message */}
                                    {analysisError && (
                                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400">{analysisError}</p>
                                        </div>
                                    )}

                                    {/* CTA button */}
                                    <Button
                                        className="w-full h-14 text-[10px] font-black gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl bg-primary hover:bg-primary/90 text-white uppercase tracking-[0.2em]"
                                        onClick={startAiAnalysis}
                                        disabled={isSurveying || (!prompt.trim() && !selectedFile)}
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

                        {/* RIGHT PANEL: Hero → Loading → Results */}
                        <div className="lg:col-span-8 relative flex flex-col">

                            {/* IDLE STATE */}
                            {!surveyComplete && !isSurveying && (
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
                                        {[{ icon: UploadCloud, label: 'Vault' }, { icon: Sparkles, label: 'Neural Engine' }, { icon: BarChart, label: 'BoQ Deliver' }].map((step, i) => (
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

                            {/* LOADING STATE */}
                            {isSurveying && (
                                <div className="flex-grow flex flex-col items-center justify-center gap-8 lg:p-12 animate-in fade-in duration-500">
                                    <div className="relative w-32 h-32">
                                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                                        <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2.4s' }}></div>
                                        <div className="absolute inset-4 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '1.8s' }}></div>
                                        <div className="absolute inset-0 rounded-full bg-primary/5 flex items-center justify-center">
                                            <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Neural QS Processing</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-sm">Analyzing your construction document and extracting material quantities against the Nigerian market database...</p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full max-w-sm">
                                        {['Parsing document structure...', 'Classifying material categories...', 'Pricing against Lagos market rates...', 'Matching Genuine Stuffs inventory...'].map((step, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* RESULTS STATE */}
                            {surveyComplete && extractedMaterials.length > 0 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                                Analysis Complete — {extractedMaterials.length} Line Items
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 border-slate-200 dark:border-slate-700"
                                                onClick={() => { setSurveyComplete(false); setExtractedMaterials([]); }}
                                            >
                                                <RefreshCw className="w-3 h-3" /> New Analysis
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-white"
                                                onClick={handlePdfDownload}
                                            >
                                                <Download className="w-3 h-3" /> Download PDF
                                            </Button>
                                        </div>
                                    </div>
                                    <AECBillOfQuantities materials={extractedMaterials} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Legacy modules strip */}
                    <div className="mt-4 lg:mt-6 animate-in slide-in-from-bottom-5 duration-700">
                        <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 mb-4 text-center lg:text-left">Legacy Estimation Protocol Modules</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pb-2">
                            {[
                                { title: 'Concrete Volume', icon: Calculator },
                                { title: 'Roofing Shingles', icon: Calculator },
                                { title: 'Block & Mortar', icon: Calculator },
                                { title: 'Tile Spacer', icon: Calculator }
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
