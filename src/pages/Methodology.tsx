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
              Our <span className="text-primary">Methodology.</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              We don't invent numbers. For a brand whose entire thesis is verification, transparency is the only metric that matters. Here is exactly how we calculate the figures we report on our platform.
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
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Value Quantified</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The total gross merchandise value (GMV) of all structural estimates and Bills of Quantities (BoQs) generated through the AI Studio. 
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Calculation Model</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">
                      Sum of (Quantity of Material × Live Factory Gate Price) across all generated projects on the platform.
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
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Verified Material SKUs</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The exact count of distinct material Stock Keeping Units (SKUs) currently live, priced, and orderable in our procurement marketplace.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Inclusion Criteria</h4>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 font-medium space-y-2">
                      <li className="flex gap-2"><span className="text-primary">•</span> SKU must be actively linked to a verified supplier.</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> SKU must meet Standard Organisation of Nigeria (SON/NIS) minimum engineering specifications.</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> SKU pricing must have been updated within the last 72 hours.</li>
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
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">3 Min Takeoff Speed</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    The median time elapsed between an architect uploading structural parameters into the AI Studio and the generation of a fully costed, procure-ready BoQ.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Data Source</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">
                      System telemetry logs measuring (Timestamp of Final BoQ Generation - Timestamp of Parameter Submission) across the last 500 successful queries.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Want to see the data in action?</h3>
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
