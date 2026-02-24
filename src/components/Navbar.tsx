import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown, Rocket, ShieldCheck, ShoppingBag, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role, login, logout } = useAuth();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/marketplace", label: "Marketplace" },
    { path: "/resources", label: "Resources" },
    { path: "/pro/ai-studio", label: "AI Studio", role: "pro" },
    { path: "/pro-portal", label: "Dashboard", role: "pro" },
    { path: "/vendor-dashboard", label: "Dashboard", role: "vendor" },
  ];

  const filteredLinks = navLinks.filter(link => !link.role || link.role === role);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img src={logoIcon} alt="Genuine Stuffs Ltd" className="w-[45px] h-[45px] hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-tight tracking-tight text-slate-900 group-hover:text-primary transition-colors">GENUINE STUFFS</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Transformation Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-1 bg-slate-100/50 p-1.5 rounded-2xl">
              {filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${isActive(link.path)
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-slate-100" />

            {/* Role Switcher (For Demo) / Auth State */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-2xl gap-2 font-black text-slate-700 bg-slate-50 border-none hover:bg-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${role === 'pro' ? 'bg-primary text-white' :
                    role === 'vendor' ? 'bg-orange-500 text-white' :
                      'bg-slate-300 text-white'
                    }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-[10px] uppercase text-slate-400 font-black leading-none mb-0.5">Logged in as</p>
                    <p className="text-xs font-bold leading-none capitalize">{role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                <DropdownMenuLabel className="px-4 py-2 text-xs font-black uppercase text-slate-400">Switch Role (Dev Mode)</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => login('client')} className="rounded-xl gap-3 py-3 cursor-pointer">
                  <ShoppingBag className="w-4 h-4 text-slate-400" /> <span>Switch to Client</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => login('pro')} className="rounded-xl gap-3 py-3 cursor-pointer">
                  <Rocket className="w-4 h-4 text-primary" /> <span>Switch to Pro (Architect)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => login('vendor')} className="rounded-xl gap-3 py-3 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-orange-500" /> <span>Switch to Vendor</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="rounded-xl gap-3 py-3 text-red-500 focus:text-red-500 cursor-pointer">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {role === 'guest' ? (
              <Button asChild className="rounded-2xl font-black bg-slate-900 hover:bg-slate-800 px-6 h-11">
                <Link to="/register/pro">Join Platform</Link>
              </Button>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl bg-slate-50"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
            {filteredLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive(link.path) ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t">
              <p className="px-4 pb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Authentication</p>
              <div className="grid grid-cols-2 gap-2 px-2">
                <Button variant="outline" className="rounded-2xl font-bold" onClick={() => login('pro')}>Switch Pro</Button>
                <Button variant="outline" className="rounded-2xl font-bold" onClick={() => login('vendor')}>Switch Vendor</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;