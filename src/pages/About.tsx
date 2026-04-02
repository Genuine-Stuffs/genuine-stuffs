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
    <div className="min-h-screen bg-background dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 bg-slate-900 dark:bg-black text-white relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-0 p-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest mb-6 border border-primary/30">Since 2004</div>
            <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
              A Data-Driven <span className="text-primary italic">Construction</span> Ecosystem
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
              <h2 className="text-4xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-tight">We Exist to Change the Industry.</h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                Our platform serves as a verified hub where building materials suppliers, construction professionals, artisans, knowledge resources, and advisory services converge.
              </p>
              <div className="space-y-6">
                <p className="text-lg text-slate-500 dark:text-slate-500 leading-relaxed">
                  This platform is founded on <span className="font-bold text-slate-900 dark:text-slate-200">over two decades of real-world experience</span> across construction and real estate—from site supervision to property management.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-white">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
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
      <section className="py-20 bg-secondary/30 dark:bg-slate-900/50 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">Our Core Values</h2>
            <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto font-medium">
              The principles that guide every consultation, recommendation, and partnership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-2 dark:border-slate-800 dark:bg-slate-900 hover:border-primary transition-all rounded-3xl overflow-hidden shadow-sm">
                <CardContent className="pt-8 text-center">
                  <value.icon className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter">{value.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{value.description}</p>
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
              <Card key={index} className="border-2 dark:border-slate-800 dark:bg-slate-900 rounded-3xl overflow-hidden group hover:border-primary transition-all">
                <CardContent className="pt-8">
                  <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-4xl font-black text-primary">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-center mb-1 text-slate-900 dark:text-white uppercase tracking-tight">{member.name}</h3>
                  <p className="text-primary text-center font-bold mb-3 uppercase tracking-widest text-xs">{member.role}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-6 font-bold uppercase tracking-wider">{member.credentials}</p>
                  <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-center italic">"{member.bio}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-secondary/30 dark:bg-slate-900/50 transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black mb-12 text-center text-slate-900 dark:text-white uppercase tracking-tight">Why Choose us?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Technical Expertise", desc: "PhD level research and decades of site management." },
                { title: "Data-Driven Modeling", desc: "ROI and lifecycle performance analysis for every material." },
                { title: "Verified Ecosystem", desc: "Rigorous screening for both suppliers and artisans." },
                { title: "Partnership Focus", desc: "We guide projects from assessment to completion." }
              ].map((perf, i) => (
                <Card key={i} className="border-2 dark:border-slate-800 dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl transition-all">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-black mb-3 text-slate-900 dark:text-white uppercase tracking-tighter">{perf.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {perf.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
