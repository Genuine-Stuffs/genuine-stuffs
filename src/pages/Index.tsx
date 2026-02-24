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
  LayoutDashboard
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import heroImage from "@/assets/hero-construction.jpg";
import materialsImage from "@/assets/materials-quality.jpg";

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
    { title: "Roofing & Ceiling", icon: Hammer, color: "bg-green-500/10 text-green-600" },
    { title: "Electrical & Plumbing", icon: Wrench, color: "bg-purple-500/10 text-purple-600" },
    { title: "Finishing & Tiles", icon: Layers, color: "bg-pink-500/10 text-pink-600" },
    { title: "Architecture / AI Studio", icon: Cpu, color: "bg-cyan-500/10 text-cyan-600", link: "/pro/ai-studio" },
    { title: "Hire Professionals", icon: Users, color: "bg-indigo-500/10 text-indigo-600" },
    { title: "Tools & Equipment", icon: Hammer, color: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Navbar />

      {/* Hero Section - Search First & Industry Transformation */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Industry Transformation"
            className="w-full h-full object-cover opacity-20 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-slate-50/50" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-[1.1]">
            Welcome To A <span className="text-primary italic">Trust-Driven Construction Ecosystem</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-medium max-w-3xl mx-auto">
            Restoring confidence, quality, and long-term value in the built environment through verification and expert guidance.
          </p>

          {/* Search Box - Jiji Inspired */}
          <div className="relative max-w-2xl mx-auto mb-12 shadow-2xl rounded-2xl overflow-hidden group">
            <div className="flex bg-white p-2">
              <div className="flex-1 flex items-center px-4">
                <Search className="w-6 h-6 text-muted-foreground mr-3" />
                <input
                  type="text"
                  placeholder="What are you looking for? (e.g. Structural Steel, BIM Models, Cement...)"
                  className="w-full h-12 bg-transparent border-none focus:outline-none text-lg"
                />
              </div>
              <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-xl">
                SEARCH
              </Button>
            </div>
          </div>

          {/* Quick Stats/Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold uppercase tracking-wider">
            {role === 'vendor' ? (
              <Link to="/vendor-dashboard" className="flex items-center text-primary hover:underline">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Vendor Dashboard
              </Link>
            ) : (
              <Link to="/register/vendor" className="flex items-center text-primary hover:underline">
                <Truck className="w-4 h-4 mr-2" /> How to Sell
              </Link>
            )}
            <span className="text-muted-foreground">|</span>
            <Link to="/marketplace" className="flex items-center text-primary hover:underline">
              <HardHat className="w-4 h-4 mr-2" /> How to Buy
            </Link>
            <span className="text-muted-foreground">|</span>
            {role === 'pro' ? (
              <Link to="/pro-portal" className="flex items-center text-primary hover:underline">
                <PencilRuler className="w-4 h-4 mr-2" /> Pro Dashboard
              </Link>
            ) : (
              <Link to="/register/pro" className="flex items-center text-primary hover:underline">
                <Shield className="w-4 h-4 mr-2" /> Verified Professionals
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Browse By Innovation & Category - Restored */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h2 className="text-2xl font-black text-slate-900">Browse by Innovation & Category</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((cat, i) => (
              <Link
                key={i}
                to={cat.link || `/marketplace?category=${encodeURIComponent(cat.title)}`}
                className="group flex flex-col items-center p-6 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${cat.color} group-hover:scale-110 transition-transform shadow-sm`}>
                  <cat.icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black text-center text-slate-700 leading-tight group-hover:text-primary uppercase tracking-tighter">{cat.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Values / Why We Exist - New Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block p-2 bg-primary/10 rounded-lg text-primary text-xs font-black uppercase tracking-widest mb-6">Our Purpose</div>
              <h2 className="text-4xl font-black mb-8 leading-tight">Solving Fragmented <span className="text-primary italic">Supply Chains</span></h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                The construction industry suffers from unverified professionals, substandard materials, and limited practical guidance—resulting in project failures and cost overruns.
              </p>
              <div className="space-y-4">
                {[
                  "Verification: Strict screening for suppliers & artisans",
                  "Quality: Restoring confidence in material standards",
                  "Advisory: Over 20 years of real-world site experience",
                  "Transparency: Data-driven material selection"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-bold text-slate-800">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-3xl overflow-hidden shadow-2xl relative aspect-square lg:aspect-video">
              <img src="/images/materials/steel.png" alt="Verified construction materials on site" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-white text-xl font-bold italic">"We exist to ensure users do not just build, but build right."</p>
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
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <benefit.icon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How We Work</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A proven 3-step process to optimize your material selection and project outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground text-3xl font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section - LinkedIn Style */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Our <span className="text-primary italic">Specialties</span></h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Focused on restoring confidence and protecting long-term property value.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              "Verified Building Materials Marketplace",
              "Construction Professionals & Artisans Directory",
              "Supplier & Professional Verification",
              "Construction & Property Advisory Services",
              "Property Development & Value Assurance",
              "Training & Knowledge Hub",
              "Quality-Focused Construction Enablement"
            ].map((specialty, i) => (
              <div key={i} className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary hover:shadow-md transition-all group">
                <div className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-all" />
                <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">{specialty}</span>
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
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img
                src="/images/materials/cement.png"
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
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Make Smarter Material Decisions?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Book your free 30-minute materials review and discover how quality material choices can transform your project.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg">
            <Link to="/contact">Schedule Your Free Consultation</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
