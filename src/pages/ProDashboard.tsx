import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    PencilRuler,
    Sparkles,
    Layers,
    Map,
    FileText,
    Calculator,
    Settings,
    Plus,
    Bell,
    Clock,
    ArrowRight,
    Cpu
} from "lucide-react";

const ProDashboard = () => {
    const activeProjects = [
        { title: "Lekki Residential Villa", type: "Architectural Drawing", status: "In AI Review", progress: 65, lastEdit: "10 mins ago" },
        { title: "Mainland Health Plaza", type: "Quantity Surveying", status: "Awaiting Market Prices", progress: 40, lastEdit: "2 hours ago" },
        { title: "Eco-Tech Office Complex", type: "BIM Coordination", status: "Clash Detected", progress: 85, lastEdit: "Yesterday" },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Professional Portal</h1>
                        <p className="text-muted-foreground">Access your AI tools and manage your active project workflows.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all">
                            <Plus className="w-4 h-4" /> Start New Project
                        </Button>
                        <Button variant="outline" className="gap-2 bg-white">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" className="gap-2 bg-white">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Action Hub - AI Tools */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-primary" /> Active AI Workspaces
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeProjects.map((project, i) => (
                                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
                                        <div className={`h-1.5 w-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-orange-500' : 'bg-red-500'}`} />
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{project.title}</h4>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">{project.type}</p>
                                                </div>
                                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {project.lastEdit}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span>Progress</span>
                                                    <span>{project.progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${project.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs font-bold ${project.status === 'Clash Detected' ? 'text-red-600' :
                                                        project.status === 'In AI Review' ? 'text-primary' : 'text-orange-600'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                                <Button size="sm" variant="ghost" className="gap-2 p-0 h-auto hover:bg-transparent font-bold">
                                                    Resume <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Card className="border-2 border-dashed border-slate-200 bg-transparent flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-100/50 transition-all">
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                                        <Plus className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="font-bold text-slate-500">New AI Drawing / Survey</p>
                                    <p className="text-xs text-slate-400 mt-1">Start from prompt or file</p>
                                </Card>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" /> Technical Toolkits
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { name: "Structural", icon: Layers, color: "bg-blue-500" },
                                    { name: "MEP Design", icon: Calculator, color: "bg-orange-500" },
                                    { name: "Site Planning", icon: Map, color: "bg-green-500" },
                                    { name: "BoQ Engine", icon: FileText, color: "bg-purple-500" },
                                ].map((tool, i) => (
                                    <Card key={i} className="border-none shadow-sm hover:translate-y-[-4px] transition-all cursor-pointer overflow-hidden group">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className={`p-4 rounded-2xl mb-3 text-white shadow-lg shadow-${tool.color.split('-')[1]}-500/20 ${tool.color}`}>
                                                <tool.icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-sm font-bold">{tool.name}</span>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Side Info / Resources */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
                            <div className="absolute top-[-10px] right-[-10px] p-8 bg-primary/20 rounded-full blur-2xl" />
                            <CardHeader>
                                <CardTitle className="text-2xl text-primary font-black">PRO PLAN</CardTitle>
                                <CardDescription className="text-slate-400">Your advanced tools are active.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4 mb-8">
                                    {["Full AI Studio Access", "Unlimited Surveying Projects", "BIM Clash Detection Hub", "Priority Support"].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                            <div className="p-1 rounded-full bg-primary/20 text-primary">
                                                <Plus className="w-3 h-3" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Button className="w-full bg-primary text-white border-none h-12 font-bold">Manage Subscription</Button>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Marketplace Pricing</CardTitle>
                                <CardDescription>Live data for current BoQ estimates.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { item: "Cement (Standard)", price: "₦ 7,200", trend: "up" },
                                    { item: "Reinforcement (16mm)", price: "₦ 12,500", trend: "down" },
                                    { item: "Hardwood Granite", price: "₦ 15,200", trend: "stable" },
                                ].map((p, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-slate-50">
                                        <span className="text-sm font-medium">{p.item}</span>
                                        <span className="text-sm font-bold">{p.price}</span>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-xs font-bold text-primary">Full Market Hub Index</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProDashboard;
