import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, UploadCloud, FileText, CheckCircle2, ChevronDown,
    BarChart, Activity, RefreshCw, Zap, Layers, Wrench
} from "lucide-react";

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

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-6xl">
                    <header className="mb-10 text-center">
                        <h1 className="text-4xl font-extrabold mb-4 flex items-center justify-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                            <Calculator className="w-10 h-10 text-primary" />
                            Interactive AI Surveying
                        </h1>
                        <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed italic">
                            Upload your blueprints or architectural prompts. Our AI immediately generates a phased breakdown of required materials and estimated costs.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Panel: Upload & Input */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-2 border-primary/20 dark:border-primary/10 dark:bg-slate-900 shadow-lg rounded-3xl overflow-hidden">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                                        <UploadCloud className="w-6 h-6 text-primary" />
                                        Project Input
                                    </CardTitle>
                                    <CardDescription className="dark:text-slate-500 font-medium">
                                        Upload CAD files, PDFs, or provide a detailed prompt to begin AI surveying.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                        <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <FileText className="w-8 h-8 text-primary" />
                                        </div>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">Drag & Drop Blueprint</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest font-black">Supports .dwg, .pdf, .rvt</p>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs font-black uppercase tracking-widest">
                                            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">OR</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full min-h-[120px] p-4 rounded-xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-medium"
                                            placeholder="Describe the building: E.g., A 3-story commercial block with 500sqm floor area per level..."
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-black gap-2 shadow-lg hover:shadow-primary/20 transition-all rounded-xl uppercase tracking-wider"
                                        onClick={startAiAnalysis}
                                        disabled={isSurveying}
                                    >
                                        {isSurveying ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Project...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Generate Bill of Quantities
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Additional Standard Calculators */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Standard Quick Tools</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {["Concrete Volume Calculator", "Roofing Shingles Estimator", "Block & Mortar Calculator", "Tile Spacer & Grout Tool"].map((tool) => (
                                        <Button key={tool} variant="outline" className="w-full justify-between hover:border-primary/50 transition-colors">
                                            {tool} <ChevronDown className="w-4 h-4 opacity-50" />
                                        </Button>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Panel: Output & Interactive BoQ */}
                        <div className="lg:col-span-2">
                            {surveyComplete ? (
                                <Card className="h-full border-0 shadow-2xl bg-white overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
                                    <div className="bg-primary/5 border-b p-6 flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                                <Activity className="w-7 h-7 text-primary" /> AI Generated Quantities
                                            </h2>
                                            <p className="text-muted-foreground text-sm mt-1">Based on "3-story commercial block, 500sqm/level..."</p>
                                        </div>
                                        <Button variant="outline" className="gap-2">
                                            <BarChart className="w-4 h-4" /> Export Report
                                        </Button>
                                    </div>

                                    <div className="p-6">
                                        <Tabs defaultValue="phase1" className="w-full">
                                            <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
                                                <TabsTrigger value="phase1" className="text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Phase 1: Foundation</TabsTrigger>
                                                <TabsTrigger value="phase2" className="text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Phase 2: Shell/Structure</TabsTrigger>
                                                <TabsTrigger value="phase3" className="text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Phase 3: Finishing</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="phase1" className="animate-in fade-in duration-300">
                                                <div className="space-y-4">
                                                    {/* Interactive Table Row */}
                                                    {[{ item: "Portland Cement (50kg)", qty: "1,200 bags", price: "₦ 14,400,000", alt: "View Eco-Friendly Alt" },
                                                    { item: "Granite (3/4 inch)", qty: "450 Tons", price: "₦ 6,750,000", alt: "Compare Suppliers" },
                                                    { item: "Sharp Sand", qty: "320 Tons", price: "₦ 3,200,000", alt: "Compare Suppliers" },
                                                    { item: "Reinforcement Steel (16mm)", qty: "85 Tons", price: "₦ 51,000,000", alt: "View Market Trends" }
                                                    ].map((row, i) => (
                                                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 transition-all group">
                                                            <div className="flex-1">
                                                                <h4 className="font-black text-slate-800 dark:text-white text-lg tracking-tight uppercase leading-none mb-1">{row.item}</h4>
                                                                <p className="text-xs text-primary font-black uppercase tracking-widest mt-1">Estimated {row.qty}</p>
                                                            </div>
                                                            <div className="flex items-center gap-6 mt-4 sm:mt-0">
                                                                <div className="text-right">
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-1">Estimated Cost</p>
                                                                    <p className="font-black text-xl text-slate-900 dark:text-white leading-none">{row.price}</p>
                                                                </div>
                                                                <Button size="sm" variant="secondary" className="bg-white dark:bg-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                                    {row.alt}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="mt-8 p-8 bg-green-50 dark:bg-green-950/30 rounded-3xl border border-green-200 dark:border-green-900/50 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors">
                                                        <div>
                                                            <p className="text-green-800 dark:text-green-400 font-black uppercase tracking-widest text-xs mb-2">Phase 1 Total Estimate</p>
                                                            <p className="text-4xl font-black text-green-900 dark:text-green-200">₦ 75,350,000</p>
                                                        </div>
                                                        <Button className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white font-black px-10 h-14 rounded-xl shadow-xl shadow-green-600/20 text-lg">
                                                            <CheckCircle2 className="w-6 h-6 mr-2" /> Send to Marketplace
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="phase2" className="text-center py-20 text-muted-foreground">
                                                <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p>Phase 2 (Shell & Superstructure) materials will be calculated based on structural selections.</p>
                                            </TabsContent>

                                            <TabsContent value="phase3" className="text-center py-20 text-muted-foreground">
                                                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p>Phase 3 (Finishing & MEP) materials will be calculated after finalizing interior plans.</p>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </Card>
                            ) : (
                                <div className="h-full min-h-[500px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/50 dark:bg-slate-900/50 transition-colors">
                                    <Calculator className="w-20 h-20 mb-6 text-slate-300 dark:text-slate-700" />
                                    <h3 className="text-2xl font-black mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Awaiting AI Input</h3>
                                    <p className="max-w-md mx-auto font-medium italic opacity-70">
                                        Once you upload a project file or describe your building, the AI will instantly generate a highly accurate, phase-by-phase material estimation.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Calculators;
