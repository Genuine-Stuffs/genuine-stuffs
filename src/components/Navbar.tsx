import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown, Rocket, ShieldCheck, ShoppingBag, LayoutDashboard, Search, Settings } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
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
  const { user, role, logout } = useAuth();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/marketplace", label: "Marketplace" },
    { path: role === "professional" ? "/resources" : "/pros", label: role === "professional" ? "Resources" : "Hire Professionals" },
    { path: "/pro/ai-studio", label: "AI Studio", role: "professional" },
    { path: "/pro-portal", label: "Dashboard", role: "professional" },
    { path: "/vendor-dashboard", label: "Dashboard", role: "vendor" },
  ];

  const filteredLinks = navLinks.filter(link => !link.role || link.role === role);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-slate-100 dark:border-border transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative overflow-hidden rounded-xl w-[45px] h-[45px]">
              <img src={logoIcon} alt="Genuine Stuffs Ltd" className="w-full h-full object-cover scale-[1.3] hover:scale-[1.4] transition-transform origin-center" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-tight tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">Genuine Stuffs</span>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest leading-none">A Data-Driven Ecosystem</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-1 bg-slate-100/50 dark:bg-muted/50 p-1.5 rounded-2xl">
              {filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${isActive(link.path)
                    ? "bg-white dark:bg-primary/20 text-primary shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-muted/50"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <ModeToggle />

            <div className="h-8 w-[1px] bg-slate-100 dark:bg-border" />

            {/* Auth State */}
            {role === 'guest' ? (
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" className="rounded-2xl font-black text-slate-700 dark:text-slate-200 px-4 h-11 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-muted dark:hover:text-white transition-colors">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild className="rounded-2xl font-black bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-6 h-11 transition-colors">
                  <Link to="/register">Join Platform</Link>
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-2xl gap-2 font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-card border-none hover:bg-slate-100 dark:hover:bg-muted text-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${role === 'professional' ? 'bg-primary text-white' :
                      role === 'vendor' ? 'bg-orange-500 text-white' :
                        'bg-slate-300 dark:bg-slate-600 text-white'
                      }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-[10px] uppercase text-slate-400 font-black leading-none mb-0.5">Logged in as</p>
                      <p className="text-xs font-bold leading-none capitalize">{user?.email?.split('@')[0] || role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                  <DropdownMenuLabel className="px-4 py-2 text-xs font-black uppercase text-slate-400">Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 cursor-pointer">
                    <Link to={role === 'vendor' ? '/vendor-dashboard' : '/pro-portal'}>
                      <LayoutDashboard className="w-4 h-4 text-slate-400" /> <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 cursor-pointer">
                    <Link to="/settings">
                      <Settings className="w-4 h-4 text-slate-400" /> <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="rounded-xl gap-3 py-3 text-red-500 focus:text-red-500 cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Actions */}
          <div className="flex md:hidden items-center gap-2">
            <ModeToggle />
            <button
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
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
              <div className="px-4">
                {role === 'guest' ? (
                  <div className="space-y-3">
                    <Button asChild variant="outline" className="w-full rounded-2xl font-black border-2" onClick={() => setIsOpen(false)}>
                      <Link to="/login">Log In</Link>
                    </Button>
                    <Button asChild className="w-full rounded-2xl font-black" onClick={() => setIsOpen(false)}>
                      <Link to="/register">Join Platform</Link>
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full rounded-2xl font-black text-red-500" onClick={() => { logout(); setIsOpen(false); }}>Logout</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;