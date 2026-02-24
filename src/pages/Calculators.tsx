import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, UploadCloud, FileText, CheckCircle2, ChevronDown,
    BarChart, Activity, RefreshCw, Zap
} from "lucide-react";

const Calculators = () => {
    const [isSurveying, setIsSurveying] = useState(false);
    const [surveyComplete, setSurveyComplete] = useState(false);

    const startAiAnalysis = () => {
        setIsSurveying(true);
        setTimeout(() => {
            setIsSurveying(false);
            setSurveyComplete(true);
        }, 3000); // Simulate 3 seconds of AI processing
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-6xl">
                    <header className="mb-10 text-center">
                        <h1 className="text-4xl font-extrabold mb-4 flex items-center justify-center gap-3">
                            <Calculator className="w-10 h-10 text-primary" />
                            Interactive AI Surveying & Calculators
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Upload your blueprints or architectural prompts. Our AI immediately generates a phased breakdown of required materials and estimated costs.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Panel: Upload & Input */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <UploadCloud className="w-6 h-6 text-primary" />
                                        Project Input
                                    </CardTitle>
                                    <CardDescription>
                                        Upload CAD files, PDFs, or provide a detailed prompt to begin AI surveying.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                            <FileText className="w-8 h-8 text-primary" />
                                        </div>
                                        <p className="font-semibold text-slate-700">Drag & Drop Blueprint</p>
                                        <p className="text-sm text-slate-500 mt-2">Supports .dwg, .pdf, .rvt</p>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-muted-foreground">OR</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full min-h-[120px] p-4 rounded-xl border bg-slate-50/50 focus:bg-white transition-colors placeholder:text-slate-400"
                                            placeholder="Describe the building: E.g., A 3-story commercial block with 500sqm floor area per level, reinforced concrete frame..."
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-bold gap-2 shadow-md hover:shadow-xl transition-all"
                                        onClick={startAiAnalysis}
                                        disabled={isSurveying}
                                    >
                                        {isSurveying ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Project...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 text-yellow-400" /> Generate Bill of Quantities
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
                                                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-slate-800">{row.item}</h4>
                                                                <p className="text-sm text-primary font-semibold mt-1">Estimated. {row.qty}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Est. Cost</p>
                                                                    <p className="font-bold text-slate-800">{row.price}</p>
                                                                </div>
                                                                <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {row.alt}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-green-800 font-bold mb-1">Phase 1 Total Estimate</p>
                                                            <p className="text-3xl font-black text-green-900">₦ 75,350,000</p>
                                                        </div>
                                                        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 h-12">
                                                            <CheckCircle2 className="w-5 h-5" /> Send to Marketplace Cart
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
                                <div className="h-full min-h-[500px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/50">
                                    <Calculator className="w-20 h-20 mb-6 text-slate-300" />
                                    <h3 className="text-2xl font-bold mb-2 text-slate-500">Awaiting AI Input</h3>
                                    <p className="max-w-md mx-auto">
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

// Simple icon fallbacks since we didn't import all from lucide-react initially in this file
const Layers = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg>
);
const Wrench = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
);

export default Calculators;
