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

    // Form Data
    const [formData, setFormData] = useState({
        // Generic
        email: "",
        password: "",
        // Pro specific
        proType: "",
        registrationType: "individual",
        // Vendor specific
        firstName: "",
        lastName: "",
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

    const handleProSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

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
                    address: `${formData.address}, ${formData.city}`,
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
        { id: 1, title: "Owner Info", icon: User },
        { id: 2, title: "Company", icon: Building2 },
        { id: 3, title: "Inventory", icon: FileText },
        { id: 4, title: "Trust", icon: CheckCircle2 },
    ];

    const handleNext = () => {
        if (role === 'professional') {
            handleProSubmit();
        } else {
            if (step === 4) {
                handleVendorSubmit();
            } else {
                setStep(prev => prev + 1);
            }
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
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-3xl">
                    {/* Role Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-6xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                            Join the <span className="text-primary italic">Ecosystem</span>
                        </h1>
                        <p className="text-muted-foreground dark:text-slate-400 font-medium italic">Select your account type to proceed.</p>
                    </div>

                    {/* Role Toggle */}
                    <div className="flex p-1.5 bg-sky-100/30 dark:bg-white/5 rounded-2xl mb-12 max-w-md mx-auto border dark:border-white/10">
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

                    <Card className="border-none shadow-2xl bg-sky-50/50 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden transition-all duration-500">
                        {/* Progress Header for Vendors */}
                        {role === 'vendor' && (
                            <div className="bg-sky-100/30 dark:bg-sky-900/10 flex justify-between items-center p-6 border-b dark:border-white/10">
                                {vendorSteps.map((s, idx) => (
                                    <div key={s.id} className="flex items-center">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-[10px] transition-all ${step === s.id ? "bg-primary text-white scale-110" : step > s.id ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-400"}`}>
                                            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                        </div>
                                        {idx < vendorSteps.length - 1 && (
                                            <div className="w-4 md:w-12 h-0.5 bg-slate-200 dark:bg-white/10 mx-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <CardContent className="p-8 md:p-12">
                            {/* Common Header */}
                            <div className="mb-10 text-center">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {role === 'professional' ? "Pro Registration" : vendorSteps[step - 1].title}
                                </h2>
                                <p className="text-sm text-slate-500 italic mt-1 font-medium">
                                    {role === 'professional' ? "Access AI-powered innovation tools." : "Tell us about your materials business."}
                                </p>
                            </div>

                            <div className="space-y-6">
                                {role === 'professional' ? (
                                    /* PRO FORM */
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-first-name">First Name</Label>
                                                <Input id="pro-first-name" placeholder="John" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-last-name">Surname</Label>
                                                <Input id="pro-last-name" placeholder="Doe" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pro-type">Discipline</Label>
                                                <Input id="pro-type" placeholder="e.g. Architect" value={formData.proType} onChange={(e) => handleInputChange('proType', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pro-email">Email Address</Label>
                                            <Input id="pro-email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pro-password">Password</Label>
                                            <div className="relative">
                                                <Input id="pro-password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
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
                                                        <Label>First Name</Label>
                                                        <Input value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Last Name</Label>
                                                        <Input value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Email</Label>
                                                    <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Password</Label>
                                                    <Input type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 2 && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Company Name</Label>
                                                    <Input value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>CAC / Reg Number</Label>
                                                    <Input value={formData.bizRegNumber} onChange={(e) => handleInputChange('bizRegNumber', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Phone</Label>
                                                    <Input value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 3 && (
                                            <div className="grid grid-cols-2 gap-3">
                                                {["Cement", "Steel", "Electrical", "Plumbing", "Roofing", "Tiles", "Paints", "Tools"].map((cat) => (
                                                    <div key={cat} className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                                        <Checkbox checked={formData.categories.includes(cat)} onCheckedChange={() => handleCategoryToggle(cat)} />
                                                        <span className="text-xs font-bold">{cat}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {step === 4 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="border-2 border-dashed rounded-3xl p-8 text-center hover:bg-slate-50 cursor-pointer transition-all">
                                                    <Upload className="w-8 h-8 text-primary mx-auto mb-4" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Biz Certificate</p>
                                                </div>
                                                <div className="border-2 border-dashed rounded-3xl p-8 text-center hover:bg-slate-50 cursor-pointer transition-all">
                                                    <Upload className="w-8 h-8 text-primary mx-auto mb-4" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Gov ID</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-10 flex justify-between items-center border-t dark:border-white/10">
                                    {role === 'vendor' && step > 1 ? (
                                        <Button variant="ghost" onClick={handleBack} className="font-black uppercase tracking-widest text-[10px] gap-2">
                                            <ChevronLeft className="w-4 h-4" /> Back
                                        </Button>
                                    ) : <div />}

                                    <Button onClick={handleNext} disabled={isLoading} className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-3">
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
