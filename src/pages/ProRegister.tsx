import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, User, Briefcase, Building2, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

const ProRegister = () => {
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        proType: "",
        password: "",
        registrationType: "individual"
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: 'professional'
                    }
                }
            });

            if (authError) throw authError;

            // 2. Create professional profile
            if (authData.user) {
                const { error: profileError } = await supabase.from('professionals').insert({
                    id: authData.user.id,
                    full_name: formData.fullName,
                    specialty: formData.proType,
                });

                if (profileError) throw profileError;
            }

            toast.success("Professional account created!");
            setSubmitted(true);
        } catch (err: any) {
            toast.error(err.message || "Registration failed");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-2xl">
                    {!submitted ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h1 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Professional <span className="text-primary italic">Onboarding</span></h1>
                                <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed italic">
                                    Access AI-powered innovation tools, BIM models, and project lifecycle management.
                                </p>
                            </div>

                            <Card className="border-none shadow-2xl dark:bg-card rounded-[2.5rem] overflow-hidden transition-colors">
                                <CardHeader className="bg-primary/5 dark:bg-white/5 border-b dark:border-white/10 p-8">
                                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        <ShieldCheck className="w-8 h-8 text-primary" />
                                        Join the Elite
                                    </CardTitle>
                                    <CardDescription className="dark:text-slate-400 font-medium italic">
                                        Fill in your details to create your professional account.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-10">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">Full Name</Label>
                                                <Input id="firstName" placeholder="Jane Doe" required value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="proType">Professional Discipline</Label>
                                                <Input id="proType" placeholder="e.g. Architect, QS, Engineer" required value={formData.proType} onChange={(e) => handleInputChange('proType', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" type="email" placeholder="jane@studio.com" required value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>

                                        <div className="space-y-4 pt-6 border-t dark:border-white/10 transition-colors">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Account Strategy</Label>
                                            <RadioGroup
                                                defaultValue="individual"
                                                value={formData.registrationType}
                                                onValueChange={(val) => handleInputChange('registrationType', val)}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            >
                                                <div>
                                                    <RadioGroupItem value="individual" id="individual" className="peer sr-only" />
                                                    <Label
                                                        htmlFor="individual"
                                                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-6 hover:bg-white dark:hover:bg-white/10 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-white dark:peer-data-[state=checked]:bg-white/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                                    >
                                                        <User className="mb-3 h-8 w-8 text-primary" />
                                                        <span className="font-black uppercase tracking-tight text-xs">Individual</span>
                                                    </Label>
                                                </div>
                                                <div>
                                                    <RadioGroupItem value="organization" id="organization" className="peer sr-only" />
                                                    <Label
                                                        htmlFor="organization"
                                                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-6 hover:bg-white dark:hover:bg-white/10 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-white dark:peer-data-[state=checked]:bg-white/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                                    >
                                                        <Building2 className="mb-3 h-8 w-8 text-primary" />
                                                        <span className="font-black uppercase tracking-tight text-xs">Firm / Entity</span>
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" required value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                                        </div>

                                        <Button type="submit" className="w-full h-14 text-lg gap-2 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]" size="lg" disabled={isLoading}>
                                            {isLoading ? (
                                                <>Syncing... <Loader2 className="w-5 h-5 animate-spin" /></>
                                            ) : (
                                                <>Initialize Portal <ChevronRight className="w-5 h-5" /></>
                                            )}
                                        </Button>

                                        <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-6">
                                            Trusted by over 500+ Architecture firms in Nigeria.
                                        </p>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Briefcase className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Welcome to the Platform!</h2>
                            <p className="text-xl text-muted-foreground mb-8">
                                Your professional account has been created. You now have access to our basic suite of innovation tools.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild size="lg" className="px-10">
                                    <Link to="/pro-portal">Go to Dashboard</Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="px-10">
                                    <Link to="/pro/ai-studio">Try AI Studio</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProRegister;
