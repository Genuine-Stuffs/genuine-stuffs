import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Filter, Grid, List, ArrowUpDown, ShoppingCart, Info, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { materials, Material } from "@/data/materials";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Marketplace = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const categories = ["All", ...Array.from(new Set(materials.map(m => m.category)))];

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.vendor.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    return (
        <div className="min-h-screen bg-slate-50/30">
            <Navbar />
            <div className="bg-white border-b sticky top-20 z-30">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                className="pl-12 h-14 text-lg rounded-2xl border-slate-200 focus:ring-primary shadow-sm"
                                placeholder="Search materials, brands, or structural components..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(cat)}
                                    className="rounded-full whitespace-nowrap"
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Available Materials</h2>
                        <p className="text-slate-500 font-medium">Found {filteredMaterials.length} verified products</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="ghost" className="gap-2 font-bold text-slate-600">
                            Sort: Price <ArrowUpDown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredMaterials.map((material) => (
                        <Card key={material.id} className="group border-none shadow-sm hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden bg-white">
                            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                <img
                                    src={material.image}
                                    alt={material.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute top-4 left-4 flex flex-col gap-2">
                                    <Badge className="bg-white/90 text-slate-900 backdrop-blur-md border-none font-bold">
                                        {material.category}
                                    </Badge>
                                    {material.co2Footprint && (
                                        <Badge className="bg-green-500/90 text-white border-none gap-1 font-bold">
                                            <Leaf className="w-3 h-3" /> {material.co2Footprint}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-black text-xl text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                                        {material.name}
                                    </h3>
                                </div>
                                <p className="text-slate-500 text-sm mb-4 line-clamp-2 font-medium">{material.description}</p>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                        {material.vendor.charAt(0)}
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{material.vendor}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-2xl font-black text-slate-900">₦{Number(material.price).toLocaleString()}</span>
                                        <span className="text-slate-400 text-sm font-bold ml-1">/ {material.unit}</span>
                                    </div>
                                    <div className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${material.availability === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {material.availability}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-6 flex gap-2">
                                <Button className="flex-1 h-12 rounded-xl font-bold gap-2">
                                    <ShoppingCart className="w-4 h-4" /> Add to Quote
                                </Button>
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-slate-400 hover:text-primary">
                                    <Info className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {filteredMaterials.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-slate-900">No materials found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Try adjusting your search or category filters to find what you're looking for.
                        </p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Marketplace;
