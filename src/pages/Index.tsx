import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  TrendingDown,
  Shield,
  TrendingUp,
  ClipboardCheck,
  Search,
  Hammer,
  Truck,
  HardHat,
  Cpu,
  Layers,
  Construction,
  Wrench,
  PencilRuler,
  Users,
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  MapPin,
  Heart,
  Loader2,
  ArrowRight,
  Terminal,
  Zap,
  FileSpreadsheet,
  Building2,
  Activity,
  BarChart3,
  Check,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Box,
  Database,
  Share2,
  Lock,
  Globe,
  Home,
  Droplets,
  Pyramid,
  Mountain,
  Package,
  Rows3,
  BrickWall,
  Blocks,
  PaintBucket
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import paperTakeoffLoss from "@/assets/hero/paper_takeoff_loss.jpg";
import townBefore1 from "@/assets/hero/town_before_1.png";
import townAfter1 from "@/assets/hero/town_after_1.png";
import townBefore2 from "@/assets/hero/town_before_2.png";
import townAfter2 from "@/assets/hero/town_after_2.png";
import trustImage from "@/assets/thematic/trust.png";
import valueImage from "@/assets/thematic/value.png";
import heroHighrise from "@/assets/hero/highrise.png";
import heroConstruction from "@/assets/hero/construction.png";
import heroCityscape from "@/assets/hero/cityscape.png";
import consultationImg from "@/assets/consultation-meeting.jpg";

const getCategoryIcon = (categoryStr: string) => {
  if (!categoryStr) return Box;
  const normalized = categoryStr.toLowerCase().replace(/\s+/g, '');
  if (normalized.includes('cement')) return Package;
  if (normalized.includes('sand') || normalized.includes('gravel')) return Pyramid;
  if (normalized.includes('stone') || normalized.includes('granite')) return Mountain;
  if (normalized.includes('steel') || normalized.includes('iron') || normalized.includes('rebar')) return Rows3;
  if (normalized.includes('roof')) return Home;
  if (normalized.includes('brick')) return BrickWall;
  if (normalized.includes('block')) return Blocks;
  if (normalized.includes('water')) return Droplets;
  if (normalized.includes('finish') || normalized.includes('decor')) return LayoutDashboard;
  if (normalized.includes('electric')) return Zap;
  if (normalized.includes('plumb')) return Wrench;
  if (normalized.includes('tool') || normalized.includes('equip')) return Hammer;
  return Box; // Explicit default fallback
};

