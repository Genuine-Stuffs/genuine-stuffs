import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import consultationImage from "@/assets/consultation-meeting.jpg";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Quality First",
      description: "We believe that material quality is the foundation of every successful construction project. Our recommendations prioritize long-term performance over short-term savings.",
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "We provide clear, data-driven insights that empower you to make informed decisions. No hidden agendas, just honest expert guidance.",
    },
    {
      icon: Heart,
      title: "Longevity Focus",
      description: "Our approach centers on lifecycle value. We help you build structures that stand the test of time and deliver sustained returns on investment.",
    },
  ];

  const team = [
    {
      name: "Dr. Emmanuel Adebayo",
      role: "Founder & Lead Consultant",
      credentials: "PhD Materials Science, 15+ years construction consulting",
      bio: "Former research lead at National Building Institute, specializing in tropical climate material durability and lifecycle performance modeling.",
    },
    {
      name: "Chioma Okafor",
      role: "Senior Materials Engineer",
      credentials: "MSc Structural Engineering, COREN certified",
      bio: "Expert in compliance standards and quality control protocols, with extensive experience in commercial and residential construction projects.",
    },
    {
      name: "Ibrahim Hassan",
      role: "Lifecycle Performance Analyst",
      credentials: "MEng Civil Engineering, Value Engineering certified",
      bio: "Specializes in cost-benefit analysis and ROI modeling for material selection, helping clients maximize long-term asset value.",
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
              About BuildMaster Consulting
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert guidance for construction professionals who understand that the right materials today mean better buildings tomorrow.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                BuildMaster Consulting exists to bridge the knowledge gap between material specifications and real-world construction outcomes. We empower builders, project owners, and construction professionals with the expertise needed to make informed material decisions that enhance project quality, reduce lifecycle costs, and maximize asset value.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Too often, construction projects compromise on material quality due to budget pressures or lack of understanding about long-term implications. Our consulting services provide the technical knowledge and data-driven insights needed to justify quality material investments and avoid costly mistakes.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Our Vision</h3>
                  <p className="text-muted-foreground">
                    To become the trusted authority on construction material quality across Africa, setting new standards for durability, compliance, and lifecycle value in the built environment.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img
                src={consultationImage}
                alt="BuildMaster consulting team meeting with clients"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The principles that guide every consultation, recommendation, and partnership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6 text-center">
                  <value.icon className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Expert Team</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Seasoned professionals with deep expertise in materials science, engineering, and construction consulting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="w-24 h-24 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-center mb-1">{member.name}</h3>
                  <p className="text-primary text-center font-medium mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground text-center mb-4">{member.credentials}</p>
                  <p className="text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Why Choose BuildMaster?</h2>
            
            <div className="space-y-6">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-3">Deep Technical Expertise</h3>
                  <p className="text-muted-foreground">
                    Our team combines academic research, industry certifications, and hands-on construction experience to provide comprehensive material consulting services.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-3">Data-Driven Recommendations</h3>
                  <p className="text-muted-foreground">
                    We don't rely on guesswork. Our recommendations are backed by lifecycle modeling, compliance verification, and proven performance data.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-3">Local Expertise with Global Standards</h3>
                  <p className="text-muted-foreground">
                    We understand regional climate challenges and local material availability while ensuring compliance with international quality standards.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-3">Partnership Approach</h3>
                  <p className="text-muted-foreground">
                    We work alongside your team, educating and empowering rather than just dictating solutions. Your success is our success.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
