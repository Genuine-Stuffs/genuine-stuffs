import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Filter, Grid, List, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Marketplace = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="border-b bg-slate-50/50">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold mb-6">Building Materials Marketplace</h1>
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input className="pl-10 h-12 text-lg" placeholder="Search materials by name, brand or type..." />
                        </div>
                        <Button variant="outline" size="lg" className="gap-2">
                            <Filter className="w-5 h-5" /> Filters
                        </Button>
                        <div className="flex border rounded-lg overflow-hidden h-12">
                            <Button variant="ghost" className="rounded-none px-4"><Grid className="w-5 h-5" /></Button>
                            <Button variant="ghost" className="rounded-none px-4 border-l bg-slate-100"><List className="w-5 h-5" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <p className="text-muted-foreground">Showing 0 results (Marketplace Indexing In Progress)</p>
                    <Button variant="ghost" className="gap-2 font-medium">
                        Sort by: Popularity <ArrowUpDown className="w-4 h-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {/* Mock Product Skeletons */}
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="animate-pulse space-y-4">
                            <div className="bg-slate-100 aspect-square rounded-2xl" />
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-100 rounded w-3/4" />
                                <div className="h-4 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed">
                    <h3 className="text-2xl font-bold mb-2">Vendors: List Your Materials</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Our marketplace is currently onboarding verified suppliers.
                        Join the transformation and reach project owners directly.
                    </p>
                    <Button size="lg" asChild>
                        <a href="/register/vendor">Start Vendor Registration</a>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Marketplace;
