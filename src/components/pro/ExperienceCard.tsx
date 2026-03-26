import { Building2, Calendar, MapPin, Pencil } from "lucide-react";

interface Experience {
    id: string;
    title: string;
    company: string;
    employment_type?: string;
    location?: string;
    location_type?: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
    skills?: string[];
}

interface ExperienceCardProps {
    experience: Experience;
    isEditable?: boolean;
    onEdit?: (exp: Experience) => void;
}

const ExperienceCard = ({ experience, isEditable, onEdit }: ExperienceCardProps) => {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const duration = () => {
        const start = new Date(experience.start_date);
        const end = experience.is_current ? new Date() : new Date(experience.end_date!);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        let parts = [];
        if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
        if (remainingMonths > 0) parts.push(`${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`);
        return parts.join(' ');
    };

    return (
        <div className="flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-2xl group relative">
            <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <Building2 className="w-6 h-6 text-slate-400" />
                </div>
            </div>
            
            <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {experience.title}
                    </h4>
                    {isEditable && (
                        <button 
                            onClick={() => onEdit?.(experience)}
                            className="p-2 transition-all duration-300 hover:bg-primary/5 rounded-full text-slate-950 dark:text-white hover:text-primary group/card-edit"
                        >
                            <Pencil className="w-4 h-4 group-hover/card-edit:scale-110 transition-transform" />
                        </button>
                    )}
                </div>
                
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {experience.company} {experience.employment_type && `· ${experience.employment_type}`}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(experience.start_date)} – {experience.is_current ? 'Present' : formatDate(experience.end_date!)} · {duration()}
                    </span>
                    {experience.location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {experience.location} {experience.location_type && `· ${experience.location_type}`}
                        </span>
                    )}
                </div>
                
                {experience.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                        {experience.description}
                    </p>
                )}
                
                {experience.skills && experience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {experience.skills.map((skill, idx) => (
                            <span key={idx} className="text-[9px] font-black uppercase tracking-tighter text-primary px-2 py-0.5 bg-primary/10 rounded">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExperienceCard;
