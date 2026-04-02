import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Video, Download, BookOpen, AlertTriangle, TrendingUp, Lock, Cpu, Layers, HardHat, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const Resources = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const { role } = useAuth();
  const isPro = role === "professional" || role === "vendor"; // Vendors also get pro access for technical data

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
    <div className="min-h-screen bg-slate-50/50 dark:bg-black transition-colors duration-300">
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden bg-slate-900 dark:bg-card text-white transition-colors duration-300">
        <div className="absolute top-0 right-0 p-20 bg-primary/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight uppercase leading-none">
              Technical <span className="text-primary italic">Resource</span> Center
            </h1>
            <p className="text-xl text-slate-400 font-medium italic">
              High-fidelity CAD/BIM models, industry standards, and precision guides for the modern construction team.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b dark:border-white/5 py-4 shadow-sm transition-colors md:top-20">
        <div className="container mx-auto px-4 flex gap-3 overflow-x-auto no-scrollbar items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-2 shrink-0">Filter By:</span>
          {resourceFilters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full gap-2 whitespace-nowrap px-6 h-9 text-xs font-black uppercase tracking-widest transition-all ${activeFilter === filter.id ? 'bg-primary text-white hover:bg-primary/90' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              <filter.icon className="w-3.5 h-3.5" /> {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Articles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <Card key={index} className={`group border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] ${article.isPro ? 'ring-1 ring-primary/20 dark:ring-primary/10' : ''}`}>
                {article.isPro && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-primary text-white p-2.5 rounded-full shadow-lg">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <CardContent className="pt-8">
                  <div className={`p-4 rounded-2xl w-fit mb-6 transition-colors ${article.isPro ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-400'}`}>
                    <article.icon className="w-8 h-8" />
                  </div>
                  <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-3">{article.category}</div>
                  <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{article.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed font-medium">{article.description}</p>
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                    <span className={article.isPro ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}>{article.readTime}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 group-hover:bg-primary/5 h-8 font-black uppercase italic"
                      asChild={article.isPro && !isPro}
                    >
                      {article.isPro && !isPro ? (
                        <Link to="/register/pro">Upgrade <Lock className="w-3 h-3" /></Link>
                      ) : (
                        <span>Explore <TrendingUp className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Downloadable Resources */}
      <section className="py-24 bg-slate-900 dark:bg-slate-950 text-white transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">Technical Assets</h2>
            <p className="text-xl text-slate-400 italic">Direct access to verified construction documentation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {downloads.map((download, index) => (
              <Card key={index} className="border-none bg-white/5 dark:bg-white/[0.05] backdrop-blur hover:bg-white/10 dark:hover:bg-white/[0.1] transition-all group rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardContent className="pt-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-4 rounded-2xl bg-white/10 group-hover:bg-primary transition-all group-hover:scale-110">
                      <download.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${download.isPro ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {download.format}
                    </span>
                  </div>
                  <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{download.title}</h3>
                  <p className="text-slate-400 mb-8 font-medium leading-relaxed italic">"{download.description}"</p>
                  <Button
                    className={`w-full h-12 gap-3 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg ${download.isPro ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20' : 'bg-white text-slate-900 hover:bg-slate-100 shadow-white/10'}`}
                    asChild={download.isPro && !isPro}
                  >
                    {download.isPro && !isPro ? (
                      <Link to="/register/pro">
                        <Sparkles className="w-4 h-4" /> Upgrade to Access
                      </Link>
                    ) : (
                      <>
                        {download.isPro ? <Sparkles className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        {download.isPro ? "Download Pro Asset" : "Download Now"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Resources;
