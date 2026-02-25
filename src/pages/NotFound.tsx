import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
      <div className="text-center p-8">
        <div className="w-32 h-32 bg-primary/10 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner animate-pulse border dark:border-white/5">
          <h1 className="text-6xl font-black text-primary italic">404</h1>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-none">Lost in <span className="text-primary italic">Construction</span></h2>
        <p className="mb-10 text-xl text-slate-500 dark:text-slate-400 font-medium italic">Oops! This resource seems to be under renovation.</p>
        <a href="/" className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl hover:scale-105 transition-all">
          Back to Site Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
