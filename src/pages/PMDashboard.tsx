import { useState } from "react";
import { Navigate } from "react-router-dom";
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
    Moon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    const { user, role, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    // Real data hooks
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
    const { data: pendingVendors, isLoading: vendorsLoading, refetch: refetchVendors } = usePendingVerifications('vendor');
    const { data: pendingPros, isLoading: prosLoading, refetch: refetchPros } = usePendingVerifications('professional');
    const { data: pendingMaterials, isLoading: materialsLoading, refetch: refetchMaterials } = usePendingMaterials();
    const { data: incidentReports, isLoading: reportsLoading, refetch: refetchReports } = useListingReports();

    if (role !== 'pm') {
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
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
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
                                            className="text-red-500 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-red-600/5"
                                        >
                                            View Pipeline <CheckCircle2 size={14} />
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
                                                { label: "Marketplace Broadcast", icon: Bell, color: "bg-blue-600" },
                                                { label: "Generate Tax Report", icon: FileText, color: "bg-purple-600" },
                                                { label: "Review Flagged Items", icon: AlertTriangle, color: "bg-red-600" },
                                                { label: "System Maintenance", icon: BarChart3, color: "bg-emerald-600" },
                                            ].map((action, idx) => (
                                                <button key={idx} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group font-bold text-sm text-slate-600 dark:text-slate-300">
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
                </div>
            </main>
        </div>
    );
};

export default PMDashboard;
