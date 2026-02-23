import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, BookOpen, Sparkles, Wand2, FileText, Share2, CheckCircle2 } from "lucide-react";

const AIStudio = () => {
    return (
        <div className="min-h-screen bg-slate-50/30">
            <Navbar />

            <main className="container mx-auto px-4 py-12">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">AI Innovation Studio</h1>
                    </div>
                    <p className="text-xl text-muted-foreground max-w-3xl">
                        Access next-generation building tools. Design, survey, and plan with AI-powered precision.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {/* Architect Tool */}
                    <Card className="lg:col-span-2 border-2 border-primary/20 bg-white/50 backdrop-blur">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <Wand2 className="w-6 h-6 text-primary" />
                                        Architectural Prompting
                                    </CardTitle>
                                    <CardDescription className="text-lg mt-2">
                                        Describe your building vision in detail and let AI generate professional conceptual plans.
                                    </CardDescription>
                                </div>
                                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase">Subscription Required</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-slate-100 rounded-xl p-6 min-h-[300px] flex flex-col justify-end border-dashed border-2 border-slate-300">
                                <div className="space-y-4 max-w-xl">
                                    <div className="bg-white p-4 rounded-lg shadow-sm text-sm border">
                                        "Design a 4-bedroom sustainable villa with a flat roof, large floor-to-ceiling windows, and an integrated vertical garden. Focus on tropical cross-ventilation principles."
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            disabled
                                            placeholder="Prompt your building idea..."
                                            className="flex-1 px-4 py-3 rounded-lg border bg-slate-50 text-muted-foreground"
                                        />
                                        <Button disabled className="gap-2">
                                            <Sparkles className="w-4 h-4" /> Generate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions / Team Focus */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" /> Active Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg italic">
                                    No active AI projects. Start a new prompt to begin.
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Pro Tools Marketplace</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Specialized tools for your construction role.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">
                                    <Calculator className="w-4 h-4" /> Structural Load Estimator
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">
                                    <FileText className="w-4 h-4" /> Automated BoQ Generator
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 text-slate-300 border-white/10 hover:bg-white/10">
                                    <Share2 className="w-4 h-4" /> BIM Collaboration Hub
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Quantity Surveying Section */}
                <section className="py-12 border-t">
                    <h2 className="text-3xl font-bold mb-8">AI Quantity Surveying & Planning</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <p className="text-lg text-muted-foreground">
                                Upload your project documents and our AI will parse them to create a detailed, phase-by-phase material and cost breakdown.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span>Automatic identification of material quantities from CAD.</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span>Live pricing synchronization with our marketplace.</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span>Interactive Phase Scheduling (Foundations, Shell, Finishing).</span>
                                </li>
                            </ul>
                            <Button size="lg" className="px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-primary/20 transition-all">
                                Upload Project Blueprint
                            </Button>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-2xl bg-white p-2 border">
                            <div className="bg-slate-100 rounded-xl aspect-video flex flex-col items-center justify-center text-muted-foreground">
                                <Calculator className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-semibold">BIM/CAD Model Preview Area</p>
                                <p className="text-sm">Upload a model to see AI analysis overlap.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default AIStudio;
