import { useState, useEffect } from "react";
import { Search, MapPin, Star, ShieldCheck, Mail, Phone, ExternalLink, ShoppingBag, ChevronDown, X, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "backend/supabaseClient";
import { Link } from "react-router-dom";

const Pros = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("All Nigeria");
    const [activeType, setActiveType] = useState<"professional" | "artisan">("professional");
    const [prosData, setProsData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const locations = [
        "All Nigeria", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
        "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", 
        "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", 
        "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
    ];

    useEffect(() => {
        const fetchPros = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('professionals')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setProsData(data || []);
            } catch (err) {
                console.error("Error fetching pros:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPros();
    }, []);

    const filteredPros = prosData
        .filter(pro => (pro.professional_type || 'professional') === activeType)
        .filter(pro => 
            pro.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            pro.specialty.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter(pro => location === "All Nigeria" || pro.state === location);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />
            
            <div className="bg-white dark:bg-card pt-2 md:pt-4 pb-4 md:pb-6 sticky top-16 md:top-20 z-30 transition-all duration-300 overflow-hidden border-b dark:border-border">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto space-y-2 md:space-y-4">
                        <div className="hidden md:flex text-slate-800 dark:text-white text-center mb-1 items-center justify-center gap-2">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <Star className="w-5 h-5 text-primary" /> Find Your Professional/Artisan Expert
                            </h2>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-muted/30 rounded-xl md:rounded-2xl p-1 flex flex-col md:flex-row gap-0 shadow-sm border border-slate-100 dark:border-border items-stretch">
                            {/* Location Picker */}
                            <div className="relative flex-shrink-0 min-w-[120px] md:min-w-[140px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-border/50">
                                <select 
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full h-10 md:h-12 pl-9 pr-6 bg-transparent text-[11px] md:text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none cursor-pointer"
                                >
                                    {locations.map(loc => <option key={loc} value={loc} className="dark:bg-card">{loc}</option>)}
                                </select>
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Search Input */}
                            <div className="flex-1 relative flex items-center">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                <input
                                    className="w-full h-10 md:h-12 pl-10 pr-4 bg-transparent border-none focus:ring-0 text-xs md:text-base text-slate-700 dark:text-slate-200 font-bold placeholder:font-medium placeholder:text-slate-400"
                                    placeholder={`Search for ${activeType === 'professional' ? 'Professionals' : 'Artisans'}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                
                                {/* Search Button (more integrated) */}
                                <Button className="h-8 w-8 md:h-10 md:w-10 p-0 rounded-lg md:rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0 shadow-sm mr-2 ml-1">
                                    <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                                </Button>

                                {/* Desktop Toggle (DO NOT TOUCH) */}
                                <div className="hidden md:flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-border mr-1 shadow-sm">
                                    <button
                                        onClick={() => setActiveType('professional')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'professional' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Professionals
                                    </button>
                                    <button
                                        onClick={() => setActiveType('artisan')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'artisan' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Artisans
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Toggle (NEW) */}
                        <div className="flex md:hidden items-center p-1 bg-slate-50 dark:bg-muted/10 rounded-xl border border-slate-100 dark:border-border shadow-sm">
                            <button
                                onClick={() => setActiveType('professional')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'professional' ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}
                            >
                                Professionals
                            </button>
                            <button
                                onClick={() => setActiveType('artisan')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'artisan' ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}
                            >
                                Artisans
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Header Text (Adjusted) */}
                <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-[20px] md:text-[32px] font-black mb-0 leading-tight uppercase tracking-tighter">
                            Hire Certified <span className="text-primary italic">Professionals/Artisans</span>
                        </h1>
                    <p className="text-muted-foreground text-[10px] md:text-base font-medium max-w-2xl mx-auto italic leading-relaxed">
                        Find vetted experts to execute your construction projects with precision and integrity.
                    </p>
                </div>

                {/* Grid - NOW 2 COL COLUMNS ON MOBILE */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 min-h-[400px]">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 animate-pulse">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Syncing Industry Experts...</p>
                        </div>
                    ) : filteredPros.length > 0 ? (
                        filteredPros.map((pro) => (
                            <Card key={pro.id} className="group relative bg-white dark:bg-card border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden flex flex-col h-full">
                                {/* Card Header / Cover Image */}
                                <div className="relative h-20 md:h-24 overflow-hidden">
                                    <img 
                                        src={pro.cover_url || `https://images.unsplash.com/photo-${(pro.professional_type || 'professional') === 'professional' ? '1486406146926-c627a92ad1ab' : '1504307651254-35680f356dfd'}?q=80&w=400&auto=format&fit=crop`}
                                        className="w-full h-full object-cover opacity-80"
                                        alt="cover"
                                    />
                                    <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Profile Image - Overlapping */}
                                <div className="px-3 -mt-10 mb-2 relative z-10 flex justify-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white dark:border-card overflow-hidden bg-slate-100 shadow-md">
                                            <img 
                                                src={pro.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${pro.full_name}`} 
                                                alt={pro.full_name} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                        {pro.is_verified && (
                                            <div className="absolute bottom-1 right-1 bg-primary text-white p-1 rounded-full border-2 border-white dark:border-card shadow-lg">
                                                <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="px-3 pb-4 pt-1 flex-1 flex flex-col text-center">
                                    <div className="flex-1">
                                        <h3 className="font-black text-xs md:text-sm text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                                            {pro.full_name}
                                        </h3>
                                        <p className="text-[9px] md:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-2 line-clamp-2 px-1">
                                            {pro.headline || pro.specialty}
                                        </p>
                                        
                                        {/* Connectivity Context (simulated) */}
                                        <div className="flex items-center justify-center gap-1.5 mb-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-4 h-4 rounded-full border border-white dark:border-card bg-slate-200" />
                                                <div className="w-4 h-4 rounded-full border border-white dark:border-card bg-slate-300" />
                                            </div>
                                            <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                {pro.connections_count || 0}+ connections
                                            </span>
                                        </div>
                                    </div>

                                    <Button 
                                        asChild
                                        className="w-full rounded-full h-8 md:h-9 bg-transparent hover:bg-primary/10 text-primary border-2 border-primary font-black uppercase tracking-widest text-[9px] transition-all"
                                    >
                                        <Link to={`/pro/profile/${pro.id}`}>Connect</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-slate-400 italic">
                            <p className="text-xs font-bold uppercase tracking-widest">No expert registered in this category yet.</p>
                        </div>
                    )}
                </div>
            </main>

        </div>
    );
};

export default Pros;
