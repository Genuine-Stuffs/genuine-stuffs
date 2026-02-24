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
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest mb-6 border border-primary/30">Since 2004</div>
            <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
              A Trust-Driven <span className="text-primary italic">Construction</span> Ecosystem
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed">
              Built to restore confidence, quality, and long-term value in the built environment.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black mb-8">We Exist to Change the Industry.</h2>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                Our platform serves as a verified hub where building materials suppliers, construction professionals, artisans, knowledge resources, and advisory services converge.
              </p>
              <div className="space-y-6">
                <p className="text-lg text-slate-500 leading-relaxed">
                  This platform is founded on <span className="font-bold text-slate-900">over two decades of real-world experience</span> across construction and real estate—from site supervision to property management.
                </p>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h3 className="text-xl font-black mb-4">Our Mission</h3>
                  <p className="text-slate-600 leading-relaxed font-medium italic">
                    "Our mission is to enable informed decision-making, reduce construction risk, and protect long-term property value through trust, verification, and knowledge."
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img
                src={consultationImage}
                alt="Genuine Stuffs consulting team meeting with clients"
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
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Why Choose Genuine Stuffs Ltd?</h2>

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
