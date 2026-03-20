import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ShieldCheck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import cityscape from "@/assets/hero/cityscape.png";
import construction from "@/assets/hero/construction.png";
import highrise from "@/assets/hero/highrise.png";
import trustImage from "@/assets/thematic/trust.png";
import valueImage from "@/assets/thematic/value.png";

const Index = () => {
  const { role } = useAuth();
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
    { title: "Cement & Aggregates", icon: Construction, color: "bg-blue-500/10 text-blue-600" },
    { title: "Steel & Rebars", icon: Layers, color: "bg-orange-500/10 text-orange-600" },
    { title: "Roofing & Ceiling", icon: Layers, color: "bg-green-500/10 text-green-600" },
    { title: "Electrical & Plumbing", icon: Wrench, color: "bg-purple-500/10 text-purple-600" },
    { title: "Finishing & Tiles", icon: Construction, color: "bg-pink-500/10 text-pink-600" },
    { title: "Building / AI Studio", icon: Cpu, color: "bg-cyan-500/10 text-cyan-600", link: "/pro/ai-studio" },
    { title: "Hire Professionals/Artisans", icon: Users, color: "bg-indigo-500/10 text-indigo-600" },
    { title: "Tools & Equipment", icon: HardHat, color: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-300 pb-24 md:pb-0">
      <Navbar />

      {/* Panoramic Hero Carousel */}
      <section className="relative w-full overflow-hidden bg-slate-900">
        <Carousel className="w-full" opts={{ loop: true }}>
          <CarouselContent>
            {[cityscape, construction, highrise].map((img, i) => (
              <CarouselItem key={i} className="relative h-[60vh] md:h-[80vh] pl-0">
                <img src={img} alt={`Hero ${i + 1}`} className="w-full h-full object-cover" />
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
                  <Link to="/pros">HIRE EXPERTS</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 z-30">
            <CarouselPrevious className="relative left-0 translate-y-0 h-12 w-12 bg-white/20 hover:bg-white/40 border-none text-white transition-all backdrop-blur-md" />
            <CarouselNext className="relative right-0 translate-y-0 h-12 w-12 bg-white/20 hover:bg-white/40 border-none text-white transition-all backdrop-blur-md" />
          </div>
        </Carousel>
      </section>

      {/* Browse By Category - Prominent & Card Style */}
      <section className="py-12 bg-white dark:bg-background border-b border-slate-100 dark:border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Shop By Category</h2>
            </div>
            <Link to="/marketplace" className="text-sm font-black text-primary hover:underline uppercase tracking-tighter">View All Market</Link>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
            {categories.map((cat, i) => (
              <Link
                key={i}
                to={cat.link || `/marketplace?category=${encodeURIComponent(cat.title)}`}
                className="group flex flex-col items-center p-3 md:p-6 rounded-3xl border border-slate-100 dark:border-border bg-slate-50/50 dark:bg-card md:hover:bg-white dark:md:hover:bg-muted/50 md:hover:border-primary md:hover:shadow-lg md:hover:shadow-primary/5 transition-all duration-500 backdrop-blur-sm relative overflow-hidden"
              >
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-2 md:mb-4 ${cat.color} md:group-hover:scale-105 transition-transform shadow-none md:shadow-sm md:group-hover:shadow-md`}>
                  <cat.icon className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black text-center text-slate-700 dark:text-slate-300 leading-tight md:group-hover:text-primary uppercase tracking-tighter transition-colors">{cat.title}</span>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 md:group-hover:bg-primary/10 transition-colors hidden md:block" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending / Promoted Materials Section - NEW */}
      <section className="py-16 bg-slate-50 dark:bg-background transition-colors">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-orange-500 rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Promoted Materials</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: "Standard Cement", price: "₦5,200", img: "/images/materials/cement.png", vendor: "Dangote Dist." },
              { title: "Mild Steel Rebars", price: "₦850,000/ton", img: "/images/materials/steel.png", vendor: "TMT Global" },
              { title: "Granite (Hard Rock)", price: "₦180,000", img: "/images/materials/granite.png", vendor: "Quarry Direct" },
              { title: "Sharp Sand", price: "₦45,000", img: "/images/materials/sand.png", vendor: "Dredge Masters" }
            ].map((prod, i) => (
              <Card key={i} className="group overflow-hidden border-none shadow-none md:shadow-sm md:hover:shadow-lg transition-all bg-white dark:bg-card rounded-2xl">
                <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img src={prod.img} alt={prod.title} className="w-full h-full object-cover md:group-hover:scale-[1.05] transition-transform duration-500" />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest">PROMOTED</div>
                </div>
                <CardContent className="p-4">
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{prod.vendor}</div>
                  <h3 className="font-black text-slate-900 dark:text-white leading-tight mb-2 md:group-hover:text-primary transition-colors">{prod.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{prod.price}</span>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black dark:border-border dark:hover:bg-muted">DETAILS</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Purpose / Why We Exist - Dark Mode Enhanced */}
      <section className="py-24 bg-white dark:bg-background border-y border-slate-100 dark:border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block p-2 bg-primary/10 rounded-lg text-primary text-xs font-black uppercase tracking-widest mb-6">Our Core Focus</div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight text-slate-900 dark:text-white">Restoring <span className="text-primary italic">Trust</span> to the Site</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                We believe that every successful project starts with quality inputs. Our ecosystem bridges the gap between major suppliers and end-users.
              </p>
              <div className="space-y-4">
                {[
                  { label: "Verification", desc: "Rigorous screening for all listed suppliers." },
                  { label: "Quality Control", desc: "Materials must meet minimum NIS standards." },
                  { label: "Expert Advisory", desc: "Site management guidance from seasoned pros." },
                  { label: "Price Transparency", desc: "Eliminating the 'middle-man' markup." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-100 dark:border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.label}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-3xl overflow-hidden md:shadow-xl relative aspect-square lg:aspect-video border-8 border-white dark:border-card">
              <img src={trustImage} alt="Verified construction materials on site" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-white text-xl md:text-2xl font-black italic tracking-tight leading-tight">"Efficiency is not just speed; it is building with the right materials the first time."</p>
              </div>
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
      <section className="py-20 bg-white dark:bg-background z-0 relative">
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
      <section className="py-24 bg-slate-50 dark:bg-black transition-colors">
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

      {/* Material Quality Visual */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Quality Materials = Long-Term Value
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Research shows that buildings using sub-standard materials can incur up to 40% higher maintenance costs over 20 years. Poor material choices lead to:
              </p>
              <ul className="space-y-4">
                {[
                  "Premature structural degradation",
                  "Increased repair and replacement frequency",
                  "Lower property valuations",
                  "Compliance failures and legal risks",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="w-6 h-6 text-primary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg overflow-hidden md:shadow-md aspect-video">
              <img
                src={valueImage}
                alt="High-quality building materials on a construction site"
                className="w-full h-full object-cover"
              />
            </div>
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
