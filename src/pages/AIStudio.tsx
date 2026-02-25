import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, BookOpen, Sparkles, Wand2, FileText, Share2, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const AIStudio = () => {
    const { role } = useAuth();
    const isPro = role === "pro";
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl shadow-inner transition-colors">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase">AI Innovation Studio</h1>
                    </div>
                    <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-3xl font-medium leading-relaxed italic">
                        Access next-generation building tools. Design, survey, and plan with AI-powered precision.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {/* Architect Tool */}
                    <Card className="lg:col-span-2 border-2 border-primary/20 dark:border-primary/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors">
                        <CardHeader className="p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tighter">
                                        <Wand2 className="w-7 h-7 text-primary" />
                                        Architectural Prompting
                                    </CardTitle>
                                    <CardDescription className="text-lg mt-4 text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                                        Describe your building vision in detail and let AI generate professional conceptual plans.
                                    </CardDescription>
                                </div>
                                {isPro ? (
                                    <span className="px-4 py-1.5 bg-green-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/20">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Pro Access Active
                                    </span>
                                ) : (
                                    <Button variant="outline" size="sm" className="rounded-full border-primary text-primary hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] h-9 px-6 transition-all" asChild>
                                        <Link to="/register/pro">Upgrade <Lock className="w-3 h-3 ml-2" /></Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-8 min-h-[350px] flex flex-col justify-end border-2 border-dashed border-slate-300 dark:border-slate-700 transition-colors">
                                <div className="space-y-6 max-w-2xl">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl text-sm border dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">
                                        "Design a 4-bedroom sustainable villa with a flat roof, large floor-to-ceiling windows, and an integrated vertical garden. Focus on tropical cross-ventilation principles."
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            disabled={!isPro}
                                            placeholder={isPro ? "Prompt your building idea..." : "Upgrade to unlock AI Prompting"}
                                            className="flex-1 px-6 py-4 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-primary/10 font-bold placeholder:text-slate-400"
                                        />
                                        <Button disabled={!isPro} className="gap-2 font-black px-10 rounded-xl uppercase tracking-widest shadow-xl shadow-primary/20">
                                            <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Generate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions / Team Focus */}
                    <div className="space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-xl dark:bg-slate-900/50 transition-colors">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                                    <BookOpen className="w-6 h-6 text-primary" /> Active Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8">
                                <div className="text-center py-10 text-slate-400 dark:text-slate-500 border-2 border-dashed dark:border-slate-800 rounded-2xl italic font-medium transition-colors">
                                    No active AI projects. Start a new prompt to begin.
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 dark:bg-black text-white rounded-[2.5rem] border-none shadow-2xl transition-all hover:scale-[1.02] overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black text-primary uppercase tracking-widest">Pro Tools Hub</CardTitle>
                                <CardDescription className="text-slate-400 font-medium italic">
                                    Specialized tools for your construction role.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-4">
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <Calculator className="w-4 h-4" /> Structural Load Estimator
                                </Button>
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <FileText className="w-4 h-4" /> Automated BoQ Generator
                                </Button>
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic text-xs">
                                    <Share2 className="w-4 h-4" /> BIM Collaboration Hub
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Quantity Surveying Section */}
                <section className="py-16 border-t dark:border-slate-800 transition-colors">
                    <h2 className="text-3xl md:text-4xl font-black mb-10 text-slate-900 dark:text-white uppercase tracking-tight">AI Quantity Surveying</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <p className="text-xl text-muted-foreground dark:text-slate-400 font-medium leading-relaxed italic">
                                Upload your project documents and our AI will parse them to create a detailed, phase-by-phase material and cost breakdown.
                            </p>
                            <ul className="space-y-5">
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Automatic identification of material quantities from CAD.</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Live pricing synchronization with our marketplace.</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Interactive Phase Scheduling (Foundations, Shell, Finishes).</span>
                                </li>
                            </ul>
                            <Button
                                size="lg"
                                className="px-10 py-8 text-xl rounded-2xl shadow-2xl shadow-primary/20 transition-all font-black uppercase tracking-widest h-16"
                                asChild={!isPro}
                            >
                                {!isPro ? (
                                    <Link to="/register/pro">Become a Pro <Sparkles className="w-5 h-5 ml-3" /></Link>
                                ) : (
                                    <span>Upload Project Blueprint</span>
                                )}
                            </Button>
                        </div>
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 transition-colors">
                            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] aspect-video flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 transition-colors border-2 border-dashed dark:border-slate-700">
                                <Calculator className="w-20 h-20 mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">BIM/CAD Preview Area</p>
                                <p className="text-sm font-medium italic mt-2">Upload a model to see AI analysis overlap.</p>
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
