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
  Loader2
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

import townBefore1 from "@/assets/hero/town_before_1.png";
import townAfter1 from "@/assets/hero/town_after_1.png";
import townBefore2 from "@/assets/hero/town_before_2.png";
import townAfter2 from "@/assets/hero/town_after_2.png";
import trustImage from "@/assets/thematic/trust.png";
import valueImage from "@/assets/thematic/value.png";

const Index = () => {
  const { role } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  
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

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);
  const benefits = [
    {
      icon: TrendingDown,
      title: "Reduce Maintenance Costs",
      description: "Quality materials can reduce long-term maintenance expenses by up to 40% over the building's lifespan.",
    },
    {
      icon: Shield,
      title: "Minimize Risk of Failure",
      description: "Avoid premature structural failures and costly repairs with proper material selection and compliance.",
    },
    {
      icon: ClipboardCheck,
      title: "Certify Materials for Compliance",
      description: "Ensure all materials meet industry standards, building codes, and local regulations.",
    },
    {
      icon: TrendingUp,
      title: "Maximize Asset Value",
      description: "Increase property value and resale potential through superior material quality and documented durability.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Assess",
      description: "We evaluate your project scope, material budget, and performance requirements.",
    },
    {
      number: "02",
      title: "Educate",
      description: "We present data-driven insights and recommend optimal materials for your specific needs.",
    },
    {
      number: "03",
      title: "Support",
      description: "We guide implementation and provide lifecycle tracking to ensure long-term success.",
    },
  ];

  const testimonials = [
    {
      quote: "Genuine Stuffs' material guidance and marketplace advisory saved us 35% on maintenance costs over 5 years. Their expertise transformed how we approach material selection and supplier verification.",
      author: "David Okonkwo",
      role: "Project Manager, Premium Developments",
    },
    {
      quote: "The lifecycle performance modeling and consultancy helped us justify the investment in quality materials to stakeholders. The ROI has been exceptional.",
      author: "Amina Bello",
      role: "Construction Director, Metro Builders Ltd",
    },
  ];

  const categories = [
    { title: "Hire Professionals", img: "/images/cats/professionals.png", link: "/pros", blend: true },
    { title: "Hire Artisans", img: "/images/cats/artisans.png", link: "/pros", blend: true },
    { title: "Equipment", img: "/images/cats/equipment.png", scale: "scale-100", blend: true },
    { title: "Sand", img: "/images/cats/sand.png", scale: "scale-100", blend: false },
    { title: "Stones", img: "/images/cats/stones.png", scale: "scale-100", blend: false },
    { title: "Cement", img: "/images/cats/cement.png", scale: "scale-[1.6]", blend: true },
    { title: "Site Water", img: "/images/cats/water.png", scale: "scale-[1.6]", blend: true },
    { title: "Steel & Rebars", img: "/images/cats/steel.png", scale: "scale-[1.3]", blend: true },
    { title: "Roofing & Ceiling", img: "/images/cats/roofing.png", scale: "scale-[1.3]", blend: true },
    { title: "Electricals", img: "/images/cats/electricals.png", scale: "scale-[1.35]", blend: true },
    { title: "Plumbing", img: "/images/cats/plumbing.png", scale: "scale-[1.35]", blend: true },
    { title: "Finishing & Tiles", img: "/images/cats/finishing.png", scale: "scale-100", blend: false },
    { title: "Bricks", img: "/images/cats/bricks.png", scale: "scale-[1.5]", blend: true },
    { title: "Blocks", img: "/images/cats/blocks.png", scale: "scale-[1.5]", blend: true },
    { title: "Logistics", img: "/images/cats/logistics.png", scale: "scale-100", blend: true },
    { title: "Tools", img: "/images/cats/tools.png", scale: "scale-[1.3]", blend: true },
    { title: "Building AI Studio", img: "/images/cats/ai.png", link: "/pro/ai-studio", scale: "scale-[1.2]", blend: true },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 pb-24 md:pb-0">
      <Navbar />

      {/* Panoramic Hero Carousel */}
      <section className="relative w-full overflow-hidden bg-slate-900 border-b border-sky-100 dark:border-border">
        <Carousel 
          className="w-full" 
          opts={{ loop: true }}
          setApi={setApi}
          plugins={[
            Autoplay({
              delay: 12000,
            }),
          ]}
        >
          <CarouselContent>
            {[
              { src: townBefore1, label: "Before: Lack of Infrastructure" },
              { src: townAfter1, label: "After: Professional Development" },
              { src: townBefore2, label: "Before: Poorly Built Structures" },
              { src: townAfter2, label: "After: Premium Quality Living" }
            ].map((img, i) => (
              <CarouselItem key={i} className="relative h-[60vh] md:h-[80vh] pl-0">
                <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Overlay Text */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-6">
                <Rocket className="w-3 h-3 text-primary-foreground" />
                Your Construction Operating Systems
              </div>
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl">
                Find <span className="text-primary italic">Genuine</span> Building Materials
              </h1>
              <p className="text-sm md:text-xl font-bold text-slate-100 uppercase tracking-[0.3em] mb-8 drop-shadow-lg">
                Digital Marketplace Access & Verified Professionals/Artisans
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg" className="h-14 md:h-16 px-10 md:px-14 text-lg font-black rounded-2xl shadow-md md:shadow-lg md:hover:scale-[1.03] transition-transform">
                  <Link to="/marketplace">EXPLORE MARKET</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 md:h-16 px-10 md:px-14 text-lg font-black rounded-2xl bg-white/10 backdrop-blur-md border-white text-white md:hover:bg-white md:hover:text-primary transition-all">
                  <Link to={role === 'professional' ? "/pros" : "/hire-experts"}>
                    {role === 'professional' ? "ProHuB" : "HIRE EXPERTS"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  current === i 
                    ? "bg-white w-8" 
                    : "bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </section>

      {/* Browse By Category - Prominent & Card Style */}
      <section className="py-12 bg-background border-b border-sky-100 dark:border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Shop By Category</h2>
            </div>
            <Link to="/marketplace" className="text-sm font-black text-primary hover:underline uppercase tracking-tighter">View All Market</Link>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
            {categories.map((cat, i) => {
              const isProOnly = cat.link?.startsWith('/pro/');
              const isVendorOnly = cat.link?.startsWith('/vendor-');
              
              const isAuthorized = () => {
                if (isProOnly && !['professional', 'admin'].includes(role)) return false;
                if (isVendorOnly && !['vendor', 'admin'].includes(role)) return false;
                return true;
              };

              const authorized = isAuthorized();
              const destination = authorized ? (cat.link || `/marketplace?category=${encodeURIComponent(cat.title)}`) : '/login';

              return (
              <Link
                key={i}
                to={destination}
                state={!authorized ? { fromRestricted: true, message: `Access restricted. Please login or register as a ${isProOnly ? 'Professional' : 'Vendor'} to access ${cat.title}.` } : undefined}
                className="group flex flex-col items-center justify-start text-center cursor-pointer transition-transform md:hover:scale-105"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] flex items-center justify-center mb-2 md:mb-3 shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden bg-slate-900 relative">
                  <img 
                    src={cat.img} 
                    alt={cat.title} 
                    className={`w-full h-full object-cover transition-transform duration-300 ${cat.blend !== false ? 'mix-blend-screen' : ''} ${cat.scale || 'scale-[1.1]'}`} 
                  />
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-300 leading-tight md:group-hover:text-primary transition-colors max-w-[80px] md:max-w-full">
                  {cat.title}
                </span>
              </Link>
            )})}
          </div>
        </div>
      </section>

      {/* Trending / Promoted Materials Section - NEW */}
      <section className="py-16 bg-sky-100/50 dark:bg-background transition-colors">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-orange-500 rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Promoted Materials</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {isPromotedLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="aspect-[4/3] w-full animate-pulse bg-slate-200 dark:bg-muted/20 rounded-2xl" />
              ))
            ) : promotedProducts.length > 0 ? (
              promotedProducts.map((prod, i) => (
                <Card key={prod.id} className="group overflow-hidden border border-slate-100 dark:border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl bg-white dark:bg-card shadow-sm flex flex-col h-full">
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <img
                      src={prod.image_url || "/images/materials/cement.png"}
                      alt={prod.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-orange-500 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-md z-10">
                      PROMOTED
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex flex-col p-3 md:p-4 flex-1 min-w-0 gap-1">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm md:text-lg font-black text-primary">₦{Number(prod.price).toLocaleString()}</span>
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tight">/{prod.unit}</span>
                      </div>
                      <h3 className="font-bold text-[11px] md:text-sm text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">{prod.name}</h3>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-col space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[9px] md:text-xs text-slate-500 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{prod.vendor_name || 'Verified Vendor'}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full text-slate-300 hover:text-primary hover:bg-primary/5 transition-all duration-300"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      className="mt-3 w-full bg-slate-50 dark:bg-muted/30 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 font-black h-8 md:h-9 rounded-xl transition-all text-[9px] uppercase tracking-[0.1em]"
                      asChild
                    >
                      <Link to="/marketplace">Details</Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 italic font-medium">
                No promoted materials available at the moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Brand Purpose / Why We Exist - Integrated Overlay */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden border-y border-slate-100 dark:border-border lg:py-0 py-16">
        {/* Full-bleed Image Background with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={trustImage} 
            alt="Verified construction materials on site" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl text-white">
            <div className="inline-block p-2 bg-primary/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black uppercase tracking-widest mb-6 border border-white/10">Our Core Focus</div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] italic">Restoring <span className="text-primary">Trust</span> to the Site</h2>
            <p className="text-lg md:text-xl text-slate-100 mb-10 leading-relaxed font-bold drop-shadow-md max-w-xl">
              We believe that every successful project starts with quality inputs. Our ecosystem bridges the gap between major suppliers and end-users.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Verification", desc: "Rigorous screening for all listed suppliers." },
                { label: "Quality Control", desc: "Materials must meet minimum NIS standards." },
                { label: "Expert Advisory", desc: "Site management guidance from seasoned pros." },
                { label: "Price Transparency", desc: "Eliminating the 'middle-man' markup." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-black/20 backdrop-blur-[2px] border border-white/10">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-black text-white uppercase tracking-tighter drop-shadow-sm text-xs">{item.label}</h4>
                    <p className="text-[10px] text-slate-300 font-bold leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Material Quality Matters</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The right materials don't just build structures—they build value, longevity, and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="group border-2 border-slate-100 dark:border-border bg-white dark:bg-card md:hover:border-primary transition-all duration-500 overflow-hidden relative shadow-none md:shadow-sm md:hover:shadow-lg md:hover:shadow-primary/5 rounded-3xl">
                <CardContent className="pt-8 pb-8 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 md:group-hover:scale-[1.05] transition-transform">
                    <benefit.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white uppercase tracking-tight">{benefit.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{benefit.description}</p>
                </CardContent>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mb-16 -mr-16 md:group-hover:bg-primary/20 transition-colors hidden md:block" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-20 bg-background z-0 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How We Work</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A proven 3-step process to optimize your material selection and project outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative z-0">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground text-3xl font-bold mb-4 shadow-sm">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-[39px] left-[calc(50%+52px)] w-[calc(100%+2rem-104px)] h-[2px] bg-slate-200 dark:bg-slate-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section - Dark Mode Enhanced */}
      <section className="py-24 bg-sky-100/50 dark:bg-black transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 px-4">
            <div className="inline-block p-2 bg-primary/10 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest mb-6">Capabilities</div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">Our <span className="text-primary italic">Specialties</span></h2>
            <p className="text-base md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Protecting the value of your built assets through expert verification.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto px-4">
            {[
              "Verified Marketplace",
              "Artisan Directory",
              "Supplier Verification",
              "Property Advisory",
              "Value Assurance",
              "Knowledge Hub",
              "Quality Enablement"
            ].map((specialty, i) => (
              <div key={i} className="flex items-center gap-4 bg-white dark:bg-card p-5 md:p-6 rounded-2xl shadow-none md:shadow-sm border border-slate-100 dark:border-border md:hover:border-primary md:hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary md:group-hover:bg-primary md:group-hover:text-white transition-all">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-black text-slate-800 dark:text-slate-200 md:group-hover:text-primary transition-colors uppercase tracking-widest text-[11px] md:text-xs">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Material Quality Visual - Integrated Overlay */}
      <section className="relative min-h-[480px] flex items-center overflow-hidden border-y border-slate-200 dark:border-slate-800 lg:py-0 py-16">
        {/* Full-bleed Image Background with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={valueImage}
            alt="High-quality building materials on a construction site"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl text-white">
            <h2 className="text-3xl md:text-6xl font-black mb-8 leading-tight text-white uppercase tracking-tight italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              Quality <span className="text-primary">Materials</span> = Long-Term Value
            </h2>
            <p className="text-lg md:text-xl text-slate-100 mb-10 leading-relaxed font-bold drop-shadow-md max-w-xl">
              Research shows that buildings using sub-standard materials can incur up to 40% higher maintenance costs over 20 years. Poor material choices lead to:
            </p>
            <ul className="space-y-6">
              {[
                "Premature structural degradation",
                "Increased repair and replacement frequency",
                "Lower property valuations",
                "Compliance failures and legal risks",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-lg md:text-xl text-white font-bold drop-shadow-md">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real results from builders and project managers who trust our expertise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                  <div className="border-t dark:border-border pt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Compact & Punchy */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tight">
            Build with <span className="italic underline decoration-4">Certainty</span>
          </h2>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90 font-medium">
            Join the ecosystem of verified materials and professional construction management today.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="text-base font-black px-10 h-14 rounded-2xl w-full md:w-auto">
              <Link to="/marketplace">EXPLORE MARKET</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary text-base font-black px-10 h-14 rounded-2xl w-full md:w-auto">
              <Link to="/register">JOIN PLATFORM</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
