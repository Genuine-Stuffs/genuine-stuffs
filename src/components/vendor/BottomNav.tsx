import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/vendor-dashboard" },
  { icon: Package, label: "Stock", path: "/vendor-inventory" },
  { icon: ShoppingCart, label: "Orders", path: "/vendor-orders" },
  { icon: BarChart3, label: "Stats", path: "/vendor-analytics" },
  { icon: Settings, label: "Account", path: "/vendor-settings" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 shadow-2xl rounded-[2rem] flex items-center justify-around h-16 px-2 overflow-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300",
                isActive ? "text-primary bg-primary/10" : "text-slate-400"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-0.5 transition-transform", isActive && "scale-110")} />
              <span className={cn("text-[8px] font-black uppercase tracking-tighter transition-all", isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1")}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
