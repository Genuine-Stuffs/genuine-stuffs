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
  Users
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-construction.jpg";
import materialsImage from "@/assets/materials-quality.jpg";

const Index = () => {
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
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight">
            Building Industry <span className="text-primary">Transformation</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-medium">
            Bridging High-End Technical Innovation with the Global Building Materials Marketplace.
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
            <Link to="/register/vendor" className="flex items-center text-primary hover:underline">
              <Truck className="w-4 h-4 mr-2" /> How to Sell
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link to="/marketplace" className="flex items-center text-primary hover:underline">
              <HardHat className="w-4 h-4 mr-2" /> How to Buy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link to="/pro-portal" className="flex items-center text-primary hover:underline">
              <PencilRuler className="w-4 h-4 mr-2" /> Join as Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Category Grid Section - Jiji Inspired */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="w-2 h-8 bg-primary mr-3 rounded-full"></span>
            Browse by Innovation & Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((cat, index) => (
              <Link key={index} to={cat.link || "/marketplace"} className="group">
                <Card className="aspect-square border-none shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1 bg-white">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center">
                    <div className={`p-4 rounded-2xl mb-3 transition-colors ${cat.color} group-hover:bg-primary group-hover:text-white`}>
                      <cat.icon className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-bold leading-tight line-clamp-2">{cat.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
                src={materialsImage}
                alt="High-quality building materials"
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
