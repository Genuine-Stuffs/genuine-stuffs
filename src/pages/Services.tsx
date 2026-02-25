import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, FileCheck, TrendingUp, GraduationCap, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Services = () => {
  const services = [
    {
      icon: FileCheck,
      title: "Material & Supplier Verification",
      description: "Screening and profiling building materials suppliers to ensure compliance with quality standards and project requirements.",
      features: [
        "Supplier background checks & profiling",
        "Material quality standard verification",
        "Price authenticity auditing",
        "Inventory reliability assessment",
      ],
      whyItMatters: "Verification is the first line of defense against substandard materials and fragmented supply chains that cause 90% of budget overruns.",
    },
    {
      icon: TrendingUp,
      title: "Construction & Property Advisory",
      description: "Over two decades of site-level experience protecting property value through strategic material selection and cost efficiency.",
      features: [
        "Architectural & structural review",
        "Cost-efficiency & value modeling",
        "Asset durability forecasting",
        "Procurement strategy development",
      ],
      whyItMatters: "Our practical foundation ensures you don't just build, but build right, maximizing long-term asset value.",
    },
    {
      icon: AlertCircle,
      title: "Compliance & Value Assurance",
      description: "Safeguarding your investment through rigorous regulatory awareness and quality-focused construction enablement.",
      features: [
        "Regulatory compliance awareness",
        "Verification of professionals & artisans",
        "Structural integrity oversight",
        "Quality-focused project coordination",
      ],
      whyItMatters: "Value assurance prevents structural failures and legal disputes, protecting your investment for generations.",
    },
    {
      icon: GraduationCap,
      title: "Training & Knowledge Hub",
      description: "Empowering new industry entrants and property owners through structured knowledge, training, and guidance.",
      features: [
        "Artisan skills training & screening",
        "Material selection workshops",
        "Regulatory & standards education",
        "Best practices for project owners",
      ],
      whyItMatters: "Knowledge reduces risk. Empowered stakeholders make informed decisions that eliminate costly construction errors.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 bg-slate-900 dark:bg-black text-white relative overflow-hidden transition-colors duration-300">
        <div className="absolute bottom-0 left-0 p-40 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
            Value-Focused <span className="text-primary italic">Construction</span> Guidance
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed">
            Enabling informed decision-making and protecting long-term property value through trust, verification, and knowledge.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-16">
            {services.map((service, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors overflow-hidden rounded-3xl">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Icon & Title */}
                    <div className="lg:col-span-1">
                      <service.icon className="w-16 h-16 text-primary mb-6" />
                      <h2 className="text-2xl md:text-3xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">{service.title}</h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{service.description}</p>
                    </div>

                    {/* Middle Column - Features */}
                    <div className="lg:col-span-1">
                      <h3 className="text-lg font-black mb-6 text-slate-900 dark:text-white uppercase tracking-widest text-xs">What's Included:</h3>
                      <ul className="space-y-4">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right Column - Why It Matters */}
                    <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                      <h3 className="text-lg font-black mb-4 flex items-center text-slate-900 dark:text-white uppercase tracking-tighter">
                        <AlertCircle className="w-5 h-5 mr-2 text-primary" />
                        Why It Matters
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{service.whyItMatters}"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">
              The Cost of Poor Material Choices
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              Data-driven insights on why material quality cannot be compromised.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">40%</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Higher maintenance costs with sub-standard materials</p>
            </div>
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">3-5x</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Average cost multiplier for fixing material failures</p>
            </div>
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">35%</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Reduction in delays with proper material audits</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary text-primary-foreground rounded-[2rem] p-12 text-center shadow-2xl shadow-primary/20">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              Build Right, Build Secure.
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90 font-medium">
              Schedule a consultation to discover how our verified ecosystem can optimize your project outcomes.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg font-black h-14 px-10 rounded-xl">
              <Link to="/contact">Schedule Free Consultation</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
