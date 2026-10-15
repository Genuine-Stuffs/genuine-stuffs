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
      description: "Good materials are the foundation of every building that turns out well. We recommend what will last for years, not what saves a little money today.",
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "We give you clear facts and figures so you can make your own well-informed choices. No hidden motives, just honest advice from experts.",
    },
    {
      icon: Heart,
      title: "Built to Last",
      description: "We think about what a building costs and earns over its whole life. We help you build something that lasts and keeps paying you back for years.",
    },
  ];

  const team = [
    {
      name: "Dr. Emmanuel Adebayo",
      role: "Founder & Lead Consultant",
      credentials: "Doctorate (PhD) in Materials Science, 15+ years advising on building projects",
      bio: "Formerly led research at the National Building Institute, studying how long building materials last in a hot, humid climate and how they perform over a building's life.",
    },
    {
      name: "Chioma Okafor",
      role: "Senior Materials Engineer",
      credentials: "Master's degree (MSc) in Structural Engineering, registered with COREN (Council for the Regulation of Engineering in Nigeria)",
      bio: "An expert in building rules and quality checks, with wide experience on both homes and commercial buildings.",
    },
    {
      name: "Ibrahim Hassan",
      role: "Building Lifetime Cost Analyst",
      credentials: "Master's degree (MEng) in Civil Engineering, certified in value engineering (getting the most from every naira spent)",
      bio: "Weighs the costs and benefits of each material and works out the ROI (return on investment), helping clients get the most value from their property over time.",
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
              Building with <span className="text-primary italic">Facts</span>, Not Guesswork
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed">
              We are here to bring back confidence, quality and lasting value to building and property.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-tight">We Want to Change How Building Is Done.</h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                Our website brings together, in one trusted place, checked suppliers of building materials, building professionals, skilled tradespeople, useful guides and expert advice.
              </p>
              <div className="space-y-6">
                <p className="text-lg text-slate-500 dark:text-slate-500 leading-relaxed">
                  It is built on <span className="font-bold text-slate-900 dark:text-slate-200">more than twenty years of hands-on experience</span> in building and property, from running building sites to managing property.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-white">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                    "Our mission is to help people make well-informed choices, lower the risks of building, and protect the value of their property for years to come, through trust, careful checking and shared knowledge."
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
              The beliefs behind every piece of advice we give and every partnership we make.
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
              Experienced professionals who know building materials, engineering and building projects inside out.
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
                { title: "Real Expertise", desc: "Research at doctorate (PhD) level and decades of running building sites." },
                { title: "Decisions Based on Facts", desc: "For every material, we work out the ROI (return on investment) and how it will perform over the building's life." },
                { title: "Everyone Is Checked", desc: "We check suppliers and tradespeople thoroughly before they join." },
                { title: "With You All the Way", desc: "We guide your project from the first look to the finished building." }
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
