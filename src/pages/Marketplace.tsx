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
import { Phone, MessageCircle, ShieldAlert, CheckCircle2, Search, Filter, Grid, List, ArrowUpDown, ShoppingBag, ShoppingCart, Info, Leaf, DollarSign, User, Loader2, SlidersHorizontal, ExternalLink, MapPin, History, ArrowRight, ChevronDown } from "lucide-react";
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
        if (!user || !selectedMaterial || role !== 'professional') return;

        try {
            await supabase.from('pro_interactions').insert({
                pro_id: user.id,
                material_id: selectedMaterial.id,
                vendor_id: selectedMaterial.vendor_id,
                event_type: type
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

            // Temporary local asset mapping to override remote database URLs until seed is re-run
            const assetMap: Record<string, string> = {
                "Plumbing Network Pipes": "/images/materials/plumbing_pipes.png",
                "Coleman Copper Cable (1.5mm)": "/images/materials/copper_cables.png",
                "Polished Granite Slabs": "/images/materials/granite_slabs.png",
                "Longspan Aluminum Roofing (0.55mm)": "/images/materials/roofing_sheets.png",
                "Vitrified Floor Tiles (60x60)": "/images/materials/floor_tiles.png",
                "Premium Wall Paint (White)": "/images/materials/dulux_paint.png",
                "Reinforcement Steel (12mm)": "/images/materials/steel_rebars.png",
                "Portland Cement (Dangote)": "/images/materials/cement_bags.png",
            };

            const mappedData = (data || []).map(m => ({
                ...m,
                image_url: assetMap[m.name] || m.image_url,
                // Also update price for Dangote Cement if found
                price: m.name === "Portland Cement (Dangote)" ? 10450 : m.price
            }));

            return mappedData;
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

    const [location, setLocation] = useState("All Nigeria");
    const locations = ["All Nigeria", "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu"];

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />
            <div className="bg-primary pt-4 pb-6 sticky top-16 md:top-20 z-30 shadow-lg transition-all duration-300 overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="text-white text-center mb-1">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter flex items-center justify-center gap-2">
                                <ShoppingBag className="w-5 h-5" /> What are you looking for?
                            </h2>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-1.5 flex flex-col md:flex-row gap-1.5 shadow-2xl items-stretch">
                            {/* Location Picker */}
                            <div className="relative flex-shrink-0 min-w-[140px] md:border-r border-slate-100">
                                <select 
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full h-11 md:h-12 pl-10 pr-4 bg-transparent text-sm font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                                >
                                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <input
                                    className="w-full h-11 md:h-12 pl-10 pr-4 bg-transparent border-none focus:ring-0 text-sm md:text-base text-slate-700 font-bold placeholder:font-medium placeholder:text-slate-400"
                                    placeholder="I am looking for..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>

                            {/* Search Icon Button */}
                            <Button className="h-11 md:h-12 w-11 md:w-12 p-0 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0 shadow-md">
                                <Search className="w-5 h-5 text-white" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {/* Unified Toolbar */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                    {/* Category dropdown */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-w-[120px]"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat} ({cat === "All" ? dbMaterials.length : dbMaterials.filter(m => m.category === cat).length})
                            </option>
                        ))}
                    </select>

                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl font-bold uppercase tracking-wider text-[10px] dark:border-white/10 shrink-0">
                        <ArrowUpDown className="w-3.5 h-3.5" /> Sort
                    </Button>

                    <div className="flex bg-slate-100 dark:bg-card p-1 rounded-xl border dark:border-white/5 shrink-0 ml-auto gap-1">
                        <Button variant={!(viewMode === "list" || mobileView === "list") ? "secondary" : "ghost"} size="sm" onClick={() => { setViewMode("grid-4"); setMobileView("grid"); }} className="h-7 w-7 p-0 rounded-lg">
                            <Grid className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant={(viewMode === "list" || mobileView === "list") ? "secondary" : "ghost"} size="sm" onClick={() => { setViewMode("list"); setMobileView("list"); }} className="h-7 w-7 p-0 rounded-lg">
                            <List className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Mobile filter sheet */}
                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="md:hidden h-9 w-9 p-0 rounded-xl dark:border-border shrink-0">
                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[80vh] dark:bg-background border-t-primary/20">
                            <SheetHeader className="pb-6 border-b dark:border-border">
                                <SheetTitle className="font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Filter className="w-4 h-4" /> Refine Marketplace
                                </SheetTitle>
                                <SheetDescription className="italic">Adjust filters to find specific materials.</SheetDescription>
                            </SheetHeader>
                            <div className="py-8 space-y-8 overflow-y-auto h-full">
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Categories</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <Button
                                                key={cat}
                                                variant={selectedCategory === cat ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => { setSelectedCategory(cat); setIsFilterOpen(false); }}
                                                className={`rounded-full h-8 px-4 text-[10px] font-semibold uppercase tracking-wider ${selectedCategory === cat ? 'bg-primary text-white shadow-md' : 'dark:border-white/10 dark:text-slate-400'}`}
                                            >
                                                {cat}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Budget Range (₦)</h4>
                                    <div className="flex gap-3 items-center">
                                        <Input placeholder="Min" type="number" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))} className="h-10 bg-slate-50 dark:bg-muted/20 border-none rounded-xl font-medium" />
                                        <Input placeholder="Max" type="number" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))} className="h-10 bg-slate-50 dark:bg-muted/20 border-none rounded-xl font-medium" />
                                    </div>
                                </div>
                                <Button className="w-full h-12 rounded-2xl bg-primary font-semibold uppercase tracking-wider shadow-lg" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="font-medium text-slate-400">Fetching verified materials...</p>
                    </div>
                ) : materialsError ? (
                    <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center">
                        <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-red-900 mb-2">Connection Error</h3>
                        <p className="text-red-600 font-medium">We couldn't reach the construction database. Please check your connection.</p>
                    </div>
                ) : filteredMaterials.length > 0 ? (
                    <div className={viewMode === "list" || mobileView === "list" 
                        ? "flex flex-col gap-2" 
                        : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4"}>
                        {filteredMaterials.map((m) => {
                            const isList = viewMode === "list" || mobileView === "list";
                            
                            return (
                                <Card
                                    key={m.id}
                                    className={`group overflow-hidden border border-slate-100 dark:border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl bg-white dark:bg-card shadow-sm cursor-pointer ${isList ? 'flex flex-row h-32 md:h-44' : 'flex flex-col h-full'}`}
                                    onClick={() => {
                                        setSelectedMaterial(m);
                                        setShowContact(false);
                                        incrementViewCount(m);
                                    }}
                                >
                                    {/* Image Section */}
                                    <div className={`relative overflow-hidden bg-slate-50 dark:bg-slate-800 ${isList ? 'w-1/3 md:w-48 h-full shrink-0' : 'aspect-[4/3] w-full'}`}>
                                        <img
                                            src={m.image_url || "/images/materials/cement.png"}
                                            alt={m.name}
                                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                        />
                                        {!isList && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <Badge className="bg-white/95 dark:bg-background/95 text-slate-900 dark:text-white border-none font-bold text-[8px] uppercase shadow-md px-1.5 py-1">
                                                    {m.category.split(' ')[0]}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className={`flex flex-col p-3 md:p-4 flex-1 min-w-0 ${isList ? 'justify-center' : 'gap-1'}`}>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`${isList ? 'text-base md:text-xl' : 'text-sm md:text-lg'} font-black text-primary`}>₦{Number(m.price).toLocaleString()}</span>
                                                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tight">/{m.unit || "unit"}</span>
                                            </div>
                                            <h3 className={`font-bold ${isList ? 'text-xs md:text-base' : 'text-[11px] md:text-sm'} text-slate-800 dark:text-slate-200 leading-tight line-clamp-2`}>{m.name}</h3>
                                        </div>

                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] md:text-xs text-slate-500 font-medium">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="truncate">Lagos, Ikeja</span>
                                            </div>
                                            {isList && (
                                                <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400">
                                                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 rounded-md border-slate-200">Verified ID</Badge>
                                                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 rounded-md border-slate-200">3+ Years</Badge>
                                                </div>
                                            )}
                                        </div>

                                        {!isList && (
                                            <Button
                                                className="mt-3 w-full bg-slate-50 dark:bg-muted/30 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 font-black h-8 md:h-9 rounded-xl transition-all text-[9px] uppercase tracking-[0.1em]"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMaterial(m);
                                                    incrementViewCount(m);
                                                }}
                                            >
                                                Details
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {isList && (
                                        <div className="p-3 self-center hidden md:block">
                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                                                <ArrowRight className="w-5 h-5 text-primary" />
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-card border-2 border-dashed border-slate-200 dark:border-border rounded-2xl p-16 text-center transition-colors">
                                <div className="w-16 h-16 bg-white dark:bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border dark:border-border">
                                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No materials found</h3>
                                <p className="text-slate-500 dark:text-slate-500 font-normal text-sm">Try adjusting your search or filters.</p>
                            </div>
                        )}
            </div>
            {/* Product Detail Modal (Jiji Style) */}
            <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-card border-none rounded-[2rem] shadow-3xl">
                    {selectedMaterial && (
                        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto md:overflow-hidden">
                            {/* Left Side: Images */}
                            <div className="md:w-3/5 bg-slate-100 dark:bg-background relative">
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

                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-border">
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
                <DialogContent className="max-w-md p-0 rounded-[2rem] overflow-hidden border-none shadow-3xl bg-white dark:bg-background transition-colors">
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
                                        className="w-full text-left p-4 rounded-xl border border-slate-100 dark:border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between group"
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
