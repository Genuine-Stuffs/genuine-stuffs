import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Phone, MessageCircle, ShieldAlert, CheckCircle2, Search, Filter, Grid, List, ArrowUpDown, ShoppingCart, Info, Leaf, DollarSign, User, Loader2, SlidersHorizontal, ExternalLink, MapPin, History, ArrowRight } from "lucide-react";
import { supabase } from "backend/supabaseClient";
import type { Database } from "backend/types";
import { useAuth } from "@/context/AuthContext";

type MaterialRow = Database['public']['Tables']['materials']['Row'];

const Marketplace = () => {
    const { user, role } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"grid-4" | "grid-5" | "list">("grid-4");
    const [mobileView, setMobileView] = useState<"grid" | "list">("grid");
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
    const [showContact, setShowContact] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [reportStatus, setReportStatus] = useState<"idle" | "submitting" | "success">("idle");

    const logInteraction = async (type: 'phone_reveal' | 'whatsapp_chat') => {
        if (!user || !selectedMaterial || role !== 'pro') return;

        try {
            await supabase.from('pro_interactions').insert({
                pro_id: user.id,
                material_id: selectedMaterial.id,
                vendor_id: selectedMaterial.vendor_id,
                interaction_type: type
            });
        } catch (err) {
            console.error("Log failed:", err);
        }
    };

    const incrementViewCount = async (m: any) => {
        if (!m) return;
        try {
            // Using RPC for atomic increment if available, else just a direct update
            const { error } = await supabase.rpc('increment_material_views', { material_id: m.id });
            if (error) {
                // Fallback direct update
                await supabase.from('materials').update({ views_count: (m.views_count || 0) + 1 }).eq('id', m.id);
            }
        } catch (err) {
            console.error("View increment failed:", err);
        }
    };

    const handleReport = async (reason: string) => {
        if (!selectedMaterial) return;
        setReportStatus("submitting");
        try {
            await supabase.from('listing_reports').insert({
                material_id: selectedMaterial.id,
                reporter_id: user?.id,
                reason: reason
            });
            setReportStatus("success");
            setTimeout(() => {
                setIsReporting(false);
                setReportStatus("idle");
            }, 2000);
        } catch (err) {
            console.error("Report failed:", err);
            setReportStatus("idle");
        }
    };

    const { data: dbMaterials = [], isLoading, error: materialsError } = useQuery<any[]>({
        queryKey: ['materials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('is_verified', true);
            if (error) throw error;
            return data || [];
        }
    });

    const { data: vendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendors')
                .select('id, phone');
            if (error) throw error;
            return data || [];
        }
    });

    const materialsWithVendors = useMemo(() => {
        return dbMaterials.map(m => ({
            ...m,
            vendor: vendors.find(v => v.id === m.vendor_id)
        }));
    }, [dbMaterials, vendors]);

    const categories = ["All", ...Array.from(new Set(dbMaterials.map(m => m.category)))];

    const filteredMaterials = useMemo(() => {
        return materialsWithVendors.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (m.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;

            const price = Number(m.price);
            const matchesPrice = (!priceRange.min || price >= Number(priceRange.min)) &&
                (!priceRange.max || price <= Number(priceRange.max));

            return matchesSearch && matchesCategory && matchesPrice;
        });
    }, [searchQuery, selectedCategory, priceRange, dbMaterials]);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />
            <div className="bg-white dark:bg-slate-950/50 backdrop-blur-md border-b dark:border-white/10 sticky top-16 md:top-20 z-30 shadow-sm transition-all duration-300">
                <div className="container mx-auto px-4 py-3 md:py-4">
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center">
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 flex-1 w-full transition-colors duration-300">
                            <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                            <input
                                className="bg-transparent border-none focus:ring-0 w-full text-sm md:text-base text-slate-700 dark:text-slate-100 font-bold placeholder:font-medium placeholder:text-slate-400"
                                placeholder="Search materials..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button className="flex-1 md:flex-none h-10 md:h-11 px-6 md:px-8 rounded-xl bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20 text-xs md:text-sm">Search</Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors"><User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors"><ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /></Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Sidebar Filters - Desktop Only */}
                    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-10">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Filter Categories
                            </h4>
                            <ul className="space-y-3">
                                {categories.map(cat => (
                                    <li key={cat}>
                                        <button
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`text-sm font-black uppercase tracking-widest transition-all block w-full text-left py-2 px-3 rounded-lg border border-transparent ${selectedCategory === cat ? 'text-primary bg-primary/5 border-primary/20 shadow-lg shadow-primary/5' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white dark:hover:bg-white/5'}`}
                                        >
                                            {cat} <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-md transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500'}`}>
                                                {cat === "All" ? dbMaterials.length : dbMaterials.filter(m => m.category === cat).length}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-10 border-t border-slate-100 dark:border-white/10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Price Range (₦)
                            </h4>
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Min"
                                    type="number"
                                    value={priceRange.min}
                                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                    className="h-10 text-sm font-bold border-slate-200 dark:border-white/10 dark:bg-card rounded-lg"
                                />
                                <span className="text-slate-300 dark:text-slate-700">—</span>
                                <Input
                                    placeholder="Max"
                                    type="number"
                                    value={priceRange.max}
                                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                    className="h-10 text-sm font-bold border-slate-200 dark:border-white/10 dark:bg-card rounded-lg"
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="hidden md:block w-1.5 h-6 bg-primary rounded-full"></div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {selectedCategory === "All" ? "Construction Hub" : selectedCategory}
                                    <span className="ml-3 text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 normal-case italic">({filteredMaterials.length} results)</span>
                                </h1>
                            </div>
                            <div className="flex items-center justify-between w-full md:w-auto gap-3">
                                <div className="flex bg-slate-100 dark:bg-card p-1 rounded-xl border dark:border-white/5 transition-colors">
                                    <Button
                                        variant={viewMode === "grid-4" || mobileView === "grid" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => {
                                            setViewMode("grid-4");
                                            setMobileView("grid");
                                        }}
                                        className="h-9 w-9 md:h-8 md:w-8 p-0 rounded-lg"
                                    >
                                        <Grid className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" || mobileView === "list" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => {
                                            setViewMode("list");
                                            setMobileView("list");
                                        }}
                                        className="h-9 w-9 md:h-8 md:w-8 p-0 rounded-lg"
                                    >
                                        <List className="w-4 h-4" />
                                    </Button>
                                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                        <SheetTrigger asChild>
                                            <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9 p-0 rounded-lg">
                                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[80vh] dark:bg-slate-900 border-t-primary/20">
                                            <SheetHeader className="pb-6 border-b dark:border-white/10">
                                                <SheetTitle className="font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <Filter className="w-4 h-4" /> Refine Marketplace
                                                </SheetTitle>
                                                <SheetDescription className="italic">Adjust filters to find specific materials.</SheetDescription>
                                            </SheetHeader>
                                            <div className="py-8 space-y-10 overflow-y-auto h-full">
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Categories</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {categories.map(cat => (
                                                            <Button
                                                                key={cat}
                                                                variant={selectedCategory === cat ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCategory(cat);
                                                                    setIsFilterOpen(false);
                                                                }}
                                                                className={`rounded-full h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'dark:border-white/10 dark:text-slate-400'}`}
                                                            >
                                                                {cat}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Budget Range (₦)</h4>
                                                    <div className="flex gap-3 items-center">
                                                        <Input
                                                            placeholder="Min"
                                                            type="number"
                                                            value={priceRange.min}
                                                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                                            className="h-12 bg-slate-50 dark:bg-white/5 border-none rounded-2xl font-bold"
                                                        />
                                                        <Input
                                                            placeholder="Max"
                                                            type="number"
                                                            value={priceRange.max}
                                                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                                            className="h-12 bg-slate-50 dark:bg-white/5 border-none rounded-2xl font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] dark:border-white/10">
                                    <ArrowUpDown className="w-3.5 h-3.5" /> Sort
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="font-bold text-slate-400 italic">Authenticating and fetching verified materials...</p>
                            </div>
                        ) : materialsError ? (
                            <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center">
                                <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-red-900 mb-2">Connection Error</h3>
                                <p className="text-red-600 font-medium italic">We couldn't reach the construction database. Please check your connection.</p>
                            </div>
                        ) : filteredMaterials.length > 0 ? (
                            <div className={viewMode === "list" || mobileView === "list" ? "space-y-4" : "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6"}>
                                {filteredMaterials.map((m) => (
                                    <Card
                                        key={m.id}
                                        className="group overflow-hidden border border-slate-200 dark:border-white/10 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary-glow))] transition-all duration-500 rounded-3xl flex flex-col h-full bg-white dark:bg-card shadow-sm cursor-pointer"
                                        onClick={() => {
                                            setSelectedMaterial(m);
                                            setShowContact(false);
                                            incrementViewCount(m);
                                        }}
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            <img
                                                src={m.image_url || "/images/materials/cement.png"}
                                                alt={m.name}
                                                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/40 transition-all duration-500" />
                                            <div className="absolute top-2 right-2 md:top-3 md:right-3 flex flex-col gap-2 z-10">
                                                <Badge className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white border-none font-black text-[8px] md:text-[10px] uppercase shadow-xl px-2.5 py-1">
                                                    {m.category.split(' ')[0]}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-3 md:p-5 flex-grow">
                                            <div className="flex items-center gap-2 text-[8px] md:text-xs font-black text-slate-400 dark:text-slate-500 mb-2 md:mb-3 bg-slate-50 dark:bg-white/5 p-1 px-2 md:p-2 rounded-lg transition-colors truncate">
                                                <User className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                <span className="truncate">{m.vendor_name || "Verified Vendor"}</span>
                                                {m.is_verified && <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary ml-auto" />}
                                            </div>
                                            <h3 className="font-black text-xs md:text-lg text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight mb-2">{m.name}</h3>
                                            <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed font-medium">{m.description}</p>

                                            <div className="flex items-baseline gap-1 mt-auto">
                                                <span className="text-xs md:text-lg font-black text-slate-900 dark:text-white">₦{Number(m.price).toLocaleString()}</span>
                                                <span className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">/{m.unit || "unit"}</span>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-3 md:p-5 pt-0">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMaterial(m);
                                                    incrementViewCount(m);
                                                }}
                                                className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-primary text-white font-black h-8 md:h-10 rounded-xl transition-all shadow-lg hover:shadow-primary/20 group/btn text-[9px] md:text-xs uppercase tracking-widest"
                                            >
                                                Details <ExternalLink className="ml-2 w-3 h-3 md:w-3.5 md:h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-card border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center transition-colors">
                                <div className="w-20 h-20 bg-white dark:bg-black/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border dark:border-white/5">
                                    <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No materials found</h3>
                                <p className="text-slate-500 dark:text-slate-500 font-medium italic">Try adjusting your search or filters to find what you need.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Product Detail Modal (Jiji Style) */}
            <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-card border-none rounded-[2rem] shadow-3xl">
                    {selectedMaterial && (
                        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto md:overflow-hidden">
                            {/* Left Side: Images */}
                            <div className="md:w-3/5 bg-slate-100 dark:bg-slate-900 relative">
                                <img
                                    src={selectedMaterial.image_url || "/images/materials/cement.png"}
                                    alt={selectedMaterial.name}
                                    className="w-full h-full object-cover min-h-[300px] md:min-h-0"
                                />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <Badge className="bg-primary text-white font-black px-3 py-1 uppercase tracking-widest border-none text-[10px]">
                                        {selectedMaterial.availability}
                                    </Badge>
                                    {selectedMaterial.is_verified && (
                                        <Badge className="bg-green-600 text-white font-black px-3 py-1 uppercase tracking-widest border-none text-[10px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Details & Contact */}
                            <div className="md:w-2/5 p-6 md:p-8 flex flex-col h-full bg-white dark:bg-card">
                                <div className="flex-grow">
                                    <div className="flex items-center justify-between gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            {selectedMaterial.vendor_name || "Official Partner"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            <button onClick={() => setIsReporting(true)} className="hover:text-red-500 transition-colors uppercase">Report</button>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight uppercase tracking-tight">
                                        {selectedMaterial.name}
                                    </h2>
                                    <div className="text-3xl font-black text-primary mb-6">
                                        ₦{Number(selectedMaterial.price).toLocaleString()}
                                        <span className="text-sm text-slate-400 font-bold ml-1 uppercase">/{selectedMaterial.unit}</span>
                                    </div>

                                    <div className="space-y-6 mb-8">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Description</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {selectedMaterial.description || "No full description provided by vendor."}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-3 mb-3 text-slate-900 dark:text-white">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-black uppercase tracking-widest">Ships Nationally</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                                                <Leaf className="w-4 h-4 text-green-500" />
                                                <span className="text-xs font-black uppercase tracking-widest">CO2: {selectedMaterial.co2_footprint || "Not Rated"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Area */}
                                <div className="space-y-3 mt-auto pt-6 border-t dark:border-white/5">
                                    <Button
                                        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
                                        onClick={() => {
                                            const nextState = !showContact;
                                            setShowContact(nextState);
                                            if (nextState) logInteraction('phone_reveal');
                                        }}
                                    >
                                        <Phone className="w-5 h-5" />
                                        {showContact ? (selectedMaterial as any).vendor?.phone || "0803 123 4567" : "SHOW CONTACT"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-2 border-green-600/50 hover:bg-green-600 hover:text-white text-green-600 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                                        onClick={() => logInteraction('whatsapp_chat')}
                                        asChild
                                    >
                                        <a
                                            href={`https://wa.me/${((selectedMaterial as any).vendor?.phone || "2348031234567").replace(/\D/g, '')}?text=Hi,%20I'm%20interested%20in%20${encodeURIComponent(selectedMaterial.name)}%20on%20Genuine%20Stuffs.`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MessageCircle className="w-5 h-5" /> START CHAT
                                        </a>
                                    </Button>

                                    {/* Safety Tips */}
                                    <div className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                                        <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-[9px] font-bold text-orange-600/80 uppercase leading-relaxed tracking-tighter">
                                            Safety Tip: Meet in public, verify material quality on delivery, and never make advance payments before inspection.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Report Dialog */}
            <Dialog open={isReporting} onOpenChange={setIsReporting}>
                <DialogContent className="max-w-md p-0 rounded-[2rem] overflow-hidden border-none shadow-3xl bg-white dark:bg-slate-900 transition-colors">
                    {reportStatus === "success" ? (
                        <div className="p-12 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Report Received</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Our moderation team will review this listing shortly. Thank you for keeping the marketplace safe.</p>
                        </div>
                    ) : (
                        <div className="p-8">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-3">
                                <ShieldAlert className="w-6 h-6 text-red-500" /> Report Listing
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium italic">Why are you reporting this material?</p>

                            <div className="space-y-3 mb-8">
                                {[
                                    "Incorrect Information",
                                    "Prohibited Item",
                                    "Suspicious Vendor",
                                    "Quality Issues",
                                    "Duplicate Listing"
                                ].map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => handleReport(reason)}
                                        disabled={reportStatus === "submitting"}
                                        className="w-full text-left p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between group"
                                    >
                                        {reason}
                                        {reportStatus === "submitting" ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                onClick={() => setIsReporting(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
};

export default Marketplace;
