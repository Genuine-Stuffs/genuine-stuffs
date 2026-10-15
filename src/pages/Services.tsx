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
      title: "Checking Materials and Suppliers",
      description: "We look closely at building material suppliers. We make sure what they sell meets quality standards and suits your project.",
      features: [
        "Background checks on each supplier",
        "Checking materials meet quality standards",
        "Checking prices are genuine",
        "Checking suppliers really have the stock they list",
      ],
      whyItMatters: "Poor materials and disorganised supply cause 90% of projects that go over budget. Checking is your first protection against both.",
    },
    {
      icon: TrendingUp,
      title: "Building and Property Advice",
      description: "We have more than twenty years of experience on building sites. We protect the value of your property by choosing the right materials and keeping costs down.",
      features: [
        "Reviewing the design and the structure",
        "Working out where your money goes furthest",
        "Predicting how long your building will last",
        "Planning how and where to buy materials",
      ],
      whyItMatters: "Our hands-on experience means you don't just build, you build properly, so your property keeps its value for longer.",
    },
    {
      icon: AlertCircle,
      title: "Following the Rules and Protecting Value",
      description: "We protect your investment by making sure your project follows building rules and is built to a high standard.",
      features: [
        "Knowing which building rules apply",
        "Checking professionals and tradespeople",
        "Making sure the building is structurally sound",
        "Organising the project with quality in mind",
      ],
      whyItMatters: "Getting this right prevents buildings failing and legal disputes, protecting your investment for generations.",
    },
    {
      icon: GraduationCap,
      title: "Training and Learning",
      description: "We help newcomers to building and property owners learn what they need, through courses, training and guidance.",
      features: [
        "Skills training and checks for tradespeople",
        "Workshops on choosing materials",
        "Learning the building rules and standards",
        "Good habits for people running a building project",
      ],
      whyItMatters: "Knowledge lowers risk. People who understand their project make better choices and avoid expensive building mistakes.",
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 bg-slate-900 dark:bg-black text-white relative overflow-hidden transition-colors duration-300">
        <div className="absolute bottom-0 left-0 p-40 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
            Building Advice That <span className="text-primary italic">Protects</span> Your Money
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed">
            Helping you make well-informed choices and protecting the value of your property for years, through trust, careful checking and shared knowledge.
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
              The numbers that show why you should never cut corners on material quality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">40%</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Higher upkeep costs when poor-quality materials are used</p>
            </div>
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">3-5x</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">How many times more it costs, on average, to fix failed materials</p>
            </div>
            <div className="text-center p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-105">
              <div className="text-5xl font-black text-primary mb-4 italic">35%</div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Fewer delays when materials are properly checked</p>
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
              Book a meeting with us to find out how our checked suppliers and professionals can help your project turn out well.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg font-black h-14 px-10 rounded-xl">
              <Link to="/contact">Book a Free Meeting</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
