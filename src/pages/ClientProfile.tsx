import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { 
    User, 
    Settings, 
    ShoppingBag, 
    Heart, 
    LogOut, 
    ChevronRight, 
    Package, 
    Clock, 
    CreditCard, 
    MapPin,
    Calendar,
    ArrowRight,
    LogIn
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ClientProfile = () => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const isGuest = !user || role === 'guest';

    const sections = [
        {
            title: "Marketplace Activity",
            items: [
                { icon: Package, label: "Order History", description: "Track your material purchases", path: "#" },
                { icon: Heart, label: "Saved Materials", description: "View your bookmarked listings", path: "/marketplace" },
                { icon: Clock, label: "Browse History", description: "Materials youRecently viewed", path: "/marketplace" },
            ]
        },
        {
            title: "Account Settings",
            items: [
                { icon: User, label: "Personal Information", description: "Update your profile details", path: "/settings" },
                { icon: MapPin, label: "Shipping Addresses", description: "Manage delivery locations", path: "/settings" },
                { icon: CreditCard, label: "Payment Methods", description: "Manage cards and billing", path: "/settings" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            <Navbar />
            
            <main className="container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-5xl mx-auto">
                    {/* Hero Profile Section */}
                    <div className="bg-white dark:bg-card rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 dark:border-border mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                        
                        <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                <User className="w-12 h-12 md:w-16 md:h-16" />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                                        {user?.email?.split('@')[0] || "Guest User"}
                                    </h1>
                                    <Badge className="w-fit mx-auto md:mx-0 bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] px-3 py-1 border-none">
                                        {isGuest ? "Guest" : "Standard Client"}
                                    </Badge>
                                </div>
                                <p className="text-slate-500 font-medium italic mb-6">
                                    {user?.email || "Connect your email to access more features"}
                                </p>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    {isGuest ? (
                                        // Guest CTAs
                                        <>
                                            <Button 
                                                onClick={() => navigate("/login")}
                                                className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 bg-slate-900 dark:bg-white dark:text-slate-900"
                                            >
                                                <LogIn className="w-3.5 h-3.5" /> Log In
                                            </Button>
                                            <Button 
                                                variant="outline"
                                                onClick={() => navigate("/register")}
                                                className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200"
                                            >
                                                Join Platform
                                            </Button>
                                        </>
                                    ) : (
                                        // Authenticated user CTAs
                                        <>
                                            <Button 
                                                onClick={() => navigate("/settings")}
                                                className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 bg-slate-900 dark:bg-white dark:text-slate-900"
                                            >
                                                <Settings className="w-3.5 h-3.5" /> Edit Profile
                                            </Button>
                                            <Button 
                                                variant="outline"
                                                onClick={logout}
                                                className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 dark:border-border text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                            >
                                                <LogOut className="w-3.5 h-3.5" /> Logout
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="hidden lg:grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-100 dark:border-border text-center min-w-[120px]">
                                    <p className="text-2xl font-black text-primary">0</p>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Orders</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-100 dark:border-border text-center min-w-[120px]">
                                    <p className="text-2xl font-black text-primary">0</p>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Saved</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {sections.map((section) => (
                            <div key={section.title} className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-4">
                                    {section.title}
                                </h3>
                                <div className="grid gap-3">
                                    {section.items.map((item) => (
                                        <Card 
                                            key={item.label}
                                            onClick={() => navigate(item.path)}
                                            className="p-4 rounded-2xl border border-slate-100 dark:border-border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-card"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-muted/50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                                                        {item.label}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                        {item.description}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Upsell for Vendor/Pro */}
                    <div className="mt-12 p-8 rounded-[2rem] bg-slate-900 dark:bg-primary/10 border border-white/5 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-2">
                                    Want to <span className="text-primary italic">Sell</span> on the Ecosystem?
                                </h3>
                                <p className="text-slate-400 text-sm font-medium">
                                    Upgrade your account to a Vendor or Professional profile to access specialized tools.
                                </p>
                            </div>
                            <Button 
                                onClick={() => navigate("/register")}
                                className="h-12 px-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-xs gap-3 transition-transform group-hover:scale-105"
                            >
                                Get Started <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ClientProfile;
