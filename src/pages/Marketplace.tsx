import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Filter, Grid, List, ArrowUpDown, ShoppingCart, Info, Leaf, DollarSign, User, Loader2, SlidersHorizontal } from "lucide-react";
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
import { supabase } from "backend/supabaseClient";
import type { Database } from "backend/types";

type MaterialRow = Database['public']['Tables']['materials']['Row'];

const Marketplace = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"grid-4" | "grid-5" | "list">("grid-4");
    const [mobileView, setMobileView] = useState<"grid" | "list">("grid");
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const { data: dbMaterials = [], isLoading, error } = useQuery<MaterialRow[]>({
        queryKey: ['materials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('is_verified', true);
            if (error) throw error;
            return (data as MaterialRow[]) || [];
        }
    });

    const categories = ["All", ...Array.from(new Set(dbMaterials.map(m => m.category)))];

    const filteredMaterials = useMemo(() => {
        return dbMaterials.filter(m => {
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
                                            className={`text-sm font-bold transition-colors block w-full text-left py-1 ${selectedCategory === cat ? 'text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                        >
                                            {cat} <span className="text-[10px] ml-1 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500">
                                                ({cat === "All" ? dbMaterials.length : dbMaterials.filter(m => m.category === cat).length})
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
                        ) : error ? (
                            <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center">
                                <Info className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-red-900 mb-2">Connection Error</h3>
                                <p className="text-red-600 font-medium italic">We couldn't reach the construction database. Please check your connection.</p>
                            </div>
                        ) : filteredMaterials.length > 0 ? (
                            <div className={viewMode === "list" || mobileView === "list" ? "space-y-4" : "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6"}>
                                {filteredMaterials.map((m) => (
                                    <Card key={m.id} className="group overflow-hidden border-slate-100 dark:border-white/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl flex flex-col h-full bg-white dark:bg-card shadow-sm transition-colors">
                                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-black/20">
                                            <img
                                                src={m.image_url || "/images/materials/cement.png"}
                                                alt={m.name}
                                                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute top-2 right-2 md:top-3 md:right-3 flex flex-col gap-2">
                                                <Badge className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-slate-900 dark:text-white border-none font-black text-[8px] md:text-[10px] uppercase shadow-sm px-2 py-0.5">
                                                    {m.category.split(' ')[0]}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-3 md:p-5 flex-grow">
                                            <div className="flex justify-between items-start mb-2 md:mb-3">
                                                <h3 className="font-black text-sm md:text-lg text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-1 truncate uppercase tracking-tight">{m.name}</h3>
                                            </div>
                                            <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed font-medium">{m.description}</p>
                                            <div className="flex items-center gap-2 text-[8px] md:text-xs font-black text-slate-400 dark:text-slate-500 mb-3 md:mb-4 bg-slate-50 dark:bg-white/5 p-1.5 md:p-2 rounded-lg transition-colors truncate">
                                                <User className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                                                <span className="truncate">{m.vendor_name || "Verified Vendor"}</span>
                                            </div>
                                            <div className="flex justify-between items-end mt-auto">
                                                <div>
                                                    <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-0.5">Price</span>
                                                    <div className="flex items-baseline gap-0.5 md:gap-1">
                                                        <span className="text-sm md:text-2xl font-black text-slate-900 dark:text-white">₦{Number(m.price).toLocaleString()}</span>
                                                        <span className="text-[8px] md:text-xs font-bold text-slate-400 dark:text-slate-500">/{m.unit.split(' ')[0]}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-3 md:p-5 pt-0">
                                            <Button className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-primary text-white font-black h-9 md:h-11 rounded-xl transition-all shadow-lg hover:shadow-primary/20 group/btn text-[10px] md:text-sm uppercase tracking-widest md:tracking-normal">
                                                Add <ShoppingCart className="ml-2 w-3 h-3 md:w-4 md:h-4 group-hover/btn:translate-x-1 transition-transform" />
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
            <Footer />
        </div>
    );
};

export default Marketplace;
