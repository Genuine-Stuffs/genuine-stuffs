import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Methodology = () => {
  return (
    <div className="min-h-screen bg-[#F0F9FF] dark:bg-[#181E26] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-primary selection:text-white pb-24 md:pb-0 overflow-x-hidden">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline uppercase tracking-tight mb-8">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="mb-12">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              How We <span className="text-primary">Get Our Numbers.</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              We don't make up numbers. Checking things is what we are about, so being open about our figures matters more than anything. Here is exactly how we work out each figure shown on our website.
            </p>
          </div>

          <div className="space-y-12">
            
            {/* Value Quantified */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="text-lg font-extrabold">₦</span>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Worth of Building Work Costed</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The total value of all the building cost estimates and BoQs (Bills of Quantities: priced lists of every material a building needs) made in our AI (Artificial Intelligence) Studio. 
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">How We Work It Out</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">
                      For every project made on our website, we multiply the amount of each material by its current factory price, and add it all up.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Material SKUs Priced */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Building Products with Prices</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The exact number of different building products that are listed, priced and ready to order in our marketplace right now.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">What Counts</h4>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 font-medium space-y-2">
                      <li className="flex gap-2"><span className="text-primary">•</span> The product must come from a supplier we have checked.</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> The product must meet at least the minimum quality set by the SON (Standards Organisation of Nigeria) in the NIS (Nigerian Industrial Standards).</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> Its price must have been updated in the last 72 hours.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 min Median Concept */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#2D3748] border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="text-lg font-extrabold">⏱</span>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">3 Minutes from Idea to Priced Materials List</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The typical (middle) time between an architect entering the building's details in the AI Studio and receiving a fully priced BoQ, ready to order from.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Where the Figure Comes From</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">
                      Our system records the time each request is sent and the time its BoQ is ready. We take the difference for the last 500 successful requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Want to see it for yourself?</h3>
            <Button asChild size="lg" className="h-14 px-8 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25">
              <Link to="/pro/ai-studio">Try the AI Studio</Link>
            </Button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Methodology;
