import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User, Sparkles, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const BottomNav = () => {
    const location = useLocation();
    const { role, user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    const isProfilePage = location.pathname === "/profile" || location.pathname.startsWith("/pro/profile/");
    const isProsPage = location.pathname === "/pros";

    useEffect(() => {
        let lastY = window.scrollY;
        const handleScroll = () => {
            const currentY = window.scrollY;
            
            // Show if scrolling up, hide if scrolling down
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

    if (
        location.pathname === "/login" || 
        location.pathname === "/register" || 
        location.pathname.startsWith("/vendor-") ||
        location.pathname === "/pro-portal" ||
        location.pathname === "/pro/ai-studio"
    ) {
        return null;
    }

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { label: "Home", icon: Home, path: "/" },
        { label: "Shop", icon: ShoppingBag, path: "/marketplace" },
        { label: "AI Studio", icon: Sparkles, path: "/pro/ai-studio" },
        isProfilePage 
            ? { label: "Resources", icon: BookOpen, path: "/resources" }
            : { label: "Profile", icon: User, path: role === 'professional' ? `/pro/profile/${user?.id}` : "/profile" },
    ];

    return (
        <div 
            className={`md:hidden fixed bottom-6 left-6 right-6 z-50 transition-all duration-500 transform ${
                (!isVisible && isProsPage) ? "translate-y-[200%] opacity-0" : "translate-y-0 opacity-100"
            }`}
        >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-2xl px-6 py-4 flex items-center justify-between">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <item.icon
                            className={`w-6 h-6 transition-all duration-300 ${isActive(item.path)
                                    ? "text-primary scale-110"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                        />
                        <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${isActive(item.path)
                                ? "text-primary"
                                : "text-slate-600 dark:text-slate-400"
                            }`}>
                            {item.label}
                        </span>
                        {isActive(item.path) && (
                            <div className="w-1 h-1 bg-primary rounded-full mt-0.5 animate-in fade-in zoom-in duration-300" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
