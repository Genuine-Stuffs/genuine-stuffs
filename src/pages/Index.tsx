import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, TrendingDown, Shield, TrendingUp, ClipboardCheck } from "lucide-react";
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
      quote: "BuildMaster's material guidance saved us 35% on maintenance costs over 5 years. Their expertise transformed how we approach material selection.",
      author: "David Okonkwo",
      role: "Project Manager, Premium Developments",
    },
    {
      quote: "The lifecycle performance modeling helped us justify the investment in quality materials to stakeholders. The ROI has been exceptional.",
      author: "Amina Bello",
      role: "Construction Director, Metro Builders Ltd",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Professional construction site"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Build Smarter. Build Longer. Choose the Right Materials.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              We help you understand the material decisions that determine your project's success and lifespan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg">
                <Link to="/contact">Schedule Free Consultation</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg">
                <Link to="/resources">Download Materials Checklist</Link>
              </Button>
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
