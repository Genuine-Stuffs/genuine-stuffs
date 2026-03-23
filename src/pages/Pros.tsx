import { useState } from "react";
import { Search, MapPin, Star, ShieldCheck, Mail, Phone, ExternalLink, ShoppingBag, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const professionals = [
    {
        id: 1,
        name: "Engr. David Okon",
        role: "Civil Engineer",
        type: "professional",
        rating: 4.9,
        reviews: 24,
        location: "Lagos, Lekki",
        verified: true,
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Structural Design", "Site Supervision"],
        projects: 12,
    },
    {
        id: 2,
        name: "Arc. Sarah Yusuf",
        role: "Architect",
        type: "professional",
        rating: 4.8,
        reviews: 18,
        location: "Abuja, Wuse 2",
        verified: true,
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Modern Residential", "Interior Design"],
        projects: 8,
    },
    {
        id: 3,
        name: "QS Michael Chen",
        role: "Quantity Surveyor",
        type: "professional",
        rating: 4.7,
        reviews: 12,
        location: "Port Harcourt",
        verified: true,
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Cost Estimation", "BOQ Preparation"],
        projects: 15,
    },
    {
        id: 4,
        name: "Engr. Blessing Ade",
        role: "Electrical Engineer",
        type: "professional",
        rating: 4.9,
        reviews: 31,
        location: "Lagos, Ikeja",
        verified: true,
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Solar Installation", "Industrial Wiring"],
        projects: 22,
    },
    {
        id: 5,
        name: "Musa Ibrahim",
        role: "Master Mason",
        type: "artisan",
        rating: 4.9,
        reviews: 56,
        location: "Kano, Central",
        verified: true,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Bricklaying", "Plastering"],
        projects: 89,
    },
    {
        id: 6,
        name: "Chidi Okafor",
        role: "Lead Plumber",
        type: "artisan",
        rating: 4.8,
        reviews: 42,
        location: "Enugu, Independent Layout",
        verified: true,
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Pipe Fitting", "Drainage Systems"],
        projects: 124,
    }
];

const Pros = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("All Nigeria");
    const [activeType, setActiveType] = useState<"professional" | "artisan">("professional");
    const locations = [
        "All Nigeria", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
        "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", 
        "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", 
        "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
    ];

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

                                {/* Pro/Artisan Toggle */}
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
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Header Text (Adjusted) */}
                <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-2xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
                            Hire Certified <span className="text-primary italic">Professionals/Artisans</span>
                        </h1>
                    <p className="text-muted-foreground text-[10px] md:text-base font-medium max-w-2xl mx-auto italic leading-relaxed">
                        Find vetted experts to execute your construction projects with precision and integrity.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {professionals
                        .filter(pro => pro.type === activeType)
                        .filter(pro => 
                            pro.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            pro.role.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((pro) => (
                        <Card key={pro.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all group rounded-[2rem]">
                            <CardContent className="p-0">
                                <div className="p-6 text-center">
                                    <div className="relative w-24 h-24 mx-auto mb-4">
                                        <img 
                                            src={pro.image} 
                                            alt={pro.name} 
                                            className="w-full h-full object-cover rounded-[1.5rem] shadow-md group-hover:scale-105 transition-transform"
                                        />
                                        {pro.verified && (
                                            <div className="absolute -top-1 -right-1 bg-primary text-white p-1 rounded-full shadow-lg">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1">{pro.name}</h3>
                                    <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">{pro.role}</p>
                                    
                                    <div className="flex items-center justify-center gap-1 mb-4">
                                        <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                                        <span className="text-xs font-bold">{pro.rating}</span>
                                        <span className="text-[10px] text-slate-400">({pro.reviews} reviews)</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium mb-4">
                                        <MapPin className="w-3 h-3" />
                                        {pro.location}
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                                        {pro.specialties.map(spec => (
                                            <Badge key={spec} variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-slate-100 dark:bg-muted/50 border-none">
                                                {spec}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest">
                                            Profile
                                        </Button>
                                        <Button size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest bg-slate-900 dark:bg-primary/20">
                                            Contact
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Pros;
