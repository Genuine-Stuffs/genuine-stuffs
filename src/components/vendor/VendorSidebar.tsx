import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor-dashboard" },
  { icon: Package, label: "Material Inventory", path: "/vendor-inventory" },
  { icon: ShoppingCart, label: "Orders", path: "/vendor-orders" },
  { icon: BarChart3, label: "Analytics", path: "/vendor-analytics" },
  { icon: Settings, label: "Settings", path: "/vendor-settings" },
];

const VendorSidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-card/50 backdrop-blur-xl h-[calc(100vh-64px)] sticky top-16 transition-all duration-300">
      <div className="flex flex-col flex-1 py-6 px-4 gap-2">
        <div className="mb-6 px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Navigation</p>
          <div className="h-1 w-8 bg-primary rounded-full" />
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400")} />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-border/50">
          <Link
            to="/help"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 group"
          >
            <HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
            <span className="text-sm font-bold tracking-tight">Help & Support</span>
          </Link>
        </div>
      </div>
      
      <div className="p-4 mt-4 pb-8">
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full blur-2xl transition-all group-hover:scale-150" />
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Partner Account</p>
          <p className="text-[10px] text-muted-foreground font-medium italic">Genuine Stuffs Certified Vendor</p>
        </div>
      </div>
    </aside>
  );
};

export default VendorSidebar;
