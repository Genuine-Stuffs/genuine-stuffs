import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
    Sparkles,
    Zap,
    Target,
    TrendingUp,
    ShieldCheck,
    Cpu,
    Wand2,
    Layers,
    Calculator,
    Map,
    FileText,
    History,
    Compass,
    Trees,
    HardHat,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const AIDocumentation = () => {
    const professionalInsights = [
        {
            role: "Architect",
            icon: <Wand2 className="w-8 h-8 text-primary" />,
            gain: "Massing studies in seconds, not hours.",
            description: "Generate complex parametric forms and sustainable facade concepts instantly to jumpstart the design phase."
        },
        {
            role: "Designer",
            icon: <Sparkles className="w-8 h-8 text-primary" />,
            gain: "Photorealistic material moodboards.",
            description: "Visualize luxury interiors and custom material palettes with perfect lighting before sourcing a single sample."
        },
        {
            role: "QS",
            icon: <Target className="w-8 h-8 text-primary" />,
            gain: "Predictive BoQ & Risk Analysis.",
            description: "Analyze market fluctuations and generate dynamic bill of quantities that adjust to real-time material price indices."
        },
        {
            role: "Structural Engineer",
            icon: <Layers className="w-8 h-8 text-primary" />,
            gain: "Automated Load-Path Visualization.",
            description: "Instantly render structural diagrams and reinforcement concepts for preliminary design reviews."
        },
        {
            role: "MEP Engineer",
            icon: <Calculator className="w-8 h-8 text-primary" />,
            gain: "Precision ductwork & HVAC routing.",
            description: "Synthesize optimal utility pathways through complex architectural volumes to minimize site clashes."
        },
        {
            role: "Project Manager",
            icon: <History className="w-8 h-8 text-primary" />,
            gain: "Real-time Site Logistics Mapping.",
            description: "Plan crane positioning, crew flow, and material staging with AI-driven spatial optimization."
        },
        {
            role: "Civil Engineer",
            icon: <Compass className="w-8 h-8 text-primary" />,
            gain: "Topographic & Drainage Synthesis.",
            description: "Convert basic site surveys into comprehensive drainage and infrastructure visualizations in one sync."
        },
        {
            role: "Landscape Architect",
            icon: <Trees className="w-8 h-8 text-primary" />,
            gain: "Native Ecosystem Visualization.",
            description: "Generate rich hardscape and softscape plans that respect native species and urban flow."
        },
        {
            role: "Site Supervisor",
            icon: <HardHat className="w-8 h-8 text-primary" />,
            gain: "0-Error Safety Protocol Audits.",
            description: "Generate site safety markers and fall protection layouts to ensure 100% compliance during high-risk phases."
        }
    ];

    return (
        <div className="relative min-h-screen bg-transparent overflow-hidden selection:bg-primary/30">
            <div className="mesh-background" />
            <div className="noise-overlay" />
            <Navbar />

            <main className="container relative mx-auto px-4 py-20 z-10">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-24 animate-cascade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                        <Cpu className="w-4 h-4 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Documentation v4.0</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 leading-[0.9]">
                        10x Productivity <br />
                        <span className="text-primary italic">Studio Intelligence</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium italic max-w-2xl mx-auto leading-relaxed">
                        The AI Studio isn't just a tool—it's your digital co-architect, engineer, and manager.
                        Synthesize weeks of technical labor into seconds of neural processing.
                    </p>
                    <div className="flex justify-center gap-6 mt-12">
                        <Button asChild size="lg" className="rounded-2xl px-8 h-14 font-black uppercase tracking-widest bg-slate-900 dark:bg-white dark:text-black hover:bg-primary hover:text-white transition-all shadow-2xl">
                            <Link to="/pro/ai-studio">Enter Workspace</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="rounded-2xl px-8 h-14 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-white/10 hover:border-primary transition-all">
                            Watch Demo
                        </Button>
                    </div>
                </div>

                {/* Core Value Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                    {[
                        { icon: <Zap />, title: "Rapid Iteration", desc: "Test 50+ massing or material concepts in the time it takes to draw one." },
                        { icon: <TrendingUp />, title: "Precision Gains", desc: "Minimize human error in preliminary site studies and logistics planning." },
                        { icon: <ShieldCheck />, title: "Expert Guardrails", desc: "Built with industry-specific protocol knowledge across 9 core disciplines." }
                    ].map((pillar, i) => (
                        <Card key={i} className="bg-white/50 dark:bg-slate-900/60 backdrop-blur-md border-slate-100 dark:border-white/5 rounded-[2.5rem] p-10 hover:border-primary/30 transition-all group animate-cascade-in" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                {pillar.icon}
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4 italic">{pillar.title}</h3>
                            <p className="text-sm text-slate-500 font-medium italic leading-relaxed">{pillar.desc}</p>
                        </Card>
                    ))}
                </div>

                {/* Discipline Grid */}
                <div className="space-y-12 animate-cascade-in" style={{ animationDelay: '300ms' }}>
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4">The Discipline <span className="text-primary italic">Matrix</span></h2>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Optimized workflows for every professional node.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {professionalInsights.map((insight, i) => (
                            <div key={i} className="p-8 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-[2rem] border border-slate-100 dark:border-white/5 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-all flex flex-col group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-white/10 group-hover:text-primary transition-colors">
                                        {insight.icon}
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white italic">{insight.role}</h4>
                                </div>
                                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">{insight.gain}</p>
                                <p className="text-sm text-slate-500 font-medium italic leading-relaxed mb-6 flex-grow">{insight.description}</p>
                                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                                    Learn Strategy <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final CTA */}
                <div className="mt-32 p-12 md:p-20 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden text-center animate-cascade-in" style={{ animationDelay: '500ms' }}>
                    <div className="absolute inset-0 mesh-background opacity-20" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic mb-8">Ready to evolve your <br /> architectural node?</h2>
                        <Button asChild size="lg" className="rounded-2xl px-12 h-16 font-black uppercase tracking-widest bg-primary text-white hover:scale-105 transition-all shadow-3xl shadow-primary/20">
                            <Link to="/pro/ai-studio">Launch AI Studio</Link>
                        </Button>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mt-10">V4.0 Integrated | Neural Protocol Stable</p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AIDocumentation;
