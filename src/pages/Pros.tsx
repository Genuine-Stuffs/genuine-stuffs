import { useState } from "react";
import { Search, MapPin, Star, ShieldCheck, Mail, Phone, ExternalLink, ShoppingBag, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
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
    },
    {
        id: 7,
        name: "Engr. Nnamdi Azu",
        role: "Structural Engineer",
        type: "professional",
        rating: 4.9,
        reviews: 35,
        location: "Owerri, Imo State",
        verified: true,
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Building Design", "Material Testing"],
        projects: 42,
    },
    {
        id: 8,
        name: "Amina Bello",
        role: "Interior Decorator",
        type: "professional",
        rating: 4.7,
        reviews: 28,
        location: "Kaduna, GRA",
        verified: true,
        image: "/images/pros/amina_bello.png",
        specialties: ["Space Planning", "Color Theory"],
        projects: 15,
    },
    {
        id: 9,
        name: "Samuel Etim",
        role: "Senior Carpenter",
        type: "artisan",
        rating: 4.8,
        reviews: 64,
        location: "Uyo, Akwa Ibom",
        verified: true,
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Roofing Woodwork", "Furniture"],
        projects: 215,
    },
    {
        id: 10,
        name: "Tunde Balogun",
        role: "Pro Painter",
        type: "artisan",
        rating: 4.9,
        reviews: 82,
        location: "Lagos, Surulere",
        verified: true,
        image: "https://images.unsplash.com/photo-1544168190-79c17527004f?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Exterior Painting", "Wall Mural"],
        projects: 145,
    },
    {
        id: 11,
        name: "Kelechi Iheanacho",
        role: "Solar Technician",
        type: "professional",
        rating: 4.8,
        reviews: 19,
        location: "Enugu, State",
        verified: true,
        image: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Inverter Setup", "Battery Maintenance"],
        projects: 31,
    },
    {
        id: 12,
        name: "Mary Odogwu",
        role: "Real Estate Consultant",
        type: "professional",
        rating: 4.9,
        reviews: 47,
        location: "Abuja, Maitama",
        verified: true,
        image: "/images/pros/mary_odogwu.png",
        specialties: ["Property Valuation", "Legal Advisor"],
        projects: 68,
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
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {professionals
                        .filter(pro => pro.type === activeType)
                        .filter(pro => 
                            pro.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            pro.role.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((pro) => (
                        <Card key={pro.id} className="group relative bg-white dark:bg-card border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden flex flex-col h-full">
                            {/* Card Header / Cover Image */}
                            <div className="relative h-20 md:h-24 overflow-hidden">
                                <img 
                                    src={`https://images.unsplash.com/photo-${pro.type === 'professional' ? '1486406146926-c627a92ad1ab' : '1504307651254-35680f356dfd'}?q=80&w=400&auto=format&fit=crop`}
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
                                            src={pro.image} 
                                            alt={pro.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    {pro.verified && (
                                        <div className="absolute bottom-1 right-1 bg-primary text-white p-1 rounded-full border-2 border-white dark:border-card shadow-lg">
                                            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <CardContent className="px-3 pb-4 pt-1 flex-1 flex flex-col text-center">
                                <div className="flex-1">
                                    <h3 className="font-black text-xs md:text-sm text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                                        {pro.name}
                                    </h3>
                                    <p className="text-[9px] md:text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mb-2 line-clamp-2 px-1">
                                        {pro.role} | {pro.specialties[0]} Expert
                                    </p>
                                    
                                    {/* Connectivity Context (simulated) */}
                                    <div className="flex items-center justify-center gap-1.5 mb-3">
                                        <div className="flex -space-x-2">
                                            <div className="w-4 h-4 rounded-full border border-white dark:border-card bg-slate-200" />
                                            <div className="w-4 h-4 rounded-full border border-white dark:border-card bg-slate-300" />
                                        </div>
                                        <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                            {pro.reviews}+ projects completed
                                        </span>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full rounded-full h-8 md:h-9 bg-transparent hover:bg-primary/10 text-primary border-2 border-primary font-black uppercase tracking-widest text-[9px] transition-all"
                                >
                                    Connect
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

        </div>
    );
};

export default Pros;
