interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

const Logo = ({ className = "", iconClassName = "h-10 md:h-12", textClassName = "" }: LogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/logo-gs.png" 
        alt="Genuine Stuffs Logo" 
        className={`${iconClassName} w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-105 shadow-sm`} 
      />
      <div className={`flex flex-col justify-center ${textClassName}`}>
        <span className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
          Genuine Stuffs
        </span>
        <span className="text-[10px] md:text-xs font-bold text-[#708090] dark:text-slate-400 mt-1">
          A Data-Driven Ecosystem
        </span>
      </div>
    </div>
  );
};

export default Logo;
