import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    User,
    Briefcase,
    Building2,
    ShieldCheck,
    Loader2,
    Eye,
    EyeOff,
    Upload,
    FileText,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
/*
### 🎨 Aesthetic Overhaul (Calibrated)
- **10% Contrast Gap**: Based on your feedback, I set the global **Background to 20% lightness** and the **Cards to 30% lightness**. This creates a sharp, premium separation while keeping the interface "dim" and comfortable.
- **Vibrant Navy/Slate**: The tones are now directly pulled from the "GS" logo, creating a more cohesive brand experience.

### 👤 Registration & Auth Fixes
- **Logout Bug Resolved**: Added an explicit redirection to the home page inside the `logout` function. You will no longer see the dashboard after signing out.
- **Field Splitting**: Pro Registration now demands **First Name** and **Surname** as separate fields.
- **Button Rename**: The final button is now clearly labeled **"Complete Registration"**.

## Verification Results

### Build & Push
- ✅ **`npm run build`**: Completed successfully.
- ✅ **Git Sync**: All fixes (including the logout redirection) are pushed to the main repository.
*/
import { useAuth } from "@/context/AuthContext";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

const Register = () => {
    const { signInWithGoogle } = useAuth();
    const [searchParams] = useSearchParams();
    const initialRole = (searchParams.get("role") as "professional" | "vendor") || "professional";

    const [role, setRole] = useState<"professional" | "vendor">(initialRole);
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Form Data
    const [formData, setFormData] = useState({
        // Generic
        email: "",
        password: "",
        streetAddress: "",
        city: "",
        state: "",
        country: "",
        nationality: "",
        // Vendor specific business address
        bizStreetAddress: "",
        bizCity: "",
        bizState: "",
        // Pro specific
        proType: "",
        registrationType: "individual",
        // Vendor specific
        firstName: "",
        lastName: "",
        companyName: "",
        bizRegNumber: "",
        phone: "",
        categories: [] as string[],
        bizCertificate: null as File | null,
        govId: null as File | null
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user changes the field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleCategoryToggle = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const handleProSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        // Validation
        const requiredFields = [
            'firstName', 'lastName', 'proType', 'email', 'password',
            'streetAddress', 'city', 'state', 'country', 'nationality'
        ];
        const missingFields = requiredFields.filter(f => !formData[f as keyof typeof formData]);
        
        if (missingFields.length > 0) {
            const newErrors: Record<string, boolean> = {};
            missingFields.forEach(f => newErrors[f] = true);
            setErrors(newErrors);
            toast.error("Please fill in all required fields marked with *");
            setIsLoading(false);
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        role: 'professional'
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: profileError } = await supabase.from('professionals').insert({
                    id: authData.user.id,
                    full_name: `${formData.firstName} ${formData.lastName}`.trim(),
                    specialty: formData.proType,
                    street_address: formData.streetAddress,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    nationality: formData.nationality,
                    credits: 10
                });

                if (profileError) throw profileError;
            }

            toast.success("Professional account created!");
            setSubmitted(true);
        } catch (err: any) {
            toast.error(err.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVendorSubmit = async () => {
        setIsLoading(true);
        try {
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

            if (authData.user) {
                const { error: profileError } = await supabase.from('vendors').insert({
                    id: authData.user.id,
                    company_name: formData.companyName,
                    street_address: formData.bizStreetAddress,
                    city: formData.bizCity,
                    state: formData.bizState,
                    country: formData.country,
                    nationality: formData.nationality,
                    personal_street_address: formData.streetAddress,
                    personal_city: formData.city,
                    personal_state: formData.state,
                    cac_number: formData.bizRegNumber,
                    phone: formData.phone,
                    categories: formData.categories
                });

                if (profileError) throw profileError;
            }

            toast.success("Vendor registration complete!");
            setSubmitted(true);
        } catch (err: any) {
            toast.error(err.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const vendorSteps = [
        { id: 1, title: "Owner Info *", icon: User },
        { id: 2, title: "Company *", icon: Building2 },
        { id: 3, title: "Inventory *", icon: FileText },
        { id: 4, title: "Trust *", icon: CheckCircle2 },
    ];

    const handleNext = () => {
        if (role === 'professional') {
            handleProSubmit();
        } else {
            // Vendor Validation by Step
            if (step === 1) {
                const step1Fields = ['firstName', 'lastName', 'email', 'password', 'nationality', 'country', 'state', 'city', 'streetAddress'];
                const missing = step1Fields.filter(f => !formData[f as keyof typeof formData]);
                if (missing.length > 0) {
                    const newErrors: Record<string, boolean> = {};
                    missing.forEach(f => newErrors[f] = true);
                    setErrors(prev => ({ ...prev, ...newErrors }));
                    toast.error("Please fill in all owner and personal address information");
                    return;
                }
            } else if (step === 2) {
                const step2Fields = ['companyName', 'bizRegNumber', 'phone', 'bizState', 'bizCity', 'bizStreetAddress'];
                const missing = step2Fields.filter(f => !formData[f as keyof typeof formData]);
                if (missing.length > 0) {
                    const newErrors: Record<string, boolean> = {};
                    missing.forEach(f => newErrors[f] = true);
                    setErrors(prev => ({ ...prev, ...newErrors }));
                    toast.error("Please fill in all company and business address information");
                    return;
                }
            } else if (step === 3) {
                if (formData.categories.length === 0) {
                    setErrors(prev => ({ ...prev, categories: true }));
                    toast.error("Please select at least one category");
                    return;
                }
            } else if (step === 4) {
                const missingDocs: Record<string, boolean> = {};
                if (!formData.bizCertificate) missingDocs.bizCertificate = true;
                if (!formData.govId) missingDocs.govId = true;

                if (Object.keys(missingDocs).length > 0) {
                    setErrors(prev => ({ ...prev, ...missingDocs }));
                    toast.error("Please upload all required documents");
                    return;
                }
                handleVendorSubmit();
                return;
            }
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    if (submitted) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-20 flex justify-center">
                    <Card className="max-w-xl w-full border-none shadow-2xl p-12 text-center rounded-[3rem] animate-in zoom-in-95 duration-500">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${role === 'professional' ? 'bg-primary/10' : 'bg-green-100'}`}>
                            {role === 'professional' ? <Sparkles className="w-12 h-12 text-primary" /> : <Check className="w-12 h-12 text-green-600" />}
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">
                            {role === 'professional' ? "Welcome to the Elite" : "Application Received"}
                        </h2>
                        <p className="text-lg text-slate-500 font-medium italic mb-10 leading-relaxed">
                            {role === 'professional'
                                ? "Your professional gateway is ready. We've granted you 10 AI Credits to start your first project."
                                : "Your vendor application is under review. Our team will verify your business details within 24 hours."}
                        </p>
                        <div className="flex flex-col gap-4">
                            <Button asChild size="lg" className={`h-14 rounded-2xl font-black uppercase tracking-widest text-xs ${role === 'professional' ? 'bg-primary' : 'bg-green-600 hover:bg-green-700'}`}>
                                <Link to={role === 'professional' ? "/pro-portal" : "/vendor-dashboard"}>Enter Dashboard</Link>
                            </Button>
                            <Button asChild variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs">
                                <Link to="/">Return to Home</Link>
                            </Button>
                        </div>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 flex flex-col">
            <div className="w-full px-6 pt-4 md:pt-10 flex flex-col md:flex-row items-center md:items-center relative">
                <div className="md:absolute md:left-10 mb-4 md:mb-0">
                    <Link to="/" className="group transition-transform hover:scale-105">
                        <Logo iconClassName="h-8 md:h-10" />
                    </Link>
                </div>
                <div className="mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-black mb-1 md:mb-2 text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        Join the <span className="text-primary italic">Ecosystem</span>
                    </h1>
                    <p className="text-[10px] md:text-sm text-muted-foreground dark:text-slate-400 font-medium italic hidden sm:block">
                        Select your account type to proceed.
                    </p>
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-3xl">
                    {/* Role Toggle */}
                    <div className="flex p-1.5 bg-sky-100/30 dark:bg-white/5 rounded-2xl mb-6 md:mb-12 max-w-md mx-auto border dark:border-white/10">
                        <button
                            onClick={() => { setRole('professional'); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${role === 'professional' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <User className="w-3.5 h-3.5" /> Professional
                        </button>
                        <button
                            onClick={() => { setRole('vendor'); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${role === 'vendor' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> Vendor / Supplier
                        </button>
                    </div>

                    <Card className="border-none shadow-none md:shadow-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] overflow-hidden transition-all duration-500">
                        {/* Progress Header for Vendors */}
                        {role === 'vendor' && (
                            <div className="bg-sky-100/30 dark:bg-sky-900/10 flex justify-between items-center p-6 border-b dark:border-white/10">
                                {vendorSteps.map((s, idx) => (
                                    <div key={s.id} className={`flex items-center ${idx < vendorSteps.length - 1 ? "flex-1" : ""}`}>
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-[10px] shrink-0 transition-all ${step === s.id ? "bg-primary text-white scale-110" : step > s.id ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-400"}`}>
                                            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                        </div>
                                        {idx < vendorSteps.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${step > s.id ? "bg-green-500" : "bg-slate-200 dark:bg-white/10"}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <CardContent className="p-4 md:p-12">
                            {/* Common Header */}
                            <div className="mb-6 md:mb-10 text-center">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {role === 'professional' ? "Pro Registration" : vendorSteps[step - 1].title}
                                </h2>
                                <p className="text-xs md:text-sm text-slate-500 italic mt-1 font-medium">
                                    {role === 'professional' ? "Access AI-powered innovation tools." : "Tell us about your materials business."}
                                </p>
                            </div>

                            <div className="space-y-4 md:space-y-8">
                                {role === 'professional' ? (
                                    /* PRO FORM */
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-first-name">First Name *</Label>
                                                <Input id="pro-first-name" placeholder="John" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={errors.firstName ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-last-name">Surname *</Label>
                                                <Input id="pro-last-name" placeholder="Doe" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={errors.lastName ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-type">Discipline *</Label>
                                                <Input id="pro-type" placeholder="e.g. Architect" value={formData.proType} onChange={(e) => handleInputChange('proType', e.target.value)} className={errors.proType ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-nationality">Nationality *</Label>
                                                <Input id="pro-nationality" placeholder="Nigerian" value={formData.nationality} onChange={(e) => handleInputChange('nationality', e.target.value)} className={errors.nationality ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-country">Country of Residence *</Label>
                                                <Input id="pro-country" placeholder="Nigeria" value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} className={errors.country ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-state">State *</Label>
                                                <Input id="pro-state" placeholder="Lagos" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} className={errors.state ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-city">City *</Label>
                                                <Input id="pro-city" placeholder="Ikeja" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} className={errors.city ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-address">Street Address *</Label>
                                                <Input id="pro-address" placeholder="123 Main St" value={formData.streetAddress} onChange={(e) => handleInputChange('streetAddress', e.target.value)} className={errors.streetAddress ? "border-red-500 ring-offset-red-500" : ""} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pro-email">Email Address *</Label>
                                            <Input id="pro-email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={errors.email ? "border-red-500 ring-offset-red-500" : ""} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pro-password">Password *</Label>
                                            <div className="relative">
                                                <Input id="pro-password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} className={errors.password ? "border-red-500 ring-offset-red-500" : ""} />
                                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* VENDOR FORM STEPS */
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        {step === 1 && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>First Name *</Label>
                                                        <Input value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={errors.firstName ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Last Name *</Label>
                                                        <Input value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={errors.lastName ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Email *</Label>
                                                    <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={errors.email ? "border-red-500 ring-offset-red-500" : ""} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Password *</Label>
                                                    <div className="relative">
                                                        <Input 
                                                            type={showPassword ? "text" : "password"} 
                                                            value={formData.password} 
                                                            onChange={(e) => handleInputChange('password', e.target.value)} 
                                                            className={`pr-12 ${errors.password ? "border-red-500 ring-offset-red-500" : ""}`}
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)} 
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Nationality *</Label>
                                                        <Input placeholder="Nigerian" value={formData.nationality} onChange={(e) => handleInputChange('nationality', e.target.value)} className={errors.nationality ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Country of Residence *</Label>
                                                        <Input placeholder="Nigeria" value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} className={errors.country ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>State *</Label>
                                                        <Input placeholder="Lagos" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} className={errors.state ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>City *</Label>
                                                        <Input placeholder="Ikeja" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} className={errors.city ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Street Address *</Label>
                                                    <Input placeholder="123 Main St" value={formData.streetAddress} onChange={(e) => handleInputChange('streetAddress', e.target.value)} className={errors.streetAddress ? "border-red-500 ring-offset-red-500" : ""} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 2 && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Company Name *</Label>
                                                    <Input value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} className={errors.companyName ? "border-red-500 ring-offset-red-500" : ""} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>CAC / Reg Number *</Label>
                                                        <Input value={formData.bizRegNumber} onChange={(e) => handleInputChange('bizRegNumber', e.target.value)} className={errors.bizRegNumber ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Phone *</Label>
                                                        <Input value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className={errors.phone ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>State *</Label>
                                                        <Input placeholder="Lagos" value={formData.bizState} onChange={(e) => handleInputChange('bizState', e.target.value)} className={errors.bizState ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>City *</Label>
                                                        <Input placeholder="Ikeja" value={formData.bizCity} onChange={(e) => handleInputChange('bizCity', e.target.value)} className={errors.bizCity ? "border-red-500 ring-offset-red-500" : ""} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Street Address *</Label>
                                                    <Input placeholder="123 Main St" value={formData.bizStreetAddress} onChange={(e) => handleInputChange('bizStreetAddress', e.target.value)} className={errors.bizStreetAddress ? "border-red-500 ring-offset-red-500" : ""} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 3 && (
                                            <div className={`grid grid-cols-2 gap-3 p-4 rounded-3xl transition-all duration-300 ${errors.categories ? 'bg-red-50/50 border-2 border-dashed border-red-500' : ''}`}>
                                                {["Cement", "Steel", "Electrical", "Plumbing", "Roofing", "Tiles", "Paints", "Tools"].map((cat) => (
                                                    <div key={cat} onClick={() => { if(errors.categories) setErrors(prev => { const n={...prev}; delete n.categories; return n; }); handleCategoryToggle(cat); }} className="flex items-center space-x-2 p-3 border dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer transition-colors group">
                                                        <Checkbox checked={formData.categories.includes(cat)} onCheckedChange={() => { if(errors.categories) setErrors(prev => { const n={...prev}; delete n.categories; return n; }); handleCategoryToggle(cat); }} />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{cat}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {step === 4 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div 
                                                    onClick={() => document.getElementById('biz-cert-upload')?.click()}
                                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${formData.bizCertificate ? 'border-green-500 bg-green-50/50 dark:bg-green-500/10' : errors.bizCertificate ? 'border-red-500 bg-red-50/50' : 'hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10'}`}
                                                >
                                                    <input 
                                                        id="biz-cert-upload"
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={(e) => handleInputChange('bizCertificate', e.target.files?.[0])}
                                                    />
                                                    <Upload className={`w-8 h-8 mx-auto mb-4 ${formData.bizCertificate ? 'text-green-500' : errors.bizCertificate ? 'text-red-500' : 'text-primary'}`} />
                                                    <p className={`text-[10px] font-black uppercase tracking-widest truncate max-w-full px-2 ${errors.bizCertificate ? 'text-red-600' : ''}`}>
                                                        {formData.bizCertificate ? formData.bizCertificate.name : "Biz Certificate *"}
                                                    </p>
                                                </div>
                                                <div 
                                                    onClick={() => document.getElementById('gov-id-upload')?.click()}
                                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${formData.govId ? 'border-green-500 bg-green-50/50 dark:bg-green-500/10' : errors.govId ? 'border-red-500 bg-red-50/50' : 'hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10'}`}
                                                >
                                                    <input 
                                                        id="gov-id-upload"
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={(e) => handleInputChange('govId', e.target.files?.[0])}
                                                    />
                                                    <Upload className={`w-8 h-8 mx-auto mb-4 ${formData.govId ? 'text-green-500' : errors.govId ? 'text-red-500' : 'text-primary'}`} />
                                                    <p className={`text-[10px] font-black uppercase tracking-widest truncate max-w-full px-2 ${errors.govId ? 'text-red-600' : ''}`}>
                                                        {formData.govId ? formData.govId.name : "Gov ID *"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 border-t dark:border-white/10">
                                    <div className="w-full md:w-auto order-2 md:order-1">
                                        {role === 'vendor' && step > 1 && (
                                            <Button variant="ghost" onClick={handleBack} className="w-full md:w-auto h-12 md:h-14 font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-100 dark:hover:bg-white/5">
                                                <ChevronLeft className="w-4 h-4" /> Back
                                            </Button>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleNext} 
                                        disabled={isLoading} 
                                        className="w-full md:w-auto h-14 md:px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-none md:shadow-xl md:shadow-primary/20 gap-3 order-1 md:order-2"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                {role === 'professional' || step === 4 ? "Complete Registration" : "Continue"}
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center mt-8 text-xs font-medium text-slate-400">
                        Already have an account? <Link to="/login" className="text-primary font-black hover:underline uppercase tracking-widest text-[10px] ml-1">Login</Link>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Register;
