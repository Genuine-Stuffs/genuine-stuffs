import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    User, 
    Building2, 
    Shield, 
    Bell, 
    Smartphone, 
    Globe, 
    Camera,
    CheckCircle2,
    AlertCircle,
    Save,
    MapPin,
    Briefcase,
    Mail,
    Phone
} from "lucide-react";
import { VerificationBanner } from "@/components/VerificationBanner";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const VendorSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [vendorData, setVendorData] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchVendorData();
        }
    }, [user]);

    const fetchVendorData = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error) throw error;
            setVendorData(data);
        } catch (error) {
            console.error("Error fetching vendor settings:", error);
        }
    };

    const handleSaveProfile = async () => {
        setIsLoading(true);
        try {
            // Mock update for now
            setTimeout(() => {
                toast({
                    title: "Settings Updated",
                    description: "Your profile changes have been saved successfully.",
                });
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update settings. Please try again.",
                variant: "destructive"
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 pb-20 md:pb-0">
            <Navbar />
            
            <div className="flex">
                <VendorSidebar />

                <main className="flex-1 overflow-hidden">
                    <VerificationBanner />
                    
                    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
                        {/* Header */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Account Settings</h1>
                                <p className="text-muted-foreground dark:text-slate-400 font-medium italic">
                                    Manage your vendor profile and business preferences.
                                </p>
                            </div>
                            <Button 
                                onClick={handleSaveProfile} 
                                disabled={isLoading}
                                className="h-11 rounded-xl gap-2 font-black uppercase tracking-widest text-[11px] px-8 shadow-lg shadow-primary/20"
                            >
                                {isLoading ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Navigation Sidebar (Mobile Scrollable) */}
                            <div className="lg:col-span-1">
                                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden sticky top-24">
                                    <CardContent className="p-4">
                                        <div className="space-y-1">
                                            {[
                                                { id: 'profile', icon: User, label: 'Profile' },
                                                { id: 'business', icon: Building2, label: 'Business' },
                                                { id: 'security', icon: Shield, label: 'Security' },
                                                { id: 'notifications', icon: Bell, label: 'Alerts' },
                                            ].map((item) => (
                                                <button 
                                                    key={item.id}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${item.id === 'profile' ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content Area */}
                            <div className="lg:col-span-3 space-y-8">
                                {/* Profile Section */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                    <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">Public Profile</CardTitle>
                                        <CardDescription className="italic font-medium">This information will be visible to potential clients.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="relative group cursor-pointer">
                                                <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                                                    {vendorData?.logo_url ? (
                                                        <img src={vendorData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-xl shadow-lg">
                                                    <Camera className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-4 w-full">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Company Name</Label>
                                                        <Input defaultValue={vendorData?.company_name} placeholder="e.g. Acme Construction Supplies" className="h-11 rounded-xl bg-slate-50/50 border-none font-bold" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Display Category</Label>
                                                        <Input defaultValue={vendorData?.categories?.[0]} placeholder="e.g. Cement & Aggregates" className="h-11 rounded-xl bg-slate-50/50 border-none font-bold" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Company Bio</Label>
                                                    <Textarea defaultValue={vendorData?.bio} placeholder="Describe your business and specialties..." className="min-h-[100px] rounded-2xl bg-slate-50/50 border-none font-medium text-sm p-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Business Verification Section */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                    <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">Business Verification</CardTitle>
                                        <CardDescription className="italic font-medium">Verify your credentials to build trust with clients.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className={`p-6 rounded-3xl border flex items-start gap-4 ${vendorData?.verified_status === 'approved' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-orange-50/50 border-orange-100 text-orange-800'}`}>
                                            {vendorData?.verified_status === 'approved' ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <AlertCircle className="w-6 h-6 flex-shrink-0" />}
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight mb-1">
                                                    Status: {vendorData?.verified_status?.toUpperCase() || 'PENDING'}
                                                </p>
                                                <p className="text-xs font-medium italic opacity-80">
                                                    {vendorData?.verified_status === 'approved' 
                                                        ? 'Your business has been fully verified. You have access to all premium marketplace features.' 
                                                        : 'Your verification is currently under review. This typically takes 24-48 hours.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                                    <div className="flex-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">CAC Number</Label>
                                                        <p className="font-black text-sm tabular-nums">{vendorData?.cac_number || 'RC-892341'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    <div className="flex-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Business Email</Label>
                                                        <p className="font-black text-sm">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                    <div className="flex-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Phone Number</Label>
                                                        <p className="font-black text-sm tabular-nums">{vendorData?.phone || '+234 801 234 5678'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <div className="flex-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Primary Location</Label>
                                                        <p className="font-black text-sm">{vendorData?.city || 'Lagos'}, {vendorData?.country || 'Nigeria'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Security & Notifications Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest">Alerts</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Email Notifications</span>
                                                <Switch checked />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-300">SMS Alerts</span>
                                                <Switch />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Inventory Status</span>
                                                <Switch checked />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest">Security</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 space-y-4">
                                            <Button variant="outline" className="w-full h-11 rounded-xl border-slate-700 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest">
                                                Change Password
                                            </Button>
                                            <Button variant="outline" className="w-full h-11 rounded-xl border-slate-700 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest">
                                                Two-Factor Auth
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VendorSettings;
