import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Filter, Grid, List, ArrowUpDown, ShoppingCart, Info, Leaf, DollarSign, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "backend/supabaseClient";
import type { Database } from "backend/types";

type MaterialRow = Database['public']['Tables']['materials']['Row'];

const Marketplace = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"grid-4" | "grid-5" | "list">("grid-4");
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });

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
        <div className="min-h-screen bg-slate-50/30">
            <Navbar />
            <div className="bg-white border-b sticky top-20 z-30 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex-1 w-full">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                className="bg-transparent border-none focus:ring-0 w-full text-slate-700 font-bold placeholder:font-medium placeholder:text-slate-400"
                                placeholder="Search everything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20">Search</Button>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100"><User className="w-5 h-5 text-slate-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100"><ShoppingCart className="w-5 h-5 text-slate-400" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-72 flex-shrink-0 space-y-10">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Filter Categories
                            </h4>
                            <ul className="space-y-3">
                                {categories.map(cat => (
                                    <li key={cat}>
                                        <button
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`text-sm font-bold transition-colors block w-full text-left py-1 ${selectedCategory === cat ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            {cat} <span className="text-[10px] ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                                                ({cat === "All" ? dbMaterials.length : dbMaterials.filter(m => m.category === cat).length})
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-10 border-t border-slate-100">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Price Range (₦)
                            </h4>
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Min"
                                    type="number"
                                    value={priceRange.min}
                                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                    className="h-10 text-sm font-bold border-slate-200 rounded-lg"
                                />
                                <span className="text-slate-300">—</span>
                                <Input
                                    placeholder="Max"
                                    type="number"
                                    value={priceRange.max}
                                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                    className="h-10 text-sm font-bold border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                <h1 className="text-2xl font-black text-slate-900">
                                    {selectedCategory === "All" ? "All Materials" : selectedCategory}
                                    <span className="ml-3 text-sm font-medium text-slate-400">({filteredMaterials.length} items)</span>
                                </h1>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                                    <Button
                                        variant={viewMode === "grid-4" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("grid-4")}
                                        className="h-8 w-8 p-0 rounded-md"
                                    >
                                        <Grid className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("list")}
                                        className="h-8 w-8 p-0 rounded-md"
                                    >
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg font-bold">
                                    <ArrowUpDown className="w-4 h-4" /> Sort by: Newest
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
                            <div className={viewMode === "list" ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"}>
                                {filteredMaterials.map((m) => (
                                    <Card key={m.id} className="group overflow-hidden border-slate-100 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl flex flex-col h-full bg-white">
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            <img
                                                src={m.image_url || "/images/materials/cement.png"}
                                                alt={m.name}
                                                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute top-3 right-3 flex flex-col gap-2">
                                                <Badge className="bg-white/90 backdrop-blur text-slate-900 border-none font-black text-[10px] uppercase shadow-sm">
                                                    {m.category}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-5 flex-grow">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-black text-lg text-slate-900 leading-tight group-hover:text-primary transition-colors">{m.name}</h3>
                                            </div>
                                            <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed font-medium">{m.description}</p>
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-400 mb-4 bg-slate-50 p-2 rounded-lg">
                                                <User className="w-3.5 h-3.5" />
                                                {m.vendor_name || "Verified Vendor"}
                                            </div>
                                            <div className="flex justify-between items-end mt-auto">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Price starting at</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-slate-900">₦{Number(m.price).toLocaleString()}</span>
                                                        <span className="text-xs font-bold text-slate-400">/{m.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-5 pt-0">
                                            <Button className="w-full bg-slate-900 hover:bg-primary text-white font-black h-11 rounded-xl transition-all shadow-lg hover:shadow-primary/20 group/btn">
                                                Add to Project <ShoppingCart className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
                                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Search className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">No materials found</h3>
                                <p className="text-slate-500 font-medium italic">Try adjusting your search or filters to find what you need.</p>
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
