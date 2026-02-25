import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Upload, Building2, User, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

const VendorRegister = () => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const totalSteps = 4;

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        companyName: "",
        bizRegNumber: "",
        address: "",
        city: "",
        phone: "",
        categories: [] as string[]
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryToggle = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        role: 'vendor'
                    }
                }
            });

            if (authError) throw authError;

            // 2. Create vendor profile
            if (authData.user) {
                const { error: profileError } = await supabase.from('vendors').insert({
                    id: authData.user.id,
                    company_name: formData.companyName,
                    address: `${formData.address}, ${formData.city}`,
                    cac_number: formData.bizRegNumber,
                    phone: formData.phone,
                    categories: formData.categories
                });

                if (profileError) throw profileError;
            }

            toast.success("Registration successful!");
            setStep(totalSteps + 1);
        } catch (err: any) {
            toast.error(err.message || "Registration failed");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        if (step === totalSteps) {
            handleSubmit();
        } else {
            setStep((prev) => Math.min(prev + 1, totalSteps + 1));
        }
    };
    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const steps = [
        { id: 1, title: "Account Basics", icon: User },
        { id: 2, title: "Business Info", icon: Building2 },
        { id: 3, title: "Categories", icon: FileText },
        { id: 4, title: "Verification", icon: CheckCircle2 },
    ];

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Partner <span className="text-primary italic">Activation</span></h1>
                        <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed italic">
                            Join the premier building materials marketplace. Complete your profile to start listing products.
                        </p>
                    </div>

                    {step <= totalSteps ? (
                        <div className="bg-white dark:bg-card rounded-[2.5rem] shadow-2xl border-none overflow-hidden transition-colors">
                            {/* Progress Indicator */}
                            <div className="bg-slate-50 dark:bg-white/5 flex justify-between items-center p-6 md:px-12 border-b dark:border-white/10 transition-colors">
                                {steps.map((s, idx) => (
                                    <div key={s.id} className="flex items-center">
                                        <div
                                            className={`flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs shadow-inner transition-all ${step === s.id
                                                ? "bg-primary text-white scale-110 shadow-primary/20"
                                                : step > s.id
                                                    ? "bg-green-500 text-white"
                                                    : "bg-slate-100 dark:bg-white/5 text-slate-400"
                                                }`}
                                        >
                                            {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                                        </div>
                                        <span
                                            className={`ml-3 text-[10px] uppercase font-black tracking-widest hidden lg:block ${step === s.id ? "text-primary" : "text-slate-400 dark:text-slate-600"
                                                }`}
                                        >
                                            {s.title}
                                        </span>
                                        {idx < steps.length - 1 && (
                                            <div className="w-8 md:w-16 h-1 bg-slate-100 dark:bg-white/5 mx-3 md:mx-6 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: step > s.id ? "100%" : "0%" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form Content */}
                            <div className="p-8 md:p-12">
                                {step === 1 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                        <h2 className="text-2xl font-black flex items-center gap-4 mb-4 text-slate-900 dark:text-white uppercase tracking-tight">
                                            <div className="p-3 bg-primary/10 rounded-xl"><User className="w-6 h-6 text-primary" /></div> Account Owner
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input id="firstName" placeholder="e.g. David" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input id="lastName" placeholder="e.g. Okonkwo" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                            <Building2 className="w-6 h-6 text-primary" /> Business Information
                                        </h2>
                                        <div className="space-y-2">
                                            <Label htmlFor="companyName">Registered Company Name</Label>
                                            <Input id="companyName" placeholder="e.g. Metro Builders Materials Ltd" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bizRegNumber">Business Registration Number (e.g. CAC)</Label>
                                            <Input id="bizRegNumber" placeholder="RC Number" value={formData.bizRegNumber} onChange={(e) => handleInputChange('bizRegNumber', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Official Business Address</Label>
                                            <Input id="address" placeholder="Street Address" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City / State</Label>
                                                <Input id="city" placeholder="Lagos" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Business Phone Number</Label>
                                                <Input id="phone" placeholder="+234 XXX XXX XXXX" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                            <FileText className="w-6 h-6 text-primary" /> Product Categories
                                        </h2>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Select the primary categories of materials you intend to sell.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {["Cement & Aggregates", "Steel & Rebars", "Roofing & Ceiling", "Electrical & Plumbing", "Timber & Wood", "Paints & Chemicals", "Tiles & Flooring", "Doors & Windows"].map((cat) => (
                                                <div key={cat} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                                    <Checkbox
                                                        id={`cat-${cat}`}
                                                        checked={formData.categories.includes(cat)}
                                                        onCheckedChange={() => handleCategoryToggle(cat)}
                                                    />
                                                    <Label htmlFor={`cat-${cat}`} className="flex-1 cursor-pointer font-medium">{cat}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                        <h2 className="text-2xl font-black flex items-center gap-4 mb-4 text-slate-900 dark:text-white uppercase tracking-tight">
                                            <div className="p-3 bg-primary/10 rounded-xl"><CheckCircle2 className="w-6 h-6 text-primary" /></div> Trust & Verification
                                        </h2>
                                        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium italic mb-4 leading-relaxed">
                                            To ensure platform quality, we require verification documents. You can upload these now or later in your portal.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary/50 transition-all cursor-pointer group">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-primary" />
                                                </div>
                                                <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Business Cert</h3>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">PDF, JPG up to 5MB</p>
                                            </div>
                                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary/50 transition-all cursor-pointer group">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-primary" />
                                                </div>
                                                <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Valid ID</h3>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-2">License, NIN, or Passport</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer Buttons */}
                                <div className="flex justify-between items-center mt-12 pt-8 border-t dark:border-white/10 transition-colors">
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={step === 1}
                                        className="gap-2 px-8 font-black uppercase tracking-widest text-xs h-12 rounded-xl"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="gap-3 px-10 font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]" size="lg" disabled={isLoading}>
                                        {isLoading ? (
                                            <>Validating... <Loader2 className="w-4 h-4 animate-spin" /></>
                                        ) : (
                                            <>
                                                {step === totalSteps ? "Finish Registration" : "Continue"}
                                                {step !== totalSteps && <ChevronRight className="w-4 h-4" />}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Application Submitted!</h2>
                            <p className="text-xl text-muted-foreground mb-8">
                                Your vendor application is under review. We will notify you via email once your account has been verified.
                            </p>
                            <Button asChild size="lg" className="px-10">
                                <Link to="/">Return Home</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default VendorRegister;
