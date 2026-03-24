import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Filter,
    Package,
    Eye,
    Loader2,
    MoreVertical,
    Edit,
    Trash2,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import BottomNav from "@/components/vendor/BottomNav";
import { AddMaterialDialog } from "@/components/vendor/AddMaterialDialog";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const VendorInventory = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: materials = [], isLoading, refetch } = useQuery({
        queryKey: ['vendor-inventory', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this material?")) return;
        
        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            refetch();
        } catch (err) {
            console.error("Error deleting material:", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 pb-20 md:pb-0">
            <Navbar />
            
            <div className="flex">
                <VendorSidebar />

                <main className="flex-1 overflow-hidden">
                    <VerificationBanner />
                    
                    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                        {/* Header */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Material Inventory</h1>
                                <p className="text-muted-foreground dark:text-slate-400 font-medium italic">
                                    Manage your construction supplies and listings.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        className="pl-10 bg-white dark:bg-card border-none rounded-xl font-bold shadow-sm" 
                                        placeholder="Search materials..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <AddMaterialDialog />
                            </div>
                        </header>

                        {/* Inventory Table/Grid */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Listings</CardTitle>
                                        <CardDescription className="italic font-medium">You have {materials.length} materials in your inventory.</CardDescription>
                                    </div>
                                    <Button variant="outline" className="h-10 rounded-xl gap-2 text-xs font-black uppercase tracking-widest border-slate-200">
                                        <Filter className="w-4 h-4" /> Filter
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Inventory...</p>
                                    </div>
                                ) : filteredMaterials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                                                    <th className="px-8 py-4">Material</th>
                                                    <th className="px-8 py-4">Category</th>
                                                    <th className="px-8 py-4">Price</th>
                                                    <th className="px-8 py-4">Status</th>
                                                    <th className="px-8 py-4">Views</th>
                                                    <th className="px-8 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredMaterials.map((item) => (
                                                    <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                                    {item.image_url ? (
                                                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package className="w-6 h-6 text-slate-300" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {item.id.slice(0, 8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200">
                                                                {item.category || "General"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="font-black text-sm text-slate-900 dark:text-white tabular-nums">₦ {item.price?.toLocaleString() || "0"}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.unit || "Unit"}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <Badge 
                                                                className={`rounded-full text-[9px] font-black uppercase tracking-widest px-3 py-1 ${
                                                                    item.availability === 'Low Stock' || item.availability === 'Out of Stock' 
                                                                    ? 'bg-orange-500 text-white' 
                                                                    : 'bg-emerald-500 text-white'
                                                                }`}
                                                            >
                                                                {item.availability || "In Stock"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-1.5 text-slate-500 font-bold tabular-nums text-xs">
                                                                <Eye className="w-4 h-4 text-slate-400" />
                                                                {item.views_count || 0}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40 rounded-xl font-bold">
                                                                    <DropdownMenuItem className="text-[10px] uppercase tracking-widest gap-2 cursor-pointer">
                                                                        <Edit className="w-3.5 h-3.5" /> Edit Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-[10px] uppercase tracking-widest gap-2 cursor-pointer">
                                                                        <ExternalLink className="w-3.5 h-3.5" /> View Public
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        className="text-[10px] uppercase tracking-widest gap-2 text-destructive cursor-pointer"
                                                                        onClick={() => handleDelete(item.id)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Remove Item
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 text-center px-10">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-6">
                                            <AlertCircle className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">No Materials Found</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-sm mb-8">
                                            {searchQuery ? "We couldn't find any materials matching your search. Try a different query." : "You haven't listed any materials yet. Start growing your construction business today!"}
                                        </p>
                                        {!searchQuery && <AddMaterialDialog />}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VendorInventory;
