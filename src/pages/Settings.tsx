import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "backend/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Building2, Phone, FileText, Camera, Loader2, Save } from "lucide-react";

const Settings = () => {
    const { user, role } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const table = role === 'vendor' ? 'vendors' : 'professionals';
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setProfile(data);
            } catch (error: any) {
                console.error("Error fetching profile:", error);
                toast.error("Failed to load profile data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user, role]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        const table = role === 'vendor' ? 'vendors' : 'professionals';

        try {
            const { error } = await supabase
                .from(table)
                .update(profile)
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="mt-4 font-black uppercase tracking-widest text-xs text-slate-400">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-10 text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                            Account <span className="text-primary italic">Settings</span>
                        </h1>
                        <p className="text-xl text-muted-foreground dark:text-slate-400 font-medium italic">
                            Manage your platform identity and business information.
                        </p>
                    </header>

                    <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Photo Section */}
                        <div className="lg:col-span-1">
                            <Card className="border-none shadow-xl dark:bg-card rounded-[2.5rem] overflow-hidden sticky top-24">
                                <CardContent className="p-8 text-center">
                                    <div className="relative w-32 h-32 mx-auto mb-6 group">
                                        <div className="w-full h-full bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 dark:border-white/10 group-hover:border-primary/50 transition-all shadow-inner">
                                            {profile?.avatar_url || profile?.logo_url ? (
                                                <img src={profile.avatar_url || profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                                            )}
                                        </div>
                                        <button type="button" className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all">
                                            <Camera className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {role === 'vendor' ? profile?.company_name : profile?.full_name}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                        {role} Account
                                    </p>

                                    <div className="mt-8 pt-8 border-t dark:border-white/10">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Registration Status</p>
                                        <div className="flex items-center justify-center gap-2 text-green-500 bg-green-500/10 py-2 rounded-xl border border-green-500/20">
                                            <Building2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Verified Member</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Form Fields Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-none shadow-xl dark:bg-card rounded-[2.5rem] transition-colors overflow-hidden">
                                <CardHeader className="bg-primary/5 dark:bg-white/5 border-b dark:border-white/10 p-8">
                                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-primary" /> Profile Details
                                    </CardTitle>
                                    <CardDescription className="dark:text-slate-400 font-medium italic">Update your public facing information.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="display_name" className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            {role === 'vendor' ? "Company Name" : "Full Name"}
                                        </Label>
                                        <Input
                                            id="display_name"
                                            value={role === 'vendor' ? (profile?.company_name || "") : (profile?.full_name || "")}
                                            onChange={(e) => setProfile(prev => ({ ...prev, [role === 'vendor' ? 'company_name' : 'full_name']: e.target.value }))}
                                            className="h-12 bg-slate-50 dark:bg-white/5 border-none rounded-2xl font-bold dark:text-white"
                                        />
                                    </div>

                                    {role === 'vendor' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400">Business Phone</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="phone"
                                                    value={profile?.phone || ""}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="pl-11 h-12 bg-slate-50 dark:bg-white/5 border-none rounded-2xl font-bold dark:text-white"
                                                    placeholder="+234"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="bio" className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            {role === 'vendor' ? "Business Description" : "Professional Bio"}
                                        </Label>
                                        <Textarea
                                            id="bio"
                                            rows={5}
                                            value={role === 'vendor' ? (profile?.description || "") : (profile?.bio || "")}
                                            onChange={(e) => setProfile(prev => ({ ...prev, [role === 'vendor' ? 'description' : 'bio']: e.target.value }))}
                                            placeholder={role === 'vendor' ? "Describe your services and material specialties..." : "Tell the community about your architectural or engineering expertise..."}
                                            className="bg-slate-50 dark:bg-white/5 border-none rounded-[2rem] font-bold dark:text-white resize-none p-6"
                                        />
                                    </div>

                                    <div className="pt-6 border-t dark:border-white/10 flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isSaving}
                                            className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all font-black uppercase tracking-widest text-xs gap-3"
                                        >
                                            {isSaving ? (
                                                <>Syncing... <Loader2 className="w-4 h-4 animate-spin" /></>
                                            ) : (
                                                <>Save Changes <Save className="w-4 h-4" /></>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Settings;
