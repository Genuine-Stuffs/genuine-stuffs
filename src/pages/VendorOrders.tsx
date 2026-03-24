import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Search,
    Filter,
    ShoppingCart,
    Loader2,
    MoreVertical,
    Eye,
    Truck,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Calendar,
    ArrowUpRight,
    DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VerificationBanner } from "@/components/VerificationBanner";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import BottomNav from "@/components/vendor/BottomNav";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const VendorOrders = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Mock data for now since backend doesn't have orders table yet
    const orders = [
        { id: "ORD-5421", client: "David Okonkwo", item: "Portland Cement x200", status: "Processing", date: "2026-03-24", total: 2500000, location: "Lagos, NG" },
        { id: "ORD-5420", client: "Amina Bello", item: "Steel Rebars (16mm) x50", status: "Shipped", date: "2026-03-24", total: 32500000, location: "Abuja, NG" },
        { id: "ORD-5419", client: "Premium Dev", item: "Sharp Sand (10 Tons)", status: "Delivered", date: "2026-03-23", total: 4500000, location: "Lekki, NG" },
        { id: "ORD-5418", client: "Structural Pros", item: "Quarry Granite x15 Tons", status: "Delivered", date: "2026-03-22", total: 2250000, location: "Ibadan, NG" },
        { id: "ORD-5417", client: "Chidi Azeez", item: "Aluminum Roofing x500sqm", status: "Canceled", date: "2026-03-21", total: 2250000, location: "Enugu, NG" },
    ];

    const stats = [
        { title: "Total Revenue", value: "₦ 41.5M", icon: DollarSign, trend: "+12.5%", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        { title: "Active Orders", value: "2", icon: ShoppingCart, trend: "Stable", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { title: "Pending Delivery", value: "1", icon: Truck, trend: "Urgent", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        { title: "Completion Rate", value: "94%", icon: CheckCircle2, trend: "High", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    ];

    const filteredOrders = orders.filter(o => 
        o.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return 'bg-emerald-500 text-white dark:bg-emerald-600';
            case 'Shipped': return 'bg-blue-500 text-white dark:bg-blue-600';
            case 'Processing': return 'bg-orange-500 text-white dark:bg-orange-600';
            case 'Canceled': return 'bg-red-500 text-white dark:bg-red-600';
            default: return 'bg-slate-500 text-white dark:bg-slate-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Delivered': return <CheckCircle2 className="w-3 h-3" />;
            case 'Shipped': return <Truck className="w-3 h-3" />;
            case 'Processing': return <Clock className="w-3 h-3" />;
            case 'Canceled': return <XCircle className="w-3 h-3" />;
            default: return null;
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
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Order Management</h1>
                                <p className="text-muted-foreground dark:text-slate-400 font-medium italic">
                                    Track requisitions and manage fulfillment.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-200" />
                                    <Input 
                                        className="pl-10 bg-white dark:bg-card border-none rounded-xl font-bold shadow-sm" 
                                        placeholder="Search by client or ID..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" className="h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] bg-white dark:bg-card border-none shadow-sm">
                                    <Download className="w-4 h-4" /> Export CSV
                                </Button>
                            </div>
                        </header>

                        {/* Stats Summary Area */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {stats.map((stat, i) => (
                                <Card key={i} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative rounded-[1.5rem] md:rounded-[2rem]">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex justify-between items-start mb-2 md:mb-4">
                                            <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-transform group-hover:scale-110 ${stat.bg} ${stat.color}`}>
                                                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`flex items-center gap-1 text-[9px] md:text-[11px] font-black tracking-tight ${stat.color}`}>
                                                    {stat.trend}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-200 mb-0.5 md:mb-1 group-hover:text-primary transition-colors">{stat.title}</p>
                                            <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stat.value}</h3>
                                        </div>
                                    </CardContent>
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                                </Card>
                            ))}
                        </div>

                        {/* Orders Table */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Requisitions</CardTitle>
                                    <CardDescription className="italic font-medium">Viewing {filteredOrders.length} orders.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" className="h-9 px-4 rounded-full bg-slate-100 dark:bg-muted font-black text-[10px] uppercase tracking-widest gap-2">
                                        <Calendar className="w-3 h-3" /> All Time
                                    </Button>
                                    <Button variant="outline" className="h-9 px-4 rounded-full font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200">
                                        <Filter className="w-3 h-3" /> Status
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Orders...</p>
                                    </div>
                                ) : filteredOrders.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 dark:text-white border-b border-slate-100 dark:border-slate-800">
                                                    <th className="px-8 py-4">Order ID</th>
                                                    <th className="px-8 py-4">Client</th>
                                                    <th className="px-8 py-4">Items</th>
                                                    <th className="px-8 py-4">Total Value</th>
                                                    <th className="px-8 py-4">Status</th>
                                                    <th className="px-8 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredOrders.map((order) => (
                                                    <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <span className="font-black text-sm text-primary tabular-nums">{order.id}</span>
                                                            <p className="text-[9px] text-slate-400 dark:text-slate-200 font-bold uppercase">{order.date}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div>
                                                                <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{order.client}</p>
                                                                <p className="text-[9px] text-slate-400 dark:text-slate-200 font-bold uppercase italic">{order.location}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="font-bold text-xs text-slate-600 dark:text-slate-300 italic">{order.item}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="font-black text-sm text-slate-900 dark:text-white tabular-nums">₦ {order.total.toLocaleString()}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <Badge className={`rounded-full text-[9px] font-black uppercase tracking-widest px-3 py-1 gap-1.5 ${getStatusColor(order.status)}`}>
                                                                {getStatusIcon(order.status)}
                                                                {order.status}
                                                            </Badge>
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
                                                                        <Eye className="w-3.5 h-3.5" /> View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-[10px] uppercase tracking-widest gap-2 cursor-pointer">
                                                                        <Clock className="w-3.5 h-3.5" /> Mark Processing
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-[10px] uppercase tracking-widest gap-2 cursor-pointer">
                                                                        <Truck className="w-3.5 h-3.5" /> Mark Shipped
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-[10px] uppercase tracking-widest gap-2 text-primary cursor-pointer border-t mt-1 pt-2">
                                                                        <Download className="w-3.5 h-3.5" /> Invoice PDF
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
                                            <ShoppingCart className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">No Orders Found</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium italic">
                                            {searchQuery ? "No orders match your search criteria." : "You don't have any orders yet. Listings more materials to increase your sales!"}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default VendorOrders;
