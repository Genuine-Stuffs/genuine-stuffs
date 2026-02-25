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
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-2xl">
                    {!submitted ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Professional Registration</h1>
                                <p className="text-lg text-muted-foreground">
                                    Access AI-powered innovation tools, BIM models, and project lifecycle management.
                                </p>
                            </div>

                            <Card className="border-2 shadow-xl">
                                <CardHeader className="bg-primary/5 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6 text-primary" />
                                        Join the Industry Elite
                                    </CardTitle>
                                    <CardDescription>
                                        Fill in your details to create your professional account.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
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

                                        <div className="space-y-3 pt-4 border-t">
                                            <Label className="text-base font-bold">Registration Type</Label>
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
                                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                                    >
                                                        <User className="mb-3 h-6 w-6" />
                                                        <span className="font-bold">Individual Professional</span>
                                                    </Label>
                                                </div>
                                                <div>
                                                    <RadioGroupItem value="organization" id="organization" className="peer sr-only" />
                                                    <Label
                                                        htmlFor="organization"
                                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                                    >
                                                        <Building2 className="mb-3 h-6 w-6" />
                                                        <span className="font-bold">Organization / Firm</span>
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" required value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                                        </div>

                                        <Button type="submit" className="w-full h-12 text-lg gap-2" size="lg" disabled={isLoading}>
                                            {isLoading ? (
                                                <>Creating Account... <Loader2 className="w-5 h-5 animate-spin" /></>
                                            ) : (
                                                <>Create Professional Account <Check className="w-5 h-5" /></>
                                            )}
                                        </Button>

                                        <p className="text-center text-sm text-muted-foreground mt-4">
                                            By registering, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
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
