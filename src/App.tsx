import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AIStudio from "./pages/AIStudio";
import Marketplace from "./pages/Marketplace";

// New Page Placeholders (Will be created in next steps)
const Calculators = () => <div className="p-20 text-center">Calculators Hub Coming Soon</div>;
const ProDashboard = () => <div className="p-20 text-center">Professional Dashboard Coming Soon</div>;
const VendorRegister = () => <div className="p-20 text-center">Vendor Registration Flow</div>;
const ProRegister = () => <div className="p-20 text-center">Pro Registration Flow</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* New Industry Transformation Routes */}
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/pro-portal" element={<ProDashboard />} />
          <Route path="/pro/ai-studio" element={<AIStudio />} />
          <Route path="/register/vendor" element={<VendorRegister />} />
          <Route path="/register/pro" element={<ProRegister />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
