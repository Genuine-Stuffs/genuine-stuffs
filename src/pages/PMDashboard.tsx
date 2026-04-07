import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { 
    Users, 
    ShieldCheck, 
    ShoppingBag, 
    AlertTriangle, 
    Search, 
    Bell, 
    Menu, 
    X, 
    BarChart3, 
    Store, 
    Briefcase, 
    UserCheck, 
    FileText,
    LogOut,
    CheckCircle2,
    Sun,
    Moon,
    ArrowRight,
    Calculator,
    Settings,
    Download,
    Database,
    DollarSign,
    RefreshCw,
    Activity,
    ServerCrash,
    HardDrive,
    Zap,
    Cpu
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useAdminStats, usePendingVerifications, useListingReports, usePendingMaterials } from "@/hooks/useAdminData";
import { toast } from "sonner";
import { supabase } from "backend/supabaseClient";
import ManagementTable from "@/components/admin/ManagementTable";
import ContentModerationTable from "@/components/admin/ContentModerationTable";
import IncidentReportTable from "@/components/admin/IncidentReportTable";
import Logo from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";

const PMDashboard = () => {
    const navigate = useNavigate();
    const { user, role, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [broadcastSubject, setBroadcastSubject] = useState("Marketplace Update");
    const [broadcastAudience, setBroadcastAudience] = useState<string[]>(['vendor', 'pro']);

    // Tax System State
    const [isTaxSystemOpen, setIsTaxSystemOpen] = useState(false);
    const [taxRate, setTaxRate] = useState("7.5");
    const [activeTaxTab, setActiveTaxTab] = useState("evaluation");

    // Real data hooks
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
    const { data: pendingVendors, isLoading: vendorsLoading, refetch: refetchVendors } = usePendingVerifications('vendor');
    const { data: pendingPros, isLoading: prosLoading, refetch: refetchPros } = usePendingVerifications('professional');
    const { data: pendingMaterials, isLoading: materialsLoading, refetch: refetchMaterials } = usePendingMaterials();
    const { data: incidentReports, isLoading: reportsLoading, refetch: refetchReports } = useListingReports();

    if (role !== 'pm' && role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const handleApproval = async (id: string, type: 'vendor' | 'professional') => {
        const table = type === 'vendor' ? 'vendors' : 'professionals';
        const updateData = type === 'vendor' ? { verified_status: 'approved' } : { is_verified: true };

        try {
            const { error } = await supabase.from(table).update(updateData).eq('id', id);
            if (error) throw error;
            
            toast.success(`${type === 'vendor' ? 'Vendor' : 'Professional'} successfully verified!`);
            refetchStats();
            if (type === 'vendor') refetchVendors();
            else refetchPros();
        } catch (err) {
            console.error("Verification failed:", err);
            toast.error("Failed to update verification status.");
        }
    };

    const handleRejection = async (id: string, type: 'vendor' | 'professional') => {
        const table = type === 'vendor' ? 'vendors' : 'professionals';
        const updateData = type === 'vendor' ? { verified_status: 'rejected' } : { is_verified: false }; // Pros stay unverified

        try {
            const { error } = await supabase.from(table).update(updateData).eq('id', id);
            if (error) throw error;
            
            toast.info(`Application ${type === 'vendor' ? 'rejected' : 'flagged'}.`);
            if (type === 'vendor') refetchVendors();
            else refetchPros();
        } catch (err) {
            console.error("Rejection failed:", err);
            toast.error("Process failed.");
        }
    };

    const statCards = [
        { label: "Active Vendors", value: stats?.totalVendors || 0, icon: Store, trend: "+12%", color: "text-blue-600" },
        { label: "Pending Vendors", value: stats?.pendingVendors || 0, icon: AlertTriangle, trend: "Priority", color: "text-amber-600" },
        { label: "Pending Professionals", value: stats?.pendingPros || 0, icon: ShieldCheck, trend: "Action Required", color: "text-red-600" },
        { label: "Marketplace Assets", value: stats?.totalMaterials || 0, icon: ShoppingBag, trend: "+5.1k", color: "text-emerald-600" },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-200 transition-colors duration-300">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-10">
                            <Logo iconClassName="h-10" textClassName="dark:!text-white !text-slate-900" />
                        </div>

                        <nav className="space-y-2">
                            {[
                                { id: "overview", icon: BarChart3, label: "Overview" },
                                { id: "vendors", icon: Store, label: "Vendor Pipeline" },
                                { id: "pros", icon: UserCheck, label: "Pro Verification" },
                                { id: "materials", icon: ShoppingBag, label: "Content Moderation" },
                                { id: "reports", icon: AlertTriangle, label: "Incident Reports" },
                                { id: "team", icon: Users, label: "Team Management" },
                                { id: "system", icon: Activity, label: "System Maintenance" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { 
                                        if (item.id === 'system') {
                                            navigate('/pm/system-maintenance');
                                        } else {
                                            setActiveTab(item.id); 
                                        }
                                        setSidebarOpen(false); 
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto p-8 border-t border-slate-200 dark:border-white/5">
                        <button 
                            onClick={logout}
                            className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-red-500 font-bold transition-colors text-sm"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <button 
                            className="lg:hidden p-2 text-slate-400"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {activeTab.replace("-", " ")}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-red-500 transition-colors" size={16} />
                            <Input 
                                placeholder="Global Search..." 
                                className="w-64 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 rounded-xl pl-10 h-10 text-sm focus:ring-red-600/50 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                            <button 
                                onClick={() => setTheme('light')}
                                className={`p-2 rounded-xl transition-all ${theme === 'light' ? 'bg-white text-orange-500 shadow-sm scale-105' : 'text-slate-400 hover:bg-white/30'}`}
                                title="Light Mode"
                            >
                                <Sun size={18} />
                            </button>
                            <button 
                                onClick={() => setTheme('dark')}
                                className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-sm scale-105' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                title="Dark Mode"
                            >
                                <Moon size={18} />
                            </button>
                        </div>
                        <button className="relative text-slate-400 hover:text-red-500 transition-colors p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl shadow-sm border border-slate-200 dark:border-white/5">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-white dark:border-[#0F172A]" />
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{user?.email?.split('@')[0]}</p>
                                <Badge className="bg-red-600/10 text-red-500 border-none text-[8px]">SUPER ADMIN</Badge>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-red-400 flex items-center justify-center font-black text-white border-2 border-white/10 shadow-lg shadow-red-600/20">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {/* Dynamic Rendering of Tabs */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {statCards.map((card, idx) => (
                                    <Card key={idx} className="bg-white dark:bg-[#1E293B]/50 border-slate-200 dark:border-white/5 p-6 rounded-[2rem] hover:border-red-600/30 transition-all group overflow-hidden relative shadow-sm hover:shadow-xl dark:shadow-none">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-red-600/10 transition-colors" />
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-white/5 text-red-500`}>
                                                <card.icon size={22} />
                                            </div>
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px] uppercase">{card.trend}</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{card.label}</p>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                {statsLoading ? "..." : card.value.toLocaleString()}
                                            </h3>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Verification Feed Preview */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <Card className="xl:col-span-2 bg-white dark:bg-[#1E293B]/50 border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Pending Vendors</h3>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">Pending CAC and Identity verification.</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setActiveTab('vendors')}
                                            className="group text-red-500 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-red-600 hover:text-white transition-all duration-300 rounded-xl px-5 h-10 shadow-sm hover:shadow-lg hover:shadow-red-600/20 active:scale-95 border border-red-600/10 hover:border-red-600"
                                        >
                                            View Pipeline <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                    <div className="p-4">
                                        <ManagementTable 
                                            data={pendingVendors?.slice(0, 5) || []} 
                                            isLoading={vendorsLoading} 
                                            type="vendor"
                                            onApprove={(id) => handleApproval(id, 'vendor')}
                                            onReject={(id) => handleRejection(id, 'vendor')}
                                            onView={(item) => console.log("View", item)}
                                        />
                                    </div>
                                </Card>

                                <Card className="bg-white dark:bg-[#1E293B]/50 border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Quick Actions</h3>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">Execute high-priority tasks.</p>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {[
                                                { 
                                                    label: "Marketplace Broadcast", 
                                                    icon: Bell, 
                                                    color: "bg-blue-600",
                                                    action: () => setIsBroadcastOpen(true)
                                                },
                                                { 
                                                    label: "Tax Control Center", 
                                                    icon: Calculator, 
                                                    color: "bg-purple-600",
                                                    action: () => setIsTaxSystemOpen(true)
                                                },
                                                { 
                                                    label: "Review Flagged Items", 
                                                    icon: AlertTriangle, 
                                                    color: "bg-red-600",
                                                    action: () => {
                                                        setActiveTab('reports');
                                                        toast.info("Navigated to Incident Reports");
                                                    }
                                                },
                                                { 
                                                    label: "System Maintenance", 
                                                    icon: Activity, 
                                                    color: "bg-emerald-600",
                                                    action: () => navigate('/pm/system-maintenance')
                                                },
                                            ].map((action, idx) => (
                                                <button 
                                                    key={idx} 
                                                    onClick={() => action.action?.()}
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group font-bold text-sm text-slate-600 dark:text-slate-300"
                                                >
                                                    <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}>
                                                        <action.icon size={18} />
                                                    </div>
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vendors' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vendor Management Pipeline</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Review and approve vendor business credentials.</p>
                            </div>
                            <ManagementTable 
                                data={pendingVendors || []} 
                                isLoading={vendorsLoading} 
                                type="vendor"
                                onApprove={(id) => handleApproval(id, 'vendor')}
                                onReject={(id) => handleRejection(id, 'vendor')}
                                onView={(item) => console.log("View", item)}
                            />
                        </div>
                    )}

                    {activeTab === 'pros' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Professional Verification</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Verify professional licenses and specialties.</p>
                            </div>
                            <ManagementTable 
                                data={pendingPros || []} 
                                isLoading={prosLoading} 
                                type="professional"
                                onApprove={(id) => handleApproval(id, 'professional')}
                                onReject={(id) => handleRejection(id, 'professional')}
                                onView={(item) => console.log("View", item)}
                            />
                        </div>
                    )}

                    {activeTab === 'materials' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Content Moderation Pipeline</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Review new marketplace listings for accuracy and quality.</p>
                            </div>
                            <ContentModerationTable 
                                data={pendingMaterials || []} 
                                isLoading={materialsLoading} 
                                onApprove={async (id) => {
                                    const { error } = await supabase.from('materials').update({ is_verified: true }).eq('id', id);
                                    if (error) toast.error("Failed to approve listing.");
                                    else { toast.success("Listing verified!"); refetchMaterials(); refetchStats(); }
                                }}
                                onReject={async (id) => {
                                    const { error } = await supabase.from('materials').delete().eq('id', id);
                                    if (error) toast.error("Failed to delete listing.");
                                    else { toast.info("Listing rejected and removed."); refetchMaterials(); refetchStats(); }
                                }}
                                onView={(item) => console.log("View material", item)}
                            />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8 flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Incident Reports</h3>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Flagged listings and user complaints.</p>
                                </div>
                                <Badge className="bg-red-600/20 text-red-500 font-black h-6 px-3">{incidentReports?.length || 0} ACTIVE</Badge>
                            </div>
                            <IncidentReportTable 
                                data={incidentReports || []} 
                                isLoading={reportsLoading} 
                                onResolve={async (id) => {
                                    const { error } = await supabase.from('listing_reports').delete().eq('id', id);
                                    if (error) toast.error("Failed to resolve report.");
                                    else { toast.success("Report resolved and cleared."); refetchReports(); }
                                }}
                                onDismiss={async (id) => {
                                    const { error } = await supabase.from('listing_reports').delete().eq('id', id);
                                    if (error) toast.error("Failed to dismiss report.");
                                    else { toast.info("Report dismissed."); refetchReports(); }
                                }}
                                onView={(item) => console.log("View report context", item)}
                            />
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto py-12">
                            <Card className="bg-white dark:bg-[#1E293B]/50 border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-xl dark:shadow-2xl">
                                <div className="text-center mb-10">
                                    <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Users className="text-red-500 w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Expand Admin Team</h3>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Grant Product Manager privileges to other users.</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-2">Target User Email</p>
                                        <Input 
                                            id="admin_email"
                                            placeholder="new-admin@genuinestuffs.com"
                                            className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 h-14 rounded-2xl font-bold px-6 focus:ring-red-600/50 dark:text-white"
                                        />
                                    </div>

                                    <Button 
                                        className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-red-600/20"
                                        onClick={async () => {
                                            const email = (document.getElementById('admin_email') as HTMLInputElement).value;
                                            if (!email) { toast.error("Please enter an email address."); return; }
                                            
                                            toast.loading("Processing promotion...");
                                            
                                            // Promotion logic (Note: This assumes the promote_user_to_pm RPC exists)
                                            try {
                                                const { data, error } = await (supabase as any).rpc('promote_user_to_pm', { user_email: email });
                                                toast.dismiss();
                                                
                                                if (error) {
                                                    console.error(error);
                                                    toast.error("Internal promotion failed. Please use SQL Editor.");
                                                } else {
                                                    toast.success("User successfully promoted to PM!");
                                                }
                                            } catch (err) {
                                                toast.dismiss();
                                                toast.error("Process failed.");
                                            }
                                        }}
                                    >
                                        Promote to PM <ShieldCheck size={18} />
                                    </Button>

                                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-600 dark:text-amber-200/70 italic flex gap-4">
                                        <AlertTriangle size={32} className="shrink-0 text-amber-500" />
                                        <p>Warning: Promoting a user grants them full administrative control over vendors, professionals, and marketplace content. This action is logged for audit purposes.</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* old system tab removed - migrated to standalone page */}
                </div>
            </main>

            {/* Broadcast Modal */}
            <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                <DialogContent className="bg-white dark:bg-[#1E293B] border-none rounded-[2.5rem] p-8 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Compose Broadcast</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium italic">
                            Select which segments of the ecosystem should receive this announcement.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-6">
                        {/* Audience Filter */}
                        <div className="space-y-3 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2 mb-2">Target Audience</p>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { id: 'vendor', label: 'Vendors', count: 124 },
                                    { id: 'pro', label: 'Professionals', count: 328 },
                                    { id: 'guest', label: 'Guests', count: 1540 },
                                ].map((group) => (
                                    <div key={group.id} className="flex items-center space-x-3 bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                        <Checkbox 
                                            id={group.id} 
                                            checked={broadcastAudience.includes(group.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setBroadcastAudience([...broadcastAudience, group.id]);
                                                else setBroadcastAudience(broadcastAudience.filter(a => a !== group.id));
                                            }}
                                            className="border-slate-300 dark:border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        />
                                        <Label htmlFor={group.id} className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                            {group.label} <span className="text-[10px] text-slate-400 ml-1">({group.count})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Broadcast Subject</label>
                            <Input 
                                value={broadcastSubject}
                                onChange={(e) => setBroadcastSubject(e.target.value)}
                                className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 h-12 rounded-2xl font-bold dark:text-white"
                                placeholder="e.g. System Maintenance"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Message Content</label>
                            <Textarea 
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                rows={4}
                                className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-[2rem] font-medium p-6 dark:text-white resize-none"
                                placeholder="Write your announcement here..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsBroadcastOpen(false)}
                            className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button 
                            disabled={!broadcastMessage || broadcastAudience.length === 0}
                            onClick={async () => {
                                const id = toast.loading(`Preparing broadcast for ${broadcastAudience.length} segments...`);
                                // Simulated logic
                                setTimeout(() => {
                                    toast.success(`Broadcast successfully delivered to selected segments.`, { id });
                                    setIsBroadcastOpen(false);
                                    setBroadcastMessage("");
                                }, 2500);
                            }}
                            className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-red-600/20"
                        >
                            Send Broadcast <Bell size={18} />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tax Evaluation & Control Center Modal */}
            <Dialog open={isTaxSystemOpen} onOpenChange={setIsTaxSystemOpen}>
                <DialogContent className="bg-slate-50 dark:bg-[#1E293B] border-slate-200 dark:border-white/10 rounded-[2.5rem] p-0 max-w-5xl overflow-hidden shadow-2xl">
                    <div className="flex h-[80vh]">
                        {/* Tax Center Sidebar */}
                        <div className="w-64 bg-white dark:bg-[#0F172A]/50 border-r border-slate-200 dark:border-white/5 p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-8 text-purple-600 dark:text-purple-400">
                                <Database size={28} />
                                <div>
                                    <h3 className="font-black tracking-tight text-slate-900 dark:text-white leading-none">TAX SYSTEM</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Control Center</p>
                                </div>
                            </div>

                            <nav className="space-y-2 flex-grow">
                                {[
                                    { id: 'evaluation', icon: BarChart3, label: 'Evaluation' },
                                    { id: 'config', icon: Settings, label: 'Tax Configuration' },
                                    { id: 'reports', icon: FileText, label: 'Filing & Reports' },
                                    { id: 'sop', icon: ShieldCheck, label: 'Compliance & SOP' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTaxTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTaxTab === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                    >
                                        <tab.icon size={18} />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tax Center Main View */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTaxTab === 'evaluation' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Real-Time Evaluation</h2>
                                        <p className="text-sm font-medium italic text-slate-500">Monitor current platform transaction capacity and estimated tax liabilities.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="bg-white dark:bg-white/5 border-none p-6 rounded-3xl shadow-sm">
                                            <div className="flex items-center gap-3 mb-4 text-emerald-500">
                                                <DollarSign size={20} />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Gross Platform Volume (YTD)</h4>
                                            </div>
                                            <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">₦24,500,000</p>
                                        </Card>
                                        <Card className="bg-white dark:bg-white/5 border-none p-6 rounded-3xl shadow-sm">
                                            <div className="flex items-center gap-3 mb-4 text-purple-500">
                                                <Calculator size={20} />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Estimated Tax Liability</h4>
                                            </div>
                                            <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">₦1,837,500</p>
                                            <p className="text-xs font-bold text-purple-500 mt-2">Based on active {taxRate}% rate</p>
                                        </Card>
                                    </div>

                                    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl">
                                        <h4 className="font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 text-xs mb-3">Auditable Tax Logic</h4>
                                        <div className="space-y-4">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                                                Tax figures are arrived at by aggregating the <span className="font-bold">Gross Platform Volume (GPV)</span> across all successful transactions and applying the currently active <span className="font-bold underline text-blue-600">Base Tax Rate</span>. 
                                            </p>
                                            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl space-y-2">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Evaluation Formula</p>
                                                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">Tax_Liability = Σ(Vendor_Payout + Transaction_Fees) * ACTIVE_RATE_PERCENTAGE</p>
                                            </div>
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                                                As a PM, you can evaluate what is being taxed by reviewing individual audit logs in the <span className="italic font-bold">Filing & Reports</span> tab, ensuring that only applicable professional fees and material commissions are included in the taxable pool.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTaxTab === 'config' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Tax Configuration</h2>
                                        <p className="text-sm font-medium italic text-slate-500">Set platform-wide tax variables. Changes affect future transactions.</p>
                                    </div>

                                    <Card className="bg-white dark:bg-white/5 border-none p-8 rounded-3xl shadow-sm space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Base Tax Rate (%)</label>
                                            <div className="flex gap-4">
                                                <Input 
                                                    type="number"
                                                    value={taxRate}
                                                    onChange={(e) => setTaxRate(e.target.value)}
                                                    className="bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-white/10 h-14 rounded-2xl font-black text-xl px-6 max-w-[200px] dark:text-white"
                                                />
                                                <Button 
                                                    onClick={() => {
                                                        const id = toast.loading("Updating Global Tax Configuration...");
                                                        setTimeout(() => toast.success(`Base rate successfully updated to ${taxRate}%`, { id }), 1500);
                                                    }}
                                                    className="h-14 px-8 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 font-black uppercase tracking-widest text-xs transition-all shadow-xl"
                                                >
                                                    <RefreshCw size={16} className="mr-2" /> Update Rate
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-200 dark:border-white/5">
                                            <h4 className="font-black uppercase tracking-widest text-slate-900 dark:text-white text-sm mb-4">Tax Rules & Exceptions</h4>
                                            <div className="space-y-3">
                                                {[
                                                    { label: "Apply VAT to Professional Consultation Fees", active: true },
                                                    { label: "Exempt Raw Building Materials (Government Directive)", active: false },
                                                    { label: "Enable Automated End-of-Month Filing Drafts", active: true }
                                                ].map((rule, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5">
                                                        <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{rule.label}</span>
                                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${rule.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${rule.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {activeTaxTab === 'reports' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Filing & Reports</h2>
                                        <p className="text-sm font-medium italic text-slate-500">Generate compliance documentation for regulatory bodies.</p>
                                    </div>

                                    <div className="grid gap-4">
                                        {[
                                            { period: "Q1 2026 Tax Summary", date: "April 1, 2026", status: "Ready to File" },
                                            { period: "Q4 2025 Tax Summary", date: "Jan 5, 2026", status: "Filed & Audited" },
                                            { period: "Q3 2025 Tax Summary", date: "Oct 2, 2025", status: "Filed & Audited" }
                                        ].map((report, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-white/5 border-none shadow-sm">
                                                <div>
                                                    <h4 className="font-black text-slate-900 dark:text-white">{report.period}</h4>
                                                    <p className="text-xs font-bold text-slate-400 mt-1">Generated: {report.date}</p>
                                                    <Badge className={`mt-3 ${report.status === 'Ready to File' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} border-none uppercase text-[10px]`}>
                                                        {report.status}
                                                    </Badge>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => toast.success("Report downloaded successfully.")}
                                                    className="w-12 h-12 rounded-full bg-slate-50 dark:bg-[#0F172A] hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-900/40 text-slate-400 transition-all"
                                                >
                                                    <Download size={18} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTaxTab === 'sop' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Standard Business Procedure</h2>
                                        <p className="text-sm font-medium italic text-slate-500">Regulatory guidelines and platform-wide tax handling protocols.</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-red-600" /> Phase 1: Aggregation & Transparency
                                            </h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                                                Objective: Ensure every marketplace transaction triggers an immutable ledger entry.
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                PMs must verify that vendor commission rates align with the current fiscal policy before end-of-month (EOM) reconciliation. Discrepancies should be flagged immediately.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-red-600" /> Phase 2: Reconciliation & Auditing
                                            </h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                                                Objective: Digital closure of the fiscal period.
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                The Product Owner is required to "Acknowledge" the platform's EOM report. This creates a digitally signed artifact used for internal audits and government filings.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-red-600" /> Phase 3: Dispute Mitigation
                                            </h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                                                Objective: Maintain vendor trust and regulatory compliance.
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                In cases where professional vendors claim tax exemptions, the PM must manually flag the transaction in the Content Moderation area and attach valid tax-exemption identification.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default PMDashboard;
