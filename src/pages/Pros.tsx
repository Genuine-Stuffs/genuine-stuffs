import { useState } from "react";
import { Search, MapPin, Star, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";
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
        rating: 4.9,
        reviews: 31,
        location: "Lagos, Ikeja",
        verified: true,
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&h=100&auto=format&fit=crop",
        specialties: ["Solar Installation", "Industrial Wiring"],
        projects: 22,
    }
];

const Pros = () => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            
            <main className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
                        Hire Certified <span className="text-primary italic">Professionals</span>
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base font-medium max-w-2xl mx-auto italic">
                        Find vetted experts to execute your construction projects with precision and integrity.
                    </p>
                </div>

                {/* Search / Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input 
                            className="h-12 pl-12 rounded-2xl border-slate-200 dark:border-border font-medium"
                            placeholder="Search by role or name (e.g. Architect, Lagos)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 font-bold uppercase tracking-widest text-xs">
                        Find Experts
                    </Button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {professionals.map((pro) => (
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
