import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Methodology from "./pages/Methodology";
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
import VendorInventory from "./pages/VendorInventory";
import VendorOrders from "./pages/VendorOrders";
import VendorAnalytics from "./pages/VendorAnalytics";
import VendorSettings from "./pages/VendorSettings";
import PMDashboard from "./pages/PMDashboard";
import AdminHome from "./pages/AdminHome";
import SystemMaintenance from "./pages/SystemMaintenance";
import ProDashboard from "./pages/ProDashboard";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import Cart from "./pages/Cart";
import ClientProfile from "./pages/ClientProfile";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import HireExperts from "./pages/HireExperts";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import BlogAdmin from "./pages/BlogAdmin";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./components/ThemeProvider";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

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
            <CartProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow pb-20 md:pb-0">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/methodology" element={<Methodology />} />
                    <Route path="/admin-home" element={<AdminHome />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/help" element={<HelpSupport />} />

                    {/* New Industry Transformation Routes */}
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/pros" element={<Pros />} />
                    <Route path="/hire-experts" element={<HireExperts />} />
                    <Route path="/calculators" element={<Calculators />} />
                    <Route path="/vendor-dashboard" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><VendorDashboard /></ProtectedRoute>} />
                    <Route path="/vendor-inventory" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><VendorInventory /></ProtectedRoute>} />
                    <Route path="/vendor-orders" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><VendorOrders /></ProtectedRoute>} />
                    <Route path="/vendor-analytics" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><VendorAnalytics /></ProtectedRoute>} />
                    <Route path="/vendor-settings" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><VendorSettings /></ProtectedRoute>} />
                    <Route path="/pm-dashboard" element={<ProtectedRoute allowedRoles={['pm', 'admin']}><PMDashboard /></ProtectedRoute>} />
                    <Route path="/pm/system-maintenance" element={<ProtectedRoute allowedRoles={['pm', 'admin']}><SystemMaintenance /></ProtectedRoute>} />
                    <Route path="/pro-portal" element={<ProtectedRoute allowedRoles={['professional', 'admin']}><ProDashboard /></ProtectedRoute>} />
                    <Route path="/pro/ai-studio" element={<ProtectedRoute allowedRoles={['professional', 'admin']}><AIStudio /></ProtectedRoute>} />
                    <Route path="/pro/ai-documentation" element={<ProtectedRoute allowedRoles={['professional', 'admin']}><AIDocumentation /></ProtectedRoute>} />
                    <Route path="/pro/documentation" element={<ProtectedRoute allowedRoles={['professional', 'admin']}><AIDocumentation /></ProtectedRoute>} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/profile" element={<ClientProfile />} />
                    <Route path="/pro/profile/:id" element={<ProfessionalProfile />} />
                    
                    {/* Blog Routes */}
                    <Route path="/blog" element={<BlogList />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/admin/blog" element={<BlogAdmin />} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <BottomNav />
              </div>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
