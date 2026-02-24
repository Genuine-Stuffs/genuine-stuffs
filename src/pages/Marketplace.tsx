import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Filter, Grid, List, ArrowUpDown, ShoppingCart, Info, Leaf, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { materials, Material } from "@/data/materials";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Marketplace = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"grid-4" | "grid-5" | "list">("grid-4");
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });

    const categories = ["All", ...Array.from(new Set(materials.map(m => m.category)))];

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.vendor.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;

            const price = Number(m.price);
            const matchesPrice = (!priceRange.min || price >= Number(priceRange.min)) &&
                (!priceRange.max || price <= Number(priceRange.max));

            return matchesSearch && matchesCategory && matchesPrice;
        });
    }, [searchQuery, selectedCategory, priceRange]);

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
                                                ({cat === "All" ? materials.length : materials.filter(m => m.category === cat).length})
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
                            <Button
                                size="sm"
                                className="w-full mt-4 rounded-lg font-bold"
                                onClick={() => { }}
                            >
                                Apply Filter
                            </Button>
                        </div>
                    </aside>

                    {/* Main Results */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{filteredMaterials.length} Results Found</p>
                                <h2 className="text-2xl font-black text-slate-900 capitalize">
                                    {selectedCategory === "All" ? "Every Verified Material" : selectedCategory}
                                </h2>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                                    {[
                                        { id: "grid-4", icon: Grid },
                                        { id: "list", icon: List }
                                    ].map(v => (
                                        <Button
                                            key={v.id}
                                            variant="ghost"
                                            size="icon"
                                            className={`w-8 h-8 rounded-md ${viewMode === v.id ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
                                            onClick={() => setViewMode(v.id as any)}
                                        >
                                            <v.icon className="w-4 h-4" />
                                        </Button>
                                    ))}
                                </div>
                                <Button variant="ghost" className="gap-2 font-bold text-slate-600">
                                    Sort: Default <ArrowUpDown className="w-4 h-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>

                        <div className={viewMode === "grid-4"
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8"
                            : "flex flex-col gap-6"
                        }>
                            {filteredMaterials.map((material) => (
                                <div
                                    key={material.id}
                                    className={`group cursor-pointer transition-all duration-300 ${viewMode === 'grid-4' ? 'flex flex-col' : 'flex gap-6 border rounded-2xl p-4 bg-white hover:shadow-xl'}`}
                                >
                                    <div className={`relative overflow-hidden bg-slate-100 rounded-2xl ${viewMode === 'grid-4' ? 'aspect-square mb-4' : 'w-48 h-48 flex-shrink-0'}`}>
                                        <img
                                            src={material.image}
                                            alt={material.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        {material.co2Footprint && (
                                            <div className="absolute top-3 left-3">
                                                <Badge className="bg-green-500/90 text-white border-none gap-1 font-bold backdrop-blur-sm">
                                                    <Leaf className="w-2.5 h-2.5" /> {material.co2Footprint}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 py-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{material.category}</p>
                                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2">
                                            {material.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black">
                                                {material.vendor.charAt(0)}
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-bold">{material.vendor}</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-xl font-black text-slate-900 italic">₦{Number(material.price).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Marketplace;
