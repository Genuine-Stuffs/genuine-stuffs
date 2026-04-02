import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User, Sparkles, BookOpen, LayoutDashboard, Settings, Calculator } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const BottomNav = () => {
    const location = useLocation();
    const { role, user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let lastY = window.scrollY;
        const handleScroll = () => {
            const currentY = window.scrollY;
            if (currentY > lastY && currentY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            lastY = currentY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const isPortalRoute = location.pathname.startsWith('/vendor-') || location.pathname.startsWith('/pro-') || location.pathname === '/pro-portal';
    if (location.pathname === "/login" || location.pathname === "/register" || isPortalRoute) {
        return null;
    }

    const isActive = (path: string) => location.pathname === path;

    const getNavItems = () => {
        if (role === 'professional') {
            return [
                { label: "Dashboard", icon: LayoutDashboard, path: "/pro-portal" },
                { label: "AI Studio", icon: Sparkles, path: "/pro/ai-studio" },
                { label: "BoQ Calc", icon: Calculator, path: "/calculators" },
                { label: "Resources", icon: BookOpen, path: "/resources" },
                { label: "Profile", icon: User, path: `/pro/profile/${user?.id}` },
            ];
        } else if (role === 'vendor') {
            return [
                { label: "Home", icon: Home, path: "/" },
                { label: "Shop", icon: ShoppingBag, path: "/marketplace" },
                { label: "Dashboard", icon: LayoutDashboard, path: "/vendor-dashboard" },
                { label: "Settings", icon: Settings, path: "/vendor-settings" },
            ];
        } else {
            return [
                { label: "Home", icon: Home, path: "/" },
                { label: "Shop", icon: ShoppingBag, path: "/marketplace" },
                { label: "Cart", icon: ShoppingCart, path: "/cart" },
                { label: "Profile", icon: User, path: "/profile" },
            ];
        }
    };

    const navItems = getNavItems();

    return (
        <div 
            className={`md:hidden fixed bottom-6 left-5 right-5 z-50 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) transform ${
                !isVisible ? "translate-y-[150%] scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
            }`}
        >
            <div className="bg-white/95 dark:bg-black/90 backdrop-blur-3xl border dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-none px-8 py-5 flex items-center justify-between transition-colors">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${active ? "-translate-y-0.5" : ""}`}
                        >
                            <item.icon
                                size={22}
                                strokeWidth={1.5}
                                className={`transition-all duration-300 ${active
                                        ? "text-primary scale-110"
                                        : "text-slate-400 dark:text-slate-600"
                                    }`}
                            />
                            <span className={`text-[7px] font-black uppercase tracking-[0.2em] transition-colors duration-300 leading-none ${active
                                    ? "text-primary"
                                    : "text-slate-500 dark:text-slate-600"
                                }`}>
                                {item.label}
                            </span>
                            {active && (
                                <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full animate-in zoom-in-50 duration-500" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
