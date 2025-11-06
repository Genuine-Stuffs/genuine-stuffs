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
      title: "Pre-Construction Materials Audit",
      description: "Comprehensive assessment of material specifications, sourcing strategies, and budget optimization before construction begins.",
      features: [
        "Review of architectural and structural specifications",
        "Material sourcing evaluation and vendor assessment",
        "Budget analysis and cost-benefit comparisons",
        "Climate and site-specific material recommendations",
      ],
      whyItMatters: "Projects that undergo pre-construction material audits experience 25-35% fewer material-related delays and cost overruns during construction.",
    },
    {
      icon: TrendingUp,
      title: "Lifecycle Performance Modeling",
      description: "Data-driven forecasting of how different material choices will perform, age, and affect maintenance requirements over time.",
      features: [
        "20+ year performance projections",
        "Maintenance schedule and cost forecasting",
        "Environmental impact and durability analysis",
        "ROI calculations for material investment decisions",
      ],
      whyItMatters: "Buildings using sub-standard materials can incur up to 40% higher maintenance costs over 20 years. Our modeling helps you avoid these hidden expenses.",
    },
    {
      icon: AlertCircle,
      title: "Compliance & Durability Review",
      description: "Ensure all materials meet required standards, building codes, and site-specific environmental conditions for optimal long-term performance.",
      features: [
        "Building code compliance verification",
        "International standards certification (ISO, ASTM, etc.)",
        "Site-specific durability testing",
        "Quality control and material testing protocols",
      ],
      whyItMatters: "Non-compliant materials are the leading cause of structural failures and legal disputes in construction, with costs averaging 3-5x the original material investment.",
    },
    {
      icon: GraduationCap,
      title: "Training & Workshops",
      description: "Empower your team with expert knowledge on selecting, managing, and specifying quality materials for superior project outcomes.",
      features: [
        "On-site training for project teams",
        "Material selection workshops for architects and engineers",
        "Quality control training for site supervisors",
        "Custom workshops for specific material types or projects",
      ],
      whyItMatters: "Educated teams make better decisions. Our training reduces material-related errors by up to 60% and improves overall project efficiency.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Material-Quality Consulting for Construction Projects
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert guidance to ensure your building materials deliver maximum value, durability, and performance throughout the project lifecycle.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-16">
            {services.map((service, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Icon & Title */}
                    <div className="lg:col-span-1">
                      <service.icon className="w-16 h-16 text-primary mb-4" />
                      <h2 className="text-2xl md:text-3xl font-bold mb-4">{service.title}</h2>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>

                    {/* Middle Column - Features */}
                    <div className="lg:col-span-1">
                      <h3 className="text-lg font-semibold mb-4">What's Included:</h3>
                      <ul className="space-y-3">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right Column - Why It Matters */}
                    <div className="lg:col-span-1 bg-secondary/50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-primary" />
                        Why It Matters
                      </h3>
                      <p className="text-muted-foreground">{service.whyItMatters}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Cost of Poor Material Choices
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Data-driven insights on why material quality cannot be compromised.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">40%</div>
              <p className="text-lg">Higher maintenance costs over 20 years with sub-standard materials</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">3-5x</div>
              <p className="text-lg">Average cost multiplier for fixing non-compliant material failures</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">25-35%</div>
              <p className="text-lg">Reduction in delays with proper pre-construction material audits</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Let's Discuss Your Project's Material Needs
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Schedule a free consultation to discover how our services can optimize your material selection and project outcomes.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg">
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
