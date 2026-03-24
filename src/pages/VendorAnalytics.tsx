import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    TrendingUp,
    Users,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    Filter,
    Table as TableIcon,
    PieChart as PieChartIcon,
    LayoutDashboard
} from "lucide-react";
import { VerificationBanner } from "@/components/VerificationBanner";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import BottomNav from "@/components/vendor/BottomNav";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';

const VendorAnalytics = () => {
    const { user } = useAuth();

    // Mock data for visualizations
    const salesData = [
        { name: 'Mon', revenue: 450000, orders: 12 },
        { name: 'Tue', revenue: 520000, orders: 19 },
        { name: 'Wed', revenue: 380000, orders: 8 },
        { name: 'Thu', revenue: 650000, orders: 24 },
        { name: 'Fri', revenue: 480000, orders: 15 },
        { name: 'Sat', revenue: 720000, orders: 31 },
        { name: 'Sun', revenue: 590000, orders: 22 },
    ];

    const categoryData = [
        { name: 'Cement', value: 40, color: '#0EA5E9' },
        { name: 'Steel', value: 30, color: '#8B5CF6' },
        { name: 'Sand', value: 15, color: '#F59E0B' },
        { name: 'Tiles', value: 10, color: '#10B981' },
        { name: 'Others', value: 5, color: '#64748B' },
    ];

    const performanceStats = [
        { title: "Avg. Order Value", value: "₦ 145k", trend: "+8.2%", icon: TrendingUp, positive: true },
        { title: "Conversion Rate", value: "3.4%", trend: "-1.2%", icon: Users, positive: false },
        { title: "Product Views", value: "12,402", trend: "+24%", icon: Package, positive: true },
        { title: "Net Profit", value: "₦ 2.4M", trend: "+15.3%", icon: BarChart3, positive: true },
    ];

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
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Analytics Dashboard</h1>
                                <p className="text-muted-foreground dark:text-slate-200 font-medium italic">
                                    Strategic insights for your construction supply business.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button variant="outline" className="h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] bg-white dark:bg-card border-none shadow-sm">
                                    <Calendar className="w-4 h-4" /> Last 30 Days
                                </Button>
                                <Button variant="outline" className="h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] bg-white dark:bg-card border-none shadow-sm">
                                    <Download className="w-4 h-4" /> Report
                                </Button>
                            </div>
                        </header>

                        {/* Performance Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {performanceStats.map((stat, i) => (
                                <Card key={i} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex justify-between items-start mb-2 md:mb-4">
                                            <div className="p-2 md:p-3 bg-slate-100 dark:bg-slate-800 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform">
                                                <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-slate-500 dark:text-slate-300" />
                                            </div>
                                            <Badge className={`rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 md:px-2 py-0.5 border-none shadow-none ${stat.positive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {stat.trend}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-200 mb-0.5 md:mb-1">{stat.title}</p>
                                            <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stat.value}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Revenue Trend Line Chart */}
                            <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Revenue Stream</CardTitle>
                                            <CardDescription className="italic font-medium">Daily revenue performance for the current week.</CardDescription>
                                        </div>
                                        <LayoutDashboard className="w-5 h-5 text-primary/20" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                            <XAxis 
                                                dataKey="name" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fontWeight: 800, fill: '#E2E8F0'}} 
                                                dy={10}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fontWeight: 800, fill: '#E2E8F0'}}
                                                tickFormatter={(value) => `₦${value/1000}k`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                labelStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="revenue" 
                                                stroke="#0EA5E9" 
                                                strokeWidth={4} 
                                                fillOpacity={1} 
                                                fill="url(#colorRevenue)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Category Distribution Pie Chart */}
                            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-0">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Category Mix</CardTitle>
                                    <CardDescription className="italic font-medium">Percentage share of total sales volume.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 flex flex-col items-center">
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                        {categoryData.map((cat, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-200">{cat.name}</span>
                                                <span className="text-[10px] font-black ml-auto tabular-nums dark:text-white">{cat.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Activity / Bottom Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Top Materials</CardTitle>
                                        <CardDescription className="italic font-medium">Most impactful listings this month.</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest text-primary">View All</Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {[
                                            { name: "Portland Cement (Dangote)", sales: 120, growth: "+15%" },
                                            { name: "Reinforcement Steel (16mm)", sales: 85, growth: "+8%" },
                                            { name: "Sharp River Sand", sales: 156, growth: "+22%" },
                                            { name: "Quarry Granite", sales: 42, growth: "-3%" },
                                        ].map((item, i) => (
                                            <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-500 dark:text-white">{i+1}</div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black tabular-nums dark:text-white">{item.sales} Orders</p>
                                                        <p className={`text-[9px] font-black ${item.growth.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{item.growth}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden relative">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Strategic Forecast</CardTitle>
                                    <CardDescription className="italic font-medium">AI-driven market demand predictions.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 flex flex-col gap-6">
                                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                                        <div className="flex items-center gap-3 mb-3 text-primary">
                                            <TrendingUp className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-xs font-black uppercase tracking-widest">Rising Demand Alert</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">
                                            Cement prices are projected to rise by 5% next month due to logistics constraints. Consider restocking your inventory to maximize margin.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-200">Inventory Health</span>
                                                <span className="text-[10px] font-black dark:text-white">84%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-200">Logistics Efficiency</span>
                                                <span className="text-[10px] font-black dark:text-white">62%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: '62%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10" />
                            </Card>
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

// Internal Badge Component since I don't want to import it for every small thing if not necessary, but I used it above
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
        {children}
    </div>
);

export default VendorAnalytics;
