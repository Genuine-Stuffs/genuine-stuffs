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
import AIDocumentation from "./pages/AIDocumentation";
import Marketplace from "./pages/Marketplace";
import Pros from "./pages/Pros";
import Calculators from "./pages/Calculators";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VendorDashboard from "./pages/VendorDashboard";
import ProDashboard from "./pages/ProDashboard";
import Settings from "./pages/Settings";
import Cart from "./pages/Cart";
import ClientProfile from "./pages/ClientProfile";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="material-insight-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow pb-20 md:pb-0">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />

                  {/* New Industry Transformation Routes */}
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/pros" element={<Pros />} />
                  <Route path="/calculators" element={<Calculators />} />
                  <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                  <Route path="/pro-portal" element={<ProDashboard />} />
                  <Route path="/pro/ai-studio" element={<AIStudio />} />
                  <Route path="/pro/ai-documentation" element={<AIDocumentation />} />
                  <Route path="/pro/documentation" element={<AIDocumentation />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/profile" element={<ClientProfile />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <BottomNav />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
