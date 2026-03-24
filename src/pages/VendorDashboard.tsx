import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Bell,
    Search,
    Filter,
    DollarSign,
    ShoppingCart,
    Package,
    Eye,
    Loader2,
    TrendingUp,
    ArrowUpRight,
    Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { AddMaterialDialog } from "@/components/vendor/AddMaterialDialog";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const chartData = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 5000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 2390 },
    { name: 'Sun', sales: 3490 },
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

const VendorDashboard = () => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const isVendor = role === "vendor";
    const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all');

    const notifications = [
        { id: 1, title: "New Order", message: "ORD-5421 from David Okonkwo", time: "2 mins ago", type: "order" },
        { id: 2, title: "Low Stock Alert", message: "Portland Cement level is at 15%", time: "1 hour ago", type: "stock" },
        { id: 3, title: "Payment Received", message: "₦250,400 released to your account", time: "3 hours ago", type: "payment" },
    ];

    const { data: myMaterials = [], isLoading } = useQuery({
        queryKey: ['vendor-materials', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('vendor_id', user.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    const totalViews = myMaterials.reduce((sum, m) => sum + (m.views_count || 0), 0);
    const lowStockCount = myMaterials.filter(m => m.availability === 'Low Stock' || m.availability === 'Out of Stock').length;

    const stats = [
        { title: "Total Sales", value: "₦ 0", icon: DollarSign, trend: "+0%", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        { title: "Active Orders", value: "0", icon: ShoppingCart, trend: "Stable", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { title: "Inventory Items", value: `${myMaterials.length}`, icon: Package, trend: `${lowStockCount} low`, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        { title: "Market Visibility", value: totalViews.toLocaleString(), icon: Eye, trend: "Real-time", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    ];

    const pieData = [
        { name: 'Cement', value: 400 },
        { name: 'Steel', value: 300 },
        { name: 'Aggregates', value: 300 },
        { name: 'Others', value: 200 },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
            <Navbar />
            
            <div className="flex">
                {/* Desktop Sidebar */}
                <VendorSidebar />

                {/* Main Content Area */}
                <main className="flex-1 overflow-hidden">
                    <VerificationBanner />
                    
                    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                        {!isVendor && (
                            <div className="mb-8 p-4 bg-orange-50/80 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30 rounded-2xl flex items-center justify-between backdrop-blur-sm">
                                <p className="text-orange-800 dark:text-orange-300 font-bold text-sm">You are viewing this as a <span className="underline">{role}</span>. Some vendor features are restricted.</p>
                                <Button variant="outline" className="text-orange-800 border-orange-200 hover:bg-orange-100 font-black uppercase tracking-widest text-[10px] h-8" asChild>
                                    <Link to="/">Go Home</Link>
                                </Button>
                            </div>
                        )}

                        {/* Top Header Section */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Vendor Portal</h1>
                                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">PRO</span>
                                </div>
                                <p className="text-muted-foreground dark:text-slate-400 font-medium italic">
                                    Manage your materials and track sales performance.
                                    <span className="hidden lg:inline ml-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">Partner Hub</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input className="pl-10 bg-white dark:bg-card border-none rounded-xl font-bold shadow-sm" placeholder="Global search..." />
                                </div>
                                <AddMaterialDialog />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-11 w-11 p-0 bg-white dark:bg-card rounded-xl hidden md:flex shrink-0 relative">
                                            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-slate-800" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 rounded-2xl border-none shadow-2xl overflow-hidden" align="end">
                                        <div className="bg-slate-900 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Notifications</p>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                            {notifications.map((n) => (
                                                <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 group-hover:text-primary transition-colors">{n.title}</p>
                                                    <p className="text-xs text-slate-500 font-medium italic mb-1">{n.message}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{n.time}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-3 bg-slate-50 text-center">
                                            <Button variant="ghost" className="h-8 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">Clear All</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </header>

                        {/* Stats Summary Area */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, i) => (
                                <Card key={i} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative rounded-[2rem]">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${stat.bg} ${stat.color}`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`flex items-center gap-1 text-[11px] font-black tracking-tight ${stat.color}`}>
                                                    {stat.trend}
                                                    {stat.trend.startsWith('+') && <ArrowUpRight className="w-3 h-3" />}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1 group-hover:text-primary transition-colors">{stat.title}</p>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stat.value}</h3>
                                        </div>
                                    </CardContent>
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                                </Card>
                            ))}
                        </div>

                        {/* Middle Section: Visualization and Inventory */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Charts Section */}
                            <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sales Overview</CardTitle>
                                        <CardDescription className="italic font-medium">Performance trends for the current week.</CardDescription>
                                    </div>
                                    <Button variant="ghost" className="h-9 px-4 rounded-full bg-slate-100 dark:bg-muted font-black text-[10px] uppercase tracking-widest gap-2">
                                        <Calendar className="w-3 h-3" /> This Week
                                    </Button>
                                </CardHeader>
                                <CardContent className="h-[300px] p-8 pt-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis 
                                                dataKey="name" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                                dy={10}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="sales" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#colorSales)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-2">
                                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">Material Mix</CardTitle>
                                    <CardDescription className="text-center italic font-medium">Inventory distribution by category.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex justify-center flex-wrap gap-4 mt-4">
                                        {pieData.map((item, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Bottom Section: Orders and Inventory List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                            {/* Recent Orders List */}
                            <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Orders</CardTitle>
                                        <CardDescription className="italic font-medium">Real-time requisition feed.</CardDescription>
                                    </div>
                                    <Button variant="ghost" className="text-primary text-[10px] font-black uppercase tracking-widest h-8 px-4 bg-primary/5 hover:bg-primary/10 rounded-full">Explore All</Button>
                                </CardHeader>
                                <CardContent className="px-8 pb-8">
                                    <div className="space-y-4">
                                        {[
                                            { order: "#ORD-5421", client: "David Okonkwo", item: "Portland Cement x200", status: "Processing", date: "2 mins ago" },
                                            { order: "#ORD-5420", client: "Amina Bello", item: "Steel Rebars (16mm) x50", status: "Shipped", date: "1 hour ago" },
                                            { order: "#ORD-5419", client: "Premium Dev", item: "Sharp Sand (10 Tons)", status: "Delivered", date: "3 hours ago" },
                                        ].map((order, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-400">
                                                        {order.client.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{order.client} <span className="text-primary font-black ml-2 tabular-nums">{order.order}</span></p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold italic">{order.item}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-1 inline-block ${order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                                                        order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {order.status}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase block">{order.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Inventory Filter/Status */}
                            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">My Stock</CardTitle>
                                    <CardDescription className="text-center italic font-medium">Quick inventory check.</CardDescription>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 space-y-4">
                                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                                        <Button 
                                            size="sm" 
                                            className={cn("h-8 rounded-full text-[9px] font-black uppercase tracking-widest transition-all", stockFilter === 'all' ? "bg-primary text-white shadow-lg" : "bg-transparent text-slate-400 hover:text-slate-600")}
                                            onClick={() => setStockFilter('all')}
                                        >
                                            All Items
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className={cn("h-8 rounded-full text-[9px] font-black uppercase tracking-widest transition-all", stockFilter === 'critical' ? "bg-primary text-white border-primary shadow-lg" : "border-slate-200 text-slate-400 hover:text-slate-600")}
                                            onClick={() => setStockFilter('critical')}
                                        >
                                            Critical Stock
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {isLoading ? (
                                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                        ) : myMaterials.length > 0 ? (
                                            myMaterials
                                                .filter(item => stockFilter === 'all' || item.availability === 'Low Stock' || item.availability === 'Out of Stock')
                                                .slice(0, 4)
                                                .map((item, i) => (
                                                <div key={i} className="group p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-black uppercase tracking-tight leading-tight line-clamp-1 flex-1">{item.name}</span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ml-2 ${item.availability === 'Low Stock' || item.availability === 'Out of Stock' ? 'bg-orange-500 text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                                                            {item.availability}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span>ID: {item.id.slice(0, 8)}</span>
                                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(item as any).views_count || 0}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-10 text-slate-400 text-[10px] font-bold uppercase italic tracking-widest">No listings found.</div>
                                        )}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="w-full text-[10px] font-black uppercase tracking-[0.2em] h-10 border-slate-200 rounded-xl mt-4 hover:bg-primary hover:text-white hover:border-primary transition-all"
                                        onClick={() => navigate('/vendor-inventory')}
                                    >
                                        Manage Inventory
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VendorDashboard;
