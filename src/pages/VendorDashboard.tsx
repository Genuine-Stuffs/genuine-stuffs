import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    TrendingUp,
    Users,
    Package,
    ShoppingCart,
    Settings,
    Plus,
    Bell,
    Search,
    Filter,
    DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";

const VendorDashboard = () => {
    const { role } = useAuth();
    const isVendor = role === "vendor";

    const stats = [
        { title: "Total Sales", value: "₦ 12,450,000", icon: DollarSign, trend: "+12.5%", color: "text-green-600" },
        { title: "Active Orders", value: "24", icon: ShoppingCart, trend: "+4", color: "text-blue-600" },
        { title: "Material Inventory", value: "142 Items", icon: Package, trend: "8 Low Stock", color: "text-orange-600" },
        { title: "Profile Views", value: "1,240", icon: Users, trend: "+18%", color: "text-purple-600" },
    ];

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                {!isVendor && (
                    <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl flex items-center justify-between transition-colors">
                        <p className="text-orange-800 dark:text-orange-300 font-bold text-sm">You are viewing this as a <span className="underline">{role}</span>. Some vendor features are restricted.</p>
                        <Button variant="outline" className="text-orange-800 border-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/40 font-black uppercase tracking-widest text-[10px] h-8 px-4" asChild>
                            <Link to="/">Go Home</Link>
                        </Button>
                    </div>
                )}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Vendor Portal</h1>
                        <p className="text-muted-foreground dark:text-slate-400 font-medium italic mt-1">Manage your materials and track sales. <span className="font-black text-primary uppercase tracking-widest text-xs ml-2">Partner Account</span></p>
                    </div>
                    <div className="flex gap-3">
                        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all font-black uppercase tracking-widest text-xs h-11 px-6 rounded-xl">
                            <Plus className="w-4 h-4" /> Add Material
                        </Button>
                        <Button variant="outline" className="h-11 w-11 p-0 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-xl">
                            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                        <Button variant="outline" className="h-11 w-11 p-0 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-xl">
                            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                    </div>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <Card key={i} className="group border border-slate-100 dark:border-white/5 hover:border-primary/50 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 bg-white dark:bg-card rounded-[2rem] overflow-hidden relative">
                            <CardContent className="p-6 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-[1.25rem] bg-slate-50 dark:bg-slate-800/50 shadow-inner border dark:border-white/10 transition-all group-hover:scale-110 group-hover:shadow-lg ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border dark:border-white/10 uppercase tracking-widest ${stat.color}`}>
                                        {stat.trend}
                                    </span>
                                </div>
                                <div className="relative">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 group-hover:text-primary transition-colors">{stat.title}</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tabular-nums truncate tracking-tight">{stat.value}</h3>
                                </div>
                            </CardContent>
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Orders */}
                    <Card className="lg:col-span-2 border-none shadow-sm dark:bg-card rounded-[2.5rem] transition-colors">
                        <CardHeader className="p-8 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Orders</CardTitle>
                                <CardDescription className="dark:text-slate-400 font-medium italic mt-1">Real-time site manager requisitions.</CardDescription>
                            </div>
                            <Button variant="ghost" className="text-primary text-[10px] font-black uppercase tracking-widest h-8 px-4 bg-primary/5 hover:bg-primary/10 rounded-full">View All</Button>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <div className="space-y-4">
                                {[
                                    { order: "#ORD-5421", client: "David Okonkwo", item: "Portland Cement x200", status: "Processing", date: "2 mins ago" },
                                    { order: "#ORD-5420", client: "Amina Bello", item: "Steel Rebars (16mm) x50", status: "Shipped", date: "1 hour ago" },
                                    { order: "#ORD-5419", client: "Premium Dev", item: "Sharp Sand (10 Tons)", status: "Delivered", date: "3 hours ago" },
                                    { order: "#ORD-5418", client: "Metro Builders", item: "Concrete Aggregates", status: "Pending", date: "Yesterday" },
                                ].map((order, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-black flex items-center justify-center font-black text-xs text-slate-500 dark:text-slate-400 shadow-inner group-hover:scale-110 transition-transform">
                                                {order.client.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{order.client} <span className="text-primary font-black ml-2 tabular-nums">{order.order}</span></p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">{order.item}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 px-3 py-1 rounded-md ${order.status === 'Delivered' ? 'bg-green-50 dark:bg-green-950/40 text-green-600' :
                                                order.status === 'Shipped' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600'
                                                }`}>
                                                {order.status}
                                            </p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">{order.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Inventory Search */}
                    <Card className="border-none shadow-sm dark:bg-card rounded-[2.5rem] transition-colors">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Quick Look</CardTitle>
                            <CardDescription className="dark:text-slate-400 font-medium italic mt-1">Filter by stock level or category.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input className="pl-11 h-12 bg-slate-50 dark:bg-black border-none rounded-xl font-bold focus:ring-4 focus:ring-primary/10 dark:text-white transition-all" placeholder="Search my inventory..." />
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Button variant="outline" size="sm" className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-white/10 dark:text-slate-400">Low Stock</Button>
                                <Button variant="outline" size="sm" className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-white/10 dark:text-slate-400">Recently Added</Button>
                                <Button variant="outline" size="sm" className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 border-none text-primary">All Categories <Filter className="w-3.5 h-3.5 ml-2" /></Button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: "Portland Cement (50kg)", stock: 120, status: "Normal" },
                                    { name: "Steel Rebar (12mm)", stock: 15, status: "Low" },
                                    { name: "Roofing Sheets (Galvanized)", stock: 8, status: "Low" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-white/5 border dark:border-white/5 transition-colors group cursor-pointer hover:bg-primary hover:text-white hover:border-primary">
                                        <span className="text-xs font-black uppercase tracking-tight line-clamp-1">{item.name}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${item.status === 'Low' ? 'bg-orange-500 text-white' : 'text-slate-400 group-hover:text-white/80'}`}>
                                            {item.stock} Units
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default VendorDashboard;