const Index = () => {
  const { role } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [activePillar, setActivePillar] = useState<0 | 1 | 2>(0);
  const [activeFlywheelStep, setActiveFlywheelStep] = useState<number>(0);
  const [selectedBoqProject, setSelectedBoqProject] = useState<0 | 1 | 2>(0);

  // Hero Background 8-second Carousel State
  const [heroBgIndex, setHeroBgIndex] = useState(0);
  const heroBackgrounds = [
    "/hero-carousel/onsite.jpg",
    "/hero-carousel/skyline.jpg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [heroBackgrounds.length]);

  // Supabase Promoted Materials Query
  const { data: promotedProducts = [], isLoading: isPromotedLoading } = useQuery<any[]>({
    queryKey: ['promoted-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_verified', true)
        .limit(4);
      if (error) throw error;
      return data || [];
    }
  });

  // Supabase Category Counts
  const { data: categoryCounts = {} } = useQuery({
    queryKey: ['category-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('category');
      if (error) return {};
      return data.reduce((acc: Record<string, number>, curr) => {
        if (curr.category) acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
      }, {});
    }
  });

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // BoQ Takeoff Simulator Data
  const boqProjects = [
    {
      title: "4-Bedroom Duplex, Lekki",
      specs: "320 m² · Sandcrete Blockwork · Suspended Slab",
      totalCost: "₦58,400,000",
      timeToBoq: "2 min 45 sec",
      suppliersMatched: 4,
      items: [
        { name: "Concrete Grade C25", qty: "118 m³", unitPrice: "₦120,000", total: "₦14.16M", status: "Verified NIS" },
        { name: "High Yield Rebars Y16", qty: "9.4 t", unitPrice: "₦1,200,000", total: "₦11.28M", status: "Direct Mill" },
        { name: "Vibrated Blocks 225mm", qty: "1,840 no.", unitPrice: "₦1,800", total: "₦3.31M", status: "In Stock" },
        { name: "Aluminium Roof 0.55mm", qty: "410 m²", unitPrice: "₦12,000", total: "₦4.92M", status: "Factory Price" },
        { name: "Finishing & Electricals", qty: "Lump sum", unitPrice: "₦24,730,000", total: "₦24.73M", status: "Optimized" }
      ]
    },
    {
      title: "14-Unit Terrace Estate, Abuja",
      specs: "1,400 m² · Commercial Residential · Raft Foundation",
      totalCost: "₦245,800,000",
      timeToBoq: "4 min 12 sec",
      suppliersMatched: 9,
      items: [
        { name: "Ready-Mix Concrete C30", qty: "520 m³", unitPrice: "₦135,000", total: "₦70.20M", status: "Verified NIS" },
        { name: "High Yield Rebars Y16/Y12", qty: "38.5 t", unitPrice: "₦1,180,000", total: "₦45.43M", status: "Direct Mill" },
        { name: "Vibrated Blocks 225mm", qty: "8,600 no.", unitPrice: "₦1,750", total: "₦15.05M", status: "In Stock" },
        { name: "Stone Coated Roof Tiles", qty: "1,850 m²", unitPrice: "₦18,500", total: "₦34.22M", status: "Factory Price" },
        { name: "MEP & Interior Finishing", qty: "Lump sum", unitPrice: "₦80,900,000", total: "₦80.90M", status: "Optimized" }
      ]
    },
    {
      title: "Industrial Logistics Hub, Port Harcourt",
      specs: "2,500 m² · Structural Steel Frame · Heavy Duty Floor",
      totalCost: "₦412,000,000",
      timeToBoq: "5 min 30 sec",
      suppliersMatched: 12,
      items: [
        { name: "Heavy Duty Slab C35", qty: "950 m³", unitPrice: "₦145,000", total: "₦137.75M", status: "Verified NIS" },
        { name: "Structural Steel I-Beams", qty: "65.0 t", unitPrice: "₦1,650,000", total: "₦107.25M", status: "Direct Mill" },
        { name: "Industrial Cladding 0.7mm", qty: "3,200 m²", unitPrice: "₦22,000", total: "₦70.40M", status: "Factory Price" },
        { name: "Reinforced Mesh A142", qty: "2,500 m²", unitPrice: "₦8,500", total: "₦21.25M", status: "In Stock" },
        { name: "Site Civils & Drainage", qty: "Lump sum", unitPrice: "₦75,350,000", total: "₦75.35M", status: "Optimized" }
      ]
    }
  ];

  const flywheelSteps = [
    {
      num: "01",
      title: "Takeoff",
      subtitle: "AI Quantifies",
      desc: "Architects and engineers generate conceptual visualisations and costed BoQs instantly.",
      icon: Cpu,
    },
    {
      num: "02",
      title: "Execute",
      subtitle: "Site Reality",
      desc: "Contractors order materials and execute the build, logging real market prices and site outcomes.",
      icon: Construction,
    },
    {
      num: "03",
      title: "Learn",
      subtitle: "The Flywheel Feedback",
      desc: "Real outcomes feed back into the AI engine, making every subsequent estimation smarter and more precise.",
      icon: RefreshCw,
    }
  ];

  const categories = [
    { title: "Professionals", icon: Users, link: "/pros" },
    { title: "Artisans", icon: HardHat, link: "/pros" },
    { title: "Cement & Aggregates", icon: Package, dbCategory: "Cement & Aggregates" },
    { title: "Electrical", icon: Zap, dbCategory: "Electrical" },
    { title: "Finishing", icon: PaintBucket, dbCategory: "Finishing" },
    { title: "Flooring", icon: LayoutDashboard, dbCategory: "Flooring" },
    { title: "Plumbing", icon: Wrench, dbCategory: "Plumbing" },
    { title: "Roofing", icon: Home, dbCategory: "Roofing" },
    { title: "Steel & Iron", icon: Rows3, dbCategory: "Steel & Iron" },
    { title: "AI Studio", icon: Rocket, link: "/pro/ai-studio" },
  ];

  return (
    <div className="min-h-screen bg-[#F0F9FF] dark:bg-[#181E26] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-primary selection:text-white pb-24 md:pb-0 overflow-x-hidden">
      <Navbar />

      {/* =========================================================================
          SECTION 1: THE OPERATING SYSTEM HERO BANNER (Brand Red & Inter Only)
         ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-slate-950 border-b border-slate-800/80 pt-10 pb-20 md:py-28">
        {/* Infused Nigerian Architectural Background Carousel with 10s Auto-Flip, Ken Burns Zoom & Dimmed Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
          {heroBackgrounds.map((bgUrl, idx) => {
            const isActive = heroBgIndex === idx;
            return (
              <img 
                key={bgUrl}
                src={bgUrl} 
                alt="Genuine Stuffs Nigerian Construction Ecosystem" 
                style={{
                  opacity: isActive ? 0.8 : 0,
                  transform: isActive ? 'scale(1.06)' : 'scale(1.0)',
                  transition: 'opacity 2500ms ease-in-out, transform 10000ms ease-out',
                  zIndex: isActive ? 10 : 0
                }}
                className="absolute inset-0 w-full h-full object-cover object-center filter contrast-125" 
              />
            );
          })}
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/45 to-slate-950/95" />
        </div>
        {/* Subtle Brand Red Radial Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-primary/25 rounded-full blur-[130px] pointer-events-none z-0" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            
            {/* Top Specification Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-[0.1em]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-white font-bold">AI-Native Construction Operating System</span>
              </div>
              <div className="flex items-center gap-6">
                <span>System Status: Online</span>
                <span className="hidden sm:inline">Built for Nigeria</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16 relative">
              <div className="lg:col-span-7 flex flex-col justify-center">
                {/* Main Headline (Inter Display Weight 800/900) */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-6">
                  The operating system for <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-primary">building.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed mb-8">
                  Concept, quantities, materials and people — one continuous system. Go from a rough sketch to a costed bill of quantities to a placed, <span className="text-white font-bold underline decoration-primary decoration-2 underline-offset-4">verified</span> order in minutes, not weeks.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Button asChild size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                    <Link to="/pro/ai-studio">
                      <span>Open AI Studio</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <a href="#live-translation" className="text-slate-300 hover:text-white font-semibold flex items-center gap-2 transition-colors text-base group">
                    <span>Watch a live takeoff</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Compact BoQ Glimpse */}
              <div className="lg:col-span-5 relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-blue-500/10 rounded-2xl blur-xl pointer-events-none" />
                <div className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-3 mb-4">
                    <span className="text-xs font-mono text-slate-400">takeoff_engine.exe</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]">Live</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                      <span className="text-slate-300">Concrete Grade C30</span>
                      <span className="text-white font-mono">118 m³</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                      <span className="text-slate-300">High Yield Rebars Y16</span>
                      <span className="text-white font-mono">9.4 t</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Stone Coated Roof Tiles</span>
                      <span className="text-white font-mono">410 m²</span>
                    </div>
                    <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Value</span>
                      <span className="text-xl font-extrabold text-white tracking-tight">₦28.16M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Framed Live Metrics Bar (Activity Facts Only) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-3xl bg-transparent border border-slate-800/60 shadow-2xl backdrop-blur-[2px]">
              <div className="p-5 rounded-2xl bg-[#F0F9FF] hover:bg-transparent border border-slate-300 hover:border-slate-700/80 transition-all duration-300 group flex flex-col justify-center shadow-md hover:shadow-2xl">
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-950 group-hover:text-white tracking-tight transition-colors">3 min</span>
                <span className="text-xs uppercase tracking-[0.1em] text-slate-800 group-hover:text-primary font-bold mt-1 transition-colors">Median Concept → BoQ</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#F0F9FF] hover:bg-transparent border border-slate-300 hover:border-slate-700/80 transition-all duration-300 group flex flex-col justify-center shadow-md hover:shadow-2xl">
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-950 group-hover:text-white tracking-tight transition-colors">860+</span>
                <span className="text-xs uppercase tracking-[0.1em] text-slate-800 group-hover:text-primary font-bold mt-1 transition-colors">Verified Suppliers</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#F0F9FF] hover:bg-transparent border border-slate-300 hover:border-slate-700/80 transition-all duration-300 group flex flex-col justify-center shadow-md hover:shadow-2xl">
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-950 group-hover:text-white tracking-tight transition-colors">12,400</span>
                <span className="text-xs uppercase tracking-[0.1em] text-slate-800 group-hover:text-primary font-bold mt-1 transition-colors">Material SKUs Priced</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#F0F9FF] hover:bg-transparent border border-slate-300 hover:border-slate-700/80 transition-all duration-300 group flex flex-col justify-center shadow-md hover:shadow-2xl">
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-950 group-hover:text-white tracking-tight transition-colors">₦2.1B+</span>
                <span className="text-xs uppercase tracking-[0.1em] text-slate-800 group-hover:text-primary font-bold mt-1 transition-colors">Value Quantified</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: THE FRACTURE (Why We Exist — 6 Disconnected Industries)
         ========================================================================= */}
      <section className="py-20 bg-[#F0F9FF] dark:bg-[#181E26] border-b border-slate-200 dark:border-slate-800 relative transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            
            <div className="flex items-center gap-3 mb-4 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              <span>01 / The Fracture</span>
              <div className="h-[1px] flex-1 bg-primary/30" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6">
                <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
                  Building is not one industry. <br />
                  <span className="font-normal text-slate-600 dark:text-slate-400">It is six that do not speak.</span>
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-8">
                  Design hands over a drawing. Quantities are re-counted by hand. Procurement starts again from zero, on the telephone, at a price nobody can verify. Every handover loses money, time and truth — and the loss compounds through the life of the asset.
                </p>
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Genuine Stuffs removes the handovers.</span>
                </div>
              </div>

              {/* Transformation Slider Visual */}
              <div className="lg:col-span-6">
                <div className="p-3 rounded-3xl bg-white dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 shadow-xl">
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-950 group">
                    <Carousel className="w-full h-full" opts={{ loop: true }} plugins={[Autoplay({ delay: 5000 })]}>
                      <CarouselContent>
                        <CarouselItem>
                          <div className="relative w-full h-full">
                            <img src={paperTakeoffLoss} alt="Traditional Disconnected Construction Site" className="w-full h-full object-cover filter grayscale contrast-125 group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/60 flex items-end p-6">
                              <div className="text-white">
                                <span className="text-xs uppercase font-bold tracking-[0.1em] bg-primary px-2.5 py-1 rounded-lg text-white">The Old Way</span>
                                <h4 className="text-xl font-bold mt-2.5">Fragmented Handovers & Unverified Pricing</h4>
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                        <CarouselItem>
                          <div className="relative w-full h-full">
                            <img src={townAfter1} alt="Unified AI-Native Construction Site" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-6">
                              <div className="text-white">
                                <span className="text-xs uppercase font-bold tracking-[0.1em] bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-white">The Genuine OS Way</span>
                                <h4 className="text-xl font-bold mt-2.5">Unified AI Takeoffs & Verified NIS Marketplace</h4>
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                      </CarouselContent>
                    </Carousel>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: THE THREE INTEGRATED PILLARS (Brand Tokens & Rounded Radius)
         ========================================================================= */}
      <section className="py-24 bg-white dark:bg-[#181E26] border-b border-slate-200 dark:border-slate-800 relative transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                  <span>02 / Three Pillars</span>
                  <div className="h-[1px] w-12 bg-primary/30" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  One platform. <span className="text-primary">Three integrated engines.</span>
                </h2>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 max-w-md font-normal">
                We bridge the gap between conceptual design, material procurement, and project management into a single digital workflow.
              </p>
            </div>

            {/* Interactive Pillar Selector Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                {
                  id: 0,
                  num: "01",
                  title: "Innovation Studio",
                  tagline: "FOR ARCHITECTS & ENGINEERS",
                  desc: "Turn a concept into a costed, buildable bill of quantities — AI takeoff, structural estimates and visualisations in minutes.",
                  icon: Cpu,
                  features: ["AI Conceptual Visualisation", "Automated BoQ Takeoff", "Preliminary Structural Costing", "BIM / CAD Export Ready"],
                  link: "/pro/ai-studio",
                  cta: "Launch Studio"
                },
                {
                  id: 1,
                  num: "02",
                  title: "Procurement Marketplace",
                  tagline: "FOR BUILDERS & PROCUREMENT",
                  desc: "Order straight from the BoQ — verified suppliers, live factory-gate pricing and tracked logistics, no middleman markup.",
                  icon: Box,
                  features: ["Live Mill & Factory Pricing", "NIS-Certified Verification", "Zero Middleman Markups", "Tracked Site Logistics"],
                  link: "/marketplace",
                  cta: "Browse Marketplace"
                },
                {
                  id: 2,
                  num: "03",
                  title: "Professional Portal",
                  tagline: "FOR PROJECT TEAMS",
                  desc: "Run the build in one hub — verified experts, BIM/CAD management and execution tracking against the same data model.",
                  icon: Users,
                  features: ["Verified Expert Directory", "BIM / CAD Cloud Management", "Project Execution Tracking", "Escrow & Milestone Pay"],
                  link: "/pros",
                  cta: "Enter ProHub"
                }
              ].map((pillar) => (
                <div 
                  key={pillar.id}
                  className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all duration-300 cursor-pointer flex flex-col justify-between group bg-white dark:bg-[#2D3748]/50 hover:bg-[#F0F9FF] dark:hover:bg-[#2D3748] hover:ring-2 hover:ring-primary/20 shadow-md hover:shadow-2xl hover:scale-[1.02] hover:z-10 opacity-95 hover:opacity-100"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-2xl font-extrabold text-primary">{pillar.num}</span>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/30">
                        <pillar.icon className="w-6 h-6" />
                      </div>
                    </div>

                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 block mb-1">{pillar.tagline}</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">{pillar.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-6">{pillar.desc}</p>

                    <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-800 mb-6" />

                    <ul className="space-y-3 mb-8">
                      {pillar.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button asChild className="w-full h-12 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/20 hover:!bg-primary/90">
                    <Link to={pillar.link}>
                      <span>{pillar.cta}</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: INTERACTIVE BoQ TRANSLATOR ("One Prompt. One Bill. One Checkout")
         ========================================================================= */}
      <section id="boq-translator" className="py-24 bg-[#F0F9FF] dark:bg-[#181E26] border-b border-slate-200 dark:border-slate-800 relative transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.12em] mb-4">
                <Terminal className="w-3.5 h-3.5" />
                <span>03 / Live Translation Engine</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                One prompt. One bill. <span className="text-primary underline decoration-2 underline-offset-4">One checkout.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
                See how our AI engine translates conceptual building dimensions directly into verified NIS material orders ready for instant Paystack checkout.
              </p>
            </div>

            {/* Project Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
              {boqProjects.map((proj, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedBoqProject(idx as 0|1|2)}
                  className={cn(
                    "px-5 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all border",
                    selectedBoqProject === idx
                      ? "bg-primary text-white border-primary shadow-lg scale-105"
                      : "bg-white dark:bg-[#2D3748] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                  )}
                >
                  Project 0{idx+1}: {proj.title.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Brand Framed BoQ Simulator Table */}
            <div className="rounded-3xl bg-white dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              
              {/* Table Header Bar */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">{boqProjects[selectedBoqProject].title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{boqProjects[selectedBoqProject].specs}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 block">AI Takeoff Speed</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-end gap-1 mt-0.5">
                      <Zap className="w-3.5 h-3.5 text-primary fill-primary" />
                      {boqProjects[selectedBoqProject].timeToBoq}
                    </span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 block">Suppliers Matched</span>
                    <span className="text-sm font-extrabold text-primary mt-0.5 block">{boqProjects[selectedBoqProject].suppliersMatched} Verified NIS</span>
                  </div>
                </div>
              </div>

              {/* Takeoff Items - Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                      <th className="py-3.5 px-6">Material / Structural Item</th>
                      <th className="py-3.5 px-6">AI Quantified Qty</th>
                      <th className="py-3.5 px-6">Verified Unit Rate</th>
                      <th className="py-3.5 px-6">Subtotal Cost</th>
                      <th className="py-3.5 px-6 text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-normal text-sm">
                    {boqProjects[selectedBoqProject].items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span>{item.name}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">{item.qty}</td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">{item.unitPrice}</td>
                        <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">{item.total}</td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <Check className="w-3.5 h-3.5" />
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Takeoff Items - Mobile Stacked Cards View */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-700/60 border-t border-slate-200 dark:border-slate-700">
                {boqProjects[selectedBoqProject].items.map((item, i) => (
                  <div key={i} className="p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Check className="w-3 h-3" />
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-200/50 dark:border-slate-700/50 pt-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Qty & Rate</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{item.qty} × {item.unitPrice}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Subtotal</span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none mt-0.5">{item.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Footer Bar with Instant Checkout CTA */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs uppercase font-bold tracking-[0.1em] text-slate-500 dark:text-slate-400 block">Total Estimated Material Takeoff</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{boqProjects[selectedBoqProject].totalCost}</span>
                    <span className="text-xs text-primary font-bold uppercase">(Direct Mill & Factory Rates)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2 block">Representative project · rates as of Aug 2026</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" className="h-12 px-6 rounded-2xl text-xs font-bold border-slate-300 dark:border-slate-600 w-full sm:w-auto">
                    <Link to="/pro/ai-studio">Customize in AI Studio</Link>
                  </Button>
                  <Button asChild className="h-12 px-6 sm:px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wide sm:tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <Link to="/marketplace">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Order All — Paystack Checkout</span>
                      <span className="sm:hidden">Order All — Checkout</span>
                    </Link>
                  </Button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: THE CONSTRUCTION FLYWHEEL & PROOF (Merged A & B)
         ========================================================================= */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        {/* Infused Construction Site Background Image with Dimmed Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img src={heroConstruction} alt="Active Construction Flywheel Site" className="w-full h-full object-cover object-center opacity-75 filter contrast-125" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/45 to-slate-950" />
        </div>
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none z-0" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-primary/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-[0.12em] mb-4">
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>04 / The Flywheel & Proof</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Every project teaches <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-primary">the next one.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-300 font-normal">
                Genuine Stuffs creates a continuous feedback loop where real market prices and site execution outcomes compound into data-driven efficiency.
              </p>
            </div>

            {/* Interactive 3-Step Flywheel Diagram Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {flywheelSteps.map((step, idx) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setActiveFlywheelStep(idx)}
                  onClick={() => setActiveFlywheelStep(idx)}
                  className="p-8 rounded-3xl border border-transparent hover:border-slate-700/80 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[240px] bg-[#F4F9FF] hover:bg-slate-900/40 hover:backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] hover:z-10 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl font-extrabold text-slate-900 group-hover:text-white transition-colors">{step.num}</span>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold bg-primary/10 text-primary border border-primary/20 group-hover:bg-transparent group-hover:text-primary transition-all">
                        <step.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <h4 className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-white transition-colors">{step.title}</h4>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-4">{step.subtitle}</span>
                  </div>

                  <p className="text-sm text-slate-700 group-hover:text-slate-300 leading-relaxed transition-colors">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Proof Stats Band */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 mt-12 relative z-10 border-t border-slate-800/80 pt-16">
              {[
                { val: "₦2.1B+", label: "Value Quantified", desc: "Total value of building infrastructure processed across our studio." },
                { val: "12,400", label: "Material SKUs Priced", desc: "Verified materials available for instant procurement." },
                { val: "3", label: "Cities Live", desc: "Built and proven in Lagos, Abuja, and Port Harcourt — ready for Africa." }
              ].map((stat, idx) => (
                <div key={idx} className="p-8 rounded-3xl bg-blue-950/80 backdrop-blur-md border border-blue-800/50 shadow-xl shadow-blue-900/20 text-center hover:bg-blue-900/80 transition-colors duration-300">
                  <span className="text-5xl font-extrabold text-primary block mb-3">{stat.val}</span>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-tight mb-3">{stat.label}</h4>
                  <p className="text-xs text-slate-400 font-normal leading-relaxed">{stat.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center relative z-10 mt-6">
               <Link to="/methodology" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white group transition-colors">
                 <span>How we measure this</span>
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </Link>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: PROMOTED MARKETPLACE MATERIALS (Preserved Supabase Query)
         ========================================================================= */}
      <section className="py-20 bg-white dark:bg-[#181E26] border-b border-slate-200 dark:border-slate-800 relative transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                  <span>06 / Live Procurement Feed</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                  Verified NIS <span className="text-primary">Marketplace SKUs</span>
                </h2>
              </div>
              <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline uppercase tracking-tight">
                <span>Explore Full Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isPromotedLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="aspect-[4/5] w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700" />
                ))
              ) : promotedProducts.length > 0 ? (
                promotedProducts.map((prod) => (
                  <Card key={prod.id} className="group overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-all duration-300 rounded-3xl bg-white dark:bg-[#2D3748] shadow-sm hover:shadow-xl flex flex-col h-full">
                    {/* Image Section */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={prod.image_url || "/images/materials/cement.png"}
                        alt={prod.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-md z-10">
                        Verified NIS
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col p-5 flex-1 justify-between gap-4">
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white">₦{Number(prod.price).toLocaleString()}</span>
                          <span className="text-xs text-slate-400 font-bold uppercase">/{prod.unit}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{prod.name}</h3>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[120px]">{prod.vendor_name || 'Direct Factory'}</span>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl h-9 px-4 transition-colors shadow-sm"
                        >
                          <Link to="/marketplace">Order</Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-16 text-center text-slate-400 font-normal bg-white dark:bg-[#2D3748] rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  No promoted materials available at the moment. Explore the full marketplace inventory.
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 05: ARCHITECTED FOR TRUST (Trust Mechanics & Testimonial)
         ========================================================================= */}
      <section className="py-24 bg-[#F0F9FF] dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors">
        {/* Infused Trust Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img src={trustImage} alt="Enterprise Trust & Reliability" className="w-full h-full object-cover object-center opacity-75 filter contrast-125" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#F0F9FF]/45 to-[#F0F9FF] dark:from-slate-950 dark:via-slate-950/45 dark:to-slate-950" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary block mb-3">05 / Integrity by Default</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
                Architected for <span className="text-primary">uncompromising trust.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 text-left">
              {[
                { title: "Supplier Verification", desc: "Rigorous physical and legal screening before a single material listing goes live on our marketplace.", icon: ShieldCheck },
                { title: "NIS-Standard Compliance", desc: "Every SKU listed must meet or exceed Standard Organisation of Nigeria (SON/NIS) minimum engineering specs.", icon: ClipboardCheck },
                { title: "Price & Logistics Truth", desc: "Live factory gate pricing with real-time GPS-tracked site delivery. Zero opaque middleman telephone quotes.", icon: Truck }
              ].map((item, idx) => (
                <div key={idx} className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Seamless Platform Integrations Bar */}
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-around gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest shadow-sm mb-16">
              <span className="flex items-center gap-2 text-slate-900 dark:text-white"><Lock className="w-4 h-4 text-primary" /> Paystack Escrow Secured</span>
              <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Revit & IFC BIM Compatible</span>
              <span className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> AutoCAD Export Ready</span>
              <span className="flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> WhatsApp Site Notifications</span>
            </div>

            {/* David Okonkwo Featured Testimonial Banner */}
            <div className="p-8 sm:p-12 rounded-[2.5rem] bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl">
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-3xl relative z-10">
                <div className="flex items-center gap-1 text-primary mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Sparkles key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-xl sm:text-3xl font-bold leading-relaxed text-slate-900 dark:text-slate-100 mb-8">
                  “We quantified a 14-unit terrace and ordered the substructure the same afternoon. <span className="text-primary underline decoration-2 underline-offset-4">The exact prices and verified standards were right there.</span> Genuine Stuffs has completely transformed how we approach material selection and project execution.”
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-extrabold text-primary text-lg">
                    DO
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-base">David Okonkwo</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Project Manager · Premium Developments Ltd</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 06: THE MARKETPLACE (Static Promoted Feed + Ecosystem Grid)
         ========================================================================= */}
      <section className="py-20 bg-white dark:bg-[#181E26] border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                  <span>06 / LIVE PROCUREMENT FEED</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                  Verified NIS <span className="text-primary">Marketplace SKUs</span>
                </h2>
              </div>
              <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline uppercase tracking-tight">
                <span className="hidden sm:inline">Explore Full Marketplace</span>
                <span className="sm:hidden">Explore</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* The feed */}
            {!isPromotedLoading && promotedProducts.length === 0 ? (
              (() => {
                console.error("Promoted SKU feed returned 0 items. Expected at least 1 verified material. Collapsing feed gracefully.");
                return null;
              })()
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
                {isPromotedLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm animate-pulse">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                        <div className="w-16 h-5 rounded-full bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div>
                        <div className="w-24 h-6 rounded-md bg-slate-100 dark:bg-slate-800 mb-2" />
                        <div className="w-full h-4 rounded-md bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  ))
                ) : (
                  promotedProducts.map((prod, i) => {
                    const Icon = getCategoryIcon(prod.category);
                    return (
                      <div key={i} className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary transition-all duration-300">
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-2xl mb-6 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                              <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-md z-10">
                            Verified NIS
                          </div>
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">₦{Number(prod.price).toLocaleString()}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase">/{prod.unit}</span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{prod.name}</h3>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Category Grid (Lucide Icons) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3">
              {categories.map((cat, i) => {
                const isProOnly = cat.link?.startsWith('/pro/');
                const isVendorOnly = cat.link?.startsWith('/vendor-');
                
                const isAuthorized = () => {
                  if (isProOnly && !['professional', 'admin'].includes(role)) return false;
                  if (isVendorOnly && !['vendor', 'admin'].includes(role)) return false;
                  return true;
                };

                const authorized = isAuthorized();
                const primaryCategory = cat.dbCategory || cat.title;
                const destination = authorized ? (cat.link || `/marketplace?category=${encodeURIComponent(primaryCategory)}`) : '/login';

                const isAIStudio = cat.title === "AI Studio";
                const catCount = categoryCounts[cat.dbCategory || cat.title] || 0;
                
                return (
                  <Link
                    key={i}
                    to={destination}
                    state={!authorized ? { fromRestricted: true, message: `Access restricted. Please login or register as a ${isProOnly ? 'Professional' : 'Vendor'} to access ${cat.title}.` } : undefined}
                    className="group flex flex-col items-center justify-start text-center p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-white transition-all hover:-translate-y-1 hover:shadow-md relative"
                  >
                    {catCount > 0 && !isAIStudio && (
                      <span className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm z-10">
                        {catCount}
                      </span>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-colors ${isAIStudio ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} group-hover:bg-primary/10 group-hover:text-primary`}>
                      <cat.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-primary transition-colors">
                      {cat.title}
                    </span>
                  </Link>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 07: LUXURY AI-NATIVE CTA & TECH DISPLAY (Brand Aligned)
         ========================================================================= */}
      <section className="py-24 bg-[#F0F9FF] dark:bg-[#181E26] border-t border-slate-200 dark:border-slate-800 transition-colors relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto relative">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* Left Column: Agreeable, High-Impact CTA Text */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-[0.12em]">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>07 / Ready for Deployment</span>
                </div>
                
                <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                  Ready to transform <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary">how you build?</span>
                </h2>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-lg">
                  Join leading developers, engineers, and architects across Africa moving from conceptual sketches to verified NIS procurement in minutes, not weeks.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <Button asChild size="lg" className="h-14 px-8 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 hover:scale-105 transition-all flex items-center justify-center gap-3">
                    <Link to="/register">
                      <Rocket className="w-5 h-5 fill-white" />
                      <span>Create Free Account</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-2xl bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white dark:hover:text-slate-950 transition-all flex items-center justify-center gap-3 shadow-sm">
                    <Link to="/contact">Talk to the Team</Link>
                  </Button>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Instant AI Studio</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Zero Setup Fee</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Verified NIS Quality</span>
                </div>
              </div>

              {/* Right Column: Innovative AI Technology Display & Infused Imagery */}
              <div className="lg:col-span-6 mt-8 lg:mt-0">
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden relative aspect-auto sm:aspect-[16/11] min-h-[320px] flex flex-col justify-between p-6 group">
                  
                  {/* Infused Cityscape Background with Dimmed Overlay */}
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={heroCityscape} alt="Future Infrastructure Development" className="w-full h-full object-cover object-center opacity-60 group-hover:scale-105 transition-transform duration-700 filter contrast-125" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
                  </div>

                  {/* Top Status Header of Tech Display */}
                  <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800/80 text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="uppercase tracking-wider">AI-Native Pipeline Console</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase font-extrabold tracking-widest">
                      Live Telemetry
                    </span>
                  </div>

                  {/* Center Interactive Tech Telemetry Simulation */}
                  <div className="relative z-10 my-auto space-y-3 py-4">
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          01
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-white block">Structural Concept & Takeoff</span>
                          <span className="text-[10px] text-slate-400 font-medium">Auto-quantifying 14-Unit Terrace...</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-primary flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-primary" /> 0.04s
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          02
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-white block">NIS Supplier Verification</span>
                          <span className="text-[10px] text-slate-400 font-medium">Matching direct mill factory rates...</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white whitespace-nowrap shrink-0">
                        100% Verified
                      </span>
                    </div>
                  </div>

                  {/* Bottom Console Status Bar */}
                  <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-primary" /> Paystack Escrow Ready
                    </span>
                    <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
                      <span>Launch ProHub</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
