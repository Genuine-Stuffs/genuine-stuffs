import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
    const stats = [
        { title: "Total Sales", value: "₦ 12,450,000", icon: DollarSign, trend: "+12.5%", color: "text-green-600" },
        { title: "Active Orders", value: "24", icon: ShoppingCart, trend: "+4", color: "text-blue-600" },
        { title: "Material Inventory", value: "142 Items", icon: Package, trend: "8 Low Stock", color: "text-orange-600" },
        { title: "Profile Views", value: "1,240", icon: Users, trend: "+18%", color: "text-purple-600" },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Vendor Dashboard</h1>
                        <p className="text-muted-foreground">Manage your materials and track your sales performance.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Add New Material
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {stats.map((stat, i) => (
                        <Card key={i} className="border-none shadow-sm shadow-slate-200">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl bg-white shadow-sm border ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-100 ${stat.color}`}>
                                        {stat.trend}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Orders */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Orders</CardTitle>
                                <CardDescription>Real-time updates from site managers and contractors.</CardDescription>
                            </div>
                            <Button variant="ghost" className="text-primary text-sm font-bold">View All</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { order: "#ORD-5421", client: "David Okonkwo", item: "Portland Cement x200", status: "Processing", date: "2 mins ago" },
                                    { order: "#ORD-5420", client: "Amina Bello", item: "Steel Rebars (16mm) x50", status: "Shipped", date: "1 hour ago" },
                                    { order: "#ORD-5419", client: "Premium Dev", item: "Sharp Sand (10 Tons)", status: "Delivered", date: "3 hours ago" },
                                    { order: "#ORD-5418", client: "Metro Builders", item: "Concrete Aggregates", status: "Pending", date: "Yesterday" },
                                ].map((order, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                {order.client.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{order.client} <span className="text-slate-400 font-medium ml-2">{order.order}</span></p>
                                                <p className="text-xs text-muted-foreground">{order.item}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${order.status === 'Delivered' ? 'text-green-600' :
                                                    order.status === 'Shipped' ? 'text-blue-600' : 'text-orange-600'
                                                }`}>
                                                {order.status}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">{order.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Inventory Search */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Inventory Quick Look</CardTitle>
                            <CardDescription>Filter by stock level or category.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input className="pl-9 h-10" placeholder="Search my inventory..." />
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Button variant="outline" size="sm" className="h-8 rounded-full text-xs">Low Stock</Button>
                                <Button variant="outline" size="sm" className="h-8 rounded-full text-xs">Recently Added</Button>
                                <Button variant="outline" size="sm" className="h-8 rounded-full text-xs bg-slate-100">All Categories <Filter className="w-3 h-3 ml-1" /></Button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: "Portland Cement (50kg)", stock: 120, status: "Normal" },
                                    { name: "Steel Rebar (12mm)", stock: 15, status: "Low" },
                                    { name: "Roofing Sheets (Galvanized)", stock: 8, status: "Low" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium line-clamp-1">{item.name}</span>
                                        <span className={`text-xs font-bold ${item.status === 'Low' ? 'text-orange-600' : 'text-slate-500'}`}>
                                            {item.stock} in stock
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
