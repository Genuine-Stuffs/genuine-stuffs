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
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor-dashboard" },
  { icon: Package, label: "Material Inventory", path: "/vendor-inventory" },
  { icon: ShoppingCart, label: "Orders", path: "/vendor-orders" },
  { icon: BarChart3, label: "Analytics", path: "/vendor-analytics" },
  { icon: Settings, label: "Settings", path: "/vendor-settings" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="bg-[#1C222D]/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-[2rem] flex items-center justify-around h-16 px-2 overflow-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-[#EE1D23] text-white shadow-lg shadow-red-500/20" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-0.5 transition-transform", isActive ? "text-white" : "text-slate-400")} />
              <span className={cn(
                "text-[7px] font-black uppercase tracking-tighter transition-all text-center px-0.5 leading-[1.1]",
                isActive ? "text-white" : "text-slate-500"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
