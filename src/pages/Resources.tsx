import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Video, Download, BookOpen, AlertTriangle, TrendingUp, Lock, Cpu, Layers, HardHat, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const Resources = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const resourceFilters = [
    { id: "all", label: "All Resources", icon: BookOpen },
    { id: "cad", label: "CAD/BIM Models", icon: Cpu },
    { id: "standards", label: "Quality Standards", icon: ShieldCheck },
    { id: "guides", label: "Technical Guides", icon: FileText },
  ];

  const articles = [
    {
      icon: Cpu,
      category: "BIM MODEL",
      title: "Commercial High-Rise Structural Skeleton (.rvt)",
      description: "Complete Revit model for a 15-story structural frame with clash detection notes.",
      readTime: "Pro Members Only",
      isPro: true,
    },
    {
      icon: AlertTriangle,
      category: "Case Study",
      title: "10 Material Failures Common in Tropical Climates",
      description: "Learn from real-world examples of how climate-specific material failures impact projects.",
      readTime: "8 min read",
      isPro: false,
    },
    {
      icon: Layers,
      category: "Technical",
      title: "Reinforced Concrete Detail Library (.dwg)",
      description: "Comprehensive CAD files for various foundation and beam reinforcement scenarios.",
      readTime: "Pro Members Only",
      isPro: true,
    },
    {
      icon: TrendingUp,
      category: "Analysis",
      title: "How to Compare Material Lifespans",
      description: "A practical guide to evaluating and comparing long-term performance and cost-effectiveness.",
      readTime: "6 min read",
      isPro: false,
    },
  ];

  const downloads = [
    {
      title: "Material Quality Checklist for Project Owners",
      description: "A comprehensive PDF checklist covering essential material quality considerations.",
      icon: Download,
      format: "PDF",
      isPro: false,
    },
    {
      title: "BIM Protocol & Standards Handbook (2026)",
      description: "Industry standard operating procedures for digital construction modeling and handover.",
      icon: Lock,
      format: "PRO ONLY",
      isPro: true,
    },
    {
      title: "Material Compliance Quick Reference Guide",
      description: "Essential reference document for building codes, standards, and certification requirements.",
      icon: Download,
      format: "PDF",
      isPro: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute top-0 right-0 p-20 bg-primary/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              Technical <span className="text-primary italic">Resource</span> Center
            </h1>
            <p className="text-xl text-slate-400 font-medium">
              High-fidelity CAD/BIM models, industry standards, and precision guides for the modern construction team.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-20 z-40 bg-white border-b py-2 shadow-sm">
        <div className="container mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar">
          {resourceFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "ghost" : "ghost"} // Simplified for now
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full gap-2 whitespace-nowrap ${activeFilter === filter.id ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
            >
              <filter.icon className="w-4 h-4" /> {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Articles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <Card key={index} className={`group border-none shadow-sm hover:shadow-xl transition-all relative overflow-hidden bg-white ${article.isPro ? 'ring-2 ring-primary/10' : ''}`}>
                {article.isPro && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <CardContent className="pt-8">
                  <div className={`p-4 rounded-2xl w-fit mb-4 ${article.isPro ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                    <article.icon className="w-8 h-8" />
                  </div>
                  <div className="text-xs text-primary font-bold uppercase tracking-widest mb-2">{article.category}</div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{article.title}</h3>
                  <p className="text-muted-foreground mb-6 line-clamp-2">{article.description}</p>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className={article.isPro ? 'text-primary' : 'text-slate-400'}>{article.readTime}</span>
                    <Button variant="ghost" size="sm" className="gap-2 group-hover:bg-primary/5">
                      Explore <TrendingUp className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Downloadable Resources */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black mb-4">Technical Assets</h2>
            <p className="text-xl text-slate-400">Direct access to verified construction documentation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {downloads.map((download, index) => (
              <Card key={index} className="border-none bg-white/5 backdrop-blur hover:bg-white/10 transition-all group">
                <CardContent className="pt-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 rounded-2xl bg-white/10 group-hover:bg-primary transition-colors">
                      <download.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${download.isPro ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {download.format}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{download.title}</h3>
                  <p className="text-slate-400 mb-8">{download.description}</p>
                  <Button className={`w-full h-12 gap-2 font-bold ${download.isPro ? 'bg-primary' : 'bg-white text-slate-900 hover:bg-slate-100'}`}>
                    {download.isPro ? <Sparkles className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {download.isPro ? "Upgrade to Access" : "Download Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Resources;
