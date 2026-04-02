import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown, Rocket, ShieldCheck, ShoppingBag, LayoutDashboard, Search, Settings, BookOpen, Sparkles, Calculator } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role, logout } = useAuth();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/marketplace", label: "Marketplace" },
    { path: "/hire-experts", label: "Hire Certified AEC Experts", hideForRole: "professional" },
    { path: "/pros", label: "ProHuB", role: "professional" },
    { path: "/pro-portal", label: "Dashboard", role: "professional" },
    { path: "/vendor-dashboard", label: "Dashboard", role: "vendor" },
  ];

  const filteredLinks = navLinks.filter(link => {
    if (link.role && link.role !== role) return false;
    if (link.hideForRole && link.hideForRole === role) return false;
    return true;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`hidden md:block ${isActive("/pros") ? "relative" : "sticky top-0"} z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center group">
            <Logo />
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
                    : "text-slate-500 dark:text-white hover:text-slate-900 dark:hover:text-red-500 hover:bg-white/50 dark:hover:bg-white/10"
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
                      <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-black leading-none mb-0.5">Logged in as</p>
                      <p className="text-xs font-bold leading-none capitalize text-slate-900 dark:text-white">{user?.email?.split('@')[0] || role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-slate-100 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900">
                  <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Account</DropdownMenuLabel>
                  {role === 'professional' && (
                    <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors">
                      <Link to="/pro/ai-studio" className="flex items-center gap-3 w-full">
                        <Sparkles className="w-4 h-4 text-primary" /> <span className="font-bold text-slate-700 dark:text-slate-200">AI Studio</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'professional' && (
                    <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors text-amber-600 dark:text-amber-400">
                      <Link to="/calculators" className="flex items-center gap-3 w-full">
                        <Calculator className="w-4 h-4" /> <span className="font-bold">BoQ Calculator</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'professional' && (
                    <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors">
                      <Link to={`/pro/profile/${user?.id}`} className="flex items-center gap-3 w-full">
                        <User className="w-4 h-4 text-slate-500 dark:text-slate-400" /> <span className="font-bold text-slate-700 dark:text-slate-200">View Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'professional' && (
                    <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors">
                      <Link to="/resources" className="flex items-center gap-3 w-full">
                        <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" /> <span className="font-bold text-slate-700 dark:text-slate-200">Resources</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors">
                    <Link to="/settings" className="flex items-center gap-3 w-full">
                      <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" /> <span className="font-bold text-slate-700 dark:text-slate-200">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-white/5" />
                  <DropdownMenuItem onClick={logout} className="rounded-xl gap-3 py-3 px-4 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer font-bold">
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

      </div>

      {/* Mobile Navigation - Transparent Glassmorphism Overlay */}
      {isOpen && (
        <div className="md:hidden fixed right-0 top-[80px] z-[9999] w-[50%] max-h-[42vh] overflow-y-auto border-l border-b border-sky-400/20 dark:border-sky-400/10 flex flex-col shadow-2xl rounded-bl-3xl" style={{ background: 'rgba(8, 47, 73, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div className="flex-grow px-3 py-2 space-y-0.5">
            {filteredLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${isActive(link.path)
                  ? "bg-primary text-[#ffffff] shadow-lg shadow-primary/40 scale-[1.01]"
                  : "text-[#ffffff] hover:bg-white/10 active:scale-95 transition-all"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {role !== 'guest' && (
              <Link
                to={role === 'vendor' ? "/vendor-settings" : "/settings"}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs text-[#ffffff] hover:bg-white/10 active:scale-95 transition-all"
              >
                <Settings className="w-4 h-4 opacity-70" /> Settings
              </Link>
            )}
            <div className="pt-3 border-t border-sky-400/20">
              <p className="px-4 pb-1 text-[9px] font-bold uppercase text-sky-300/70 tracking-[0.4em]">Authentication</p>
              <div className="px-2 pb-3">
                {role === 'guest' ? (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full h-11 rounded-2xl font-black text-sm border-2 border-sky-400/30 text-white/90 bg-sky-400/10 hover:bg-sky-400/20" onClick={() => setIsOpen(false)}>
                      <Link to="/login">LOG IN</Link>
                    </Button>
                    <Button asChild className="w-full h-11 rounded-2xl font-black text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30" onClick={() => setIsOpen(false)}>
                      <Link to="/register">JOIN PLATFORM</Link>
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-9 rounded-xl font-bold text-[11px] text-red-400 border-red-400/20 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/20" onClick={() => { logout(); setIsOpen(false); }}>LOGOUT</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;