import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const BottomNav = () => {
    const location = useLocation();
    const { role } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { label: "Home", icon: Home, path: "/" },
        { label: "Shop", icon: ShoppingBag, path: "/marketplace" },
        { label: "Cart", icon: ShoppingCart, path: "/cart" },
        { label: "Profile", icon: User, path: "/profile" },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
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
                                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                                }`}
                        />
                        <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${isActive(item.path)
                                ? "text-primary"
                                : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
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
