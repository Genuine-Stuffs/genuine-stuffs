import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
    Sparkles,
    Globe
} from "lucide-react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
/*
### 🎨 Aesthetic Overhaul (Calibrated)
- **10% Contrast Gap**: Based on your feedback, I set the global **Background to 20% lightness** and the **Cards to 30% lightness**. This creates a sharp, premium separation while keeping the interface "dim" and comfortable.
- **Vibrant Navy/Slate**: The tones are now directly pulled from the "GS" logo, creating a more cohesive brand experience.

### 👤 Registration & Auth Fixes
- **Logout Bug Resolved**: Added an explicit redirection to the home page inside the `logout` function. You will no longer see the dashboard after signing out.
- **Field Splitting**: Pro Registration now demands **First Name** and **Surname** as separate fields.
- **Button Rename**: The final button is now clearly labeled **"Complete Registration"**.
#### [_headers](file:///Users/EduPc/material-insight-pros/public/_headers)
- **Security Whitelisting**: Updated the `connect-src` directive in the Content Security Policy (CSP) to explicitly allow `https://countriesnow.space`. This resolves the browser's security block and allows the registration form to fetch the full database of countries, states, and cities.

## Verification Results

### Security & Connectivity
- Confirmed via browser console logs (provided by user) that the CSP violation was the root cause.
- Verified that the whitelisting allows the `Fetch API` to reach the geographic data provider.

### GitHub Sync
- ✅ **CSP Whitelist**: Pushed in `cfbcb7b`.
- ✅ **Resiliency Fallbacks**: Pushed in `cb3d014`.
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
    const navigate = useNavigate();
    const initialRole = (searchParams.get("role") as "professional" | "vendor") || "professional";

    const [role, setRole] = useState<"professional" | "vendor">(initialRole);
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Geographic Data State
    const [countries, setCountries] = useState<string[]>([]);
    const [states, setStates] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [bizStates, setBizStates] = useState<string[]>([]);
    const [bizCities, setBizCities] = useState<string[]>([]);
    const [isLoadingGeo, setIsLoadingGeo] = useState({
        countries: false,
        states: false,
        cities: false,
        bizStates: false,
        bizCities: false
    });

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

    const FALLBACK_COUNTRIES = [
        "Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", 
        "United States", "Canada", "Germany", "United Arab Emirates", 
        "China", "India", "Australia"
    ];

    // Fetch Countries on Mount
    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingGeo(prev => ({ ...prev, countries: true }));
            try {
                const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
                if (!res.ok) throw new Error("Network response was not ok");
                const data = await res.json();
                if (!data.error) {
                    const countryNames = data.data.map((c: any) => c.name).sort();
                    setCountries(countryNames);
                } else {
                    throw new Error(data.msg || "API Error");
                }
            } catch (err) {
                console.error("Failed to fetch countries, using fallbacks:", err);
                setCountries(FALLBACK_COUNTRIES);
                toast.error("Network issue: Some geographic data might be limited. Using major country list.");
            } finally {
                setIsLoadingGeo(prev => ({ ...prev, countries: false }));
            }
        };
        fetchCountries();
    }, []);

    // Fetch States for Country of Residence
    useEffect(() => {
        if (!formData.country) {
            setStates([]);
            return;
        }
        const fetchStates = async () => {
            setIsLoadingGeo(prev => ({ ...prev, states: true }));
            try {
                const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country: formData.country })
                });
                if (!res.ok) throw new Error("API Connection Failed");
                const data = await res.json();
                if (!data.error) {
                    const stateNames = data.data.states.map((s: any) => s.name).sort();
                    setStates(stateNames);
                } else {
                    throw new Error(data.msg || "No states found");
                }
            } catch (err) {
                console.error("Failed to fetch states", err);
                toast.error("Could not load states for " + formData.country);
            } finally {
                setIsLoadingGeo(prev => ({ ...prev, states: false }));
            }
        };
        fetchStates();
    }, [formData.country]);

    // Fetch Cities for State
    useEffect(() => {
        if (!formData.country || !formData.state) {
            setCities([]);
            return;
        }
        const fetchCities = async () => {
            setIsLoadingGeo(prev => ({ ...prev, cities: true }));
            try {
                const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country: formData.country, state: formData.state })
                });
                if (!res.ok) throw new Error("API Connection Failed");
                const data = await res.json();
                if (!data.error) {
                    setCities(data.data.sort());
                } else {
                    throw new Error(data.msg || "No cities found");
                }
            } catch (err) {
                console.error("Failed to fetch cities", err);
                toast.error("Could not load cities for " + formData.state);
            } finally {
                setIsLoadingGeo(prev => ({ ...prev, cities: false }));
            }
        };
        fetchCities();
    }, [formData.country, formData.state]);

    // Fetch States for Vendor Business Country (assume same country of residence for simplicity unless changed)
    useEffect(() => {
        // Business states/cities logic
        if (role === 'vendor' && step === 2 && formData.country) {
            const fetchBizStates = async () => {
                setIsLoadingGeo(prev => ({ ...prev, bizStates: true }));
                try {
                    const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ country: formData.country })
                    });
                    const data = await res.json();
                    if (!data.error) {
                        setBizStates(data.data.states.map((s: any) => s.name).sort());
                    }
                } catch (err) {
                    console.error("Failed to fetch biz states", err);
                } finally {
                    setIsLoadingGeo(prev => ({ ...prev, bizStates: false }));
                }
            };
            fetchBizStates();
        }
    }, [role, step, formData.country]);

    // Fetch Cities for Vendor Business State
    useEffect(() => {
        if (role === 'vendor' && step === 2 && formData.country && formData.bizState) {
            const fetchBizCities = async () => {
                setIsLoadingGeo(prev => ({ ...prev, bizCities: true }));
                try {
                    const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ country: formData.country, state: formData.bizState })
                    });
                    const data = await res.json();
                    if (!data.error) {
                        setBizCities(data.data.sort());
                    }
                } catch (err) {
                    console.error("Failed to fetch biz cities", err);
                } finally {
                    setIsLoadingGeo(prev => ({ ...prev, bizCities: false }));
                }
            };
            fetchBizCities();
        }
    }, [role, step, formData.country, formData.bizState]);


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

            setSubmitted(true);
        } catch (err: any) {
            console.error("Pro Registration Error:", err);
            if (err.message?.includes("already registered") || err.status === 422) {
                toast.error("Account already exists with this email. Please try logging in.");
            } else {
                toast.error(err.message || "Registration failed");
            }
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

            setSubmitted(true);
        } catch (err: any) {
            console.error("Vendor Registration Error:", err);
            if (err.message?.includes("already registered") || err.status === 422) {
                toast.error("Account already exists with this email. Please try logging in.");
            } else {
                toast.error(err.message || "Registration failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const vendorSteps = [
        { id: 1, title: "Owner's Info *", icon: User },
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
            <div className="min-h-screen bg-sky-100">
                <Navbar />
                <main className="container mx-auto px-4 py-20 flex justify-center">
                    <Card className="max-w-xl w-full border-none shadow-2xl bg-white p-12 text-center rounded-[3rem] animate-in zoom-in-95 duration-500">
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
                                <Link to={role === 'professional' ? "/pro-portal" : "/vendor-dashboard"}>Continue To Dashboard</Link>
                            </Button>
                            <Button asChild variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs">
                                <Link to="/">Return to Home</Link>
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sky-100 transition-colors duration-300 flex flex-col">
            <div className="w-full px-6 pt-4 md:pt-10 flex flex-col md:flex-row items-center md:items-center relative">
                <div className="md:absolute md:left-10 mb-4 md:mb-0">
                    <Link to="/" className="group transition-transform hover:scale-105">
                        <Logo iconClassName="h-8 md:h-10" />
                    </Link>
                </div>
                <div className="mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-black mb-1 md:mb-2 text-slate-900 uppercase tracking-tighter leading-none">
                        Join the <span className="text-primary italic">Ecosystem</span>
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground font-medium italic hidden sm:block">
                        Select your account type to proceed.
                    </p>
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 pt-2 md:pt-4 pb-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl">
                    {/* Role Toggle */}
                    <div className="flex p-1.5 bg-white text-slate-900 rounded-2xl mb-6 md:mb-8 max-w-md mx-auto border">
                        <button
                            onClick={() => { setRole('professional'); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${role === 'professional' ? 'bg-slate-100 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <User className="w-3.5 h-3.5" /> Professional
                        </button>
                        <button
                            onClick={() => { setRole('vendor'); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${role === 'vendor' ? 'bg-slate-100 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> Vendor / Supplier
                        </button>
                    </div>

                    <Card className="border-none shadow-none md:shadow-2xl bg-white text-slate-900 backdrop-blur-xl md:rounded-[2.5rem] overflow-hidden transition-all duration-500">
                        {/* Progress Header for Vendors */}
                        {role === 'vendor' && (
                            <div className="bg-white text-slate-900 flex justify-between items-center p-4 md:p-6 border-b">
                                {vendorSteps.map((s, idx) => (
                                    <div key={s.id} className={`flex items-center ${idx < vendorSteps.length - 1 ? "flex-1" : ""}`}>
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-[10px] shrink-0 transition-all ${step === s.id ? "bg-primary text-white scale-110" : step > s.id ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                        </div>
                                        {idx < vendorSteps.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${step > s.id ? "bg-green-500" : "bg-slate-100"}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <CardContent className="p-4 md:p-8">
                            {/* Common Header */}
                            <div className="mb-6 md:mb-8 text-center">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center justify-center gap-3">
                                    {role === 'professional' ? <><Sparkles className="w-5 h-5 text-primary" /> Pro Registration</> : vendorSteps[step - 1].title}
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 italic mt-1 font-medium tracking-widest uppercase">
                                    {role === 'professional' ? "Access AI-powered innovation tools." : "Tell us about your materials business."}
                                </p>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                {role === 'professional' ? (
                                    /* PRO FORM */
                                    <div className="space-y-1.5 md:space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-first-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">First Name *</Label>
                                                <Input id="pro-first-name" placeholder="John" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.firstName ? "border-red-500 ring-offset-red-500" : ""}`} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-last-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Surname *</Label>
                                                <Input id="pro-last-name" placeholder="Doe" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.lastName ? "border-red-500 ring-offset-red-500" : ""}`} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-type" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discipline *</Label>
                                                <Input id="pro-type" placeholder="e.g. Architecture" value={formData.proType} onChange={(e) => handleInputChange('proType', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.proType ? "border-red-500 ring-offset-red-500" : ""}`} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-nationality" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nationality *</Label>
                                                <Select value={formData.nationality} onValueChange={(val) => handleInputChange('nationality', val)}>
                                                    <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.nationality ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                        <SelectValue placeholder="Select Nationality" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {countries.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-country" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country of Residence *</Label>
                                                <Select value={formData.country} onValueChange={(val) => { handleInputChange('country', val); handleInputChange('state', ''); handleInputChange('city', ''); }}>
                                                    <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.country ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                        <SelectValue placeholder="Select Country" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {countries.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-state" className="text-[10px] font-black uppercase tracking-widest text-slate-400">State *</Label>
                                                <Select 
                                                    value={formData.state} 
                                                    onValueChange={(val) => { handleInputChange('state', val); handleInputChange('city', ''); }}
                                                    disabled={!formData.country || isLoadingGeo.states}
                                                >
                                                    <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.state ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                        <SelectValue placeholder={isLoadingGeo.states ? "Loading..." : "Select State"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {states.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-city" className="text-[10px] font-black uppercase tracking-widest text-slate-400">City *</Label>
                                                <Select 
                                                    value={formData.city} 
                                                    onValueChange={(val) => handleInputChange('city', val)}
                                                    disabled={!formData.state || isLoadingGeo.cities}
                                                >
                                                    <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.city ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                        <SelectValue placeholder={isLoadingGeo.cities ? "Loading..." : "Select City"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {cities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="pro-address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Street Address *</Label>
                                                <Input id="pro-address" placeholder="123 Main St" value={formData.streetAddress} onChange={(e) => handleInputChange('streetAddress', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.streetAddress ? "border-red-500 ring-offset-red-500" : ""}`} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="pro-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address *</Label>
                                            <Input id="pro-email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.email ? "border-red-500 ring-offset-red-500" : ""}`} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="pro-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password *</Label>
                                            <div className="relative">
                                                <Input id="pro-password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 pr-12 ${errors.password ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={(e) => handleProSubmit(e)}
                                            className="w-full h-12 mt-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all font-black uppercase tracking-[0.2em] text-[11px] gap-2"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                <>
                                                    Complete Registration <ChevronRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    /* VENDOR FORM STEPS */
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        {step === 1 && (
                                            <div className="space-y-1.5 md:space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">First Name *</Label>
                                                        <Input value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.firstName ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Name *</Label>
                                                        <Input value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.lastName ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email *</Label>
                                                    <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.email ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password *</Label>
                                                    </div>
                                                    <div className="relative">
                                                        <Input 
                                                            type={showPassword ? "text" : "password"} 
                                                            value={formData.password} 
                                                            onChange={(e) => handleInputChange('password', e.target.value)} 
                                                            className={`h-12 rounded-xl bg-white text-slate-900 pr-12 ${errors.password ? "border-red-500 ring-offset-red-500" : ""}`}
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)} 
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nationality *</Label>
                                                        <Select value={formData.nationality} onValueChange={(val) => handleInputChange('nationality', val)}>
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.nationality ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder="Select Nationality" />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {countries.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country of Residence *</Label>
                                                        <Select value={formData.country} onValueChange={(val) => { handleInputChange('country', val); handleInputChange('state', ''); handleInputChange('city', ''); }}>
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.country ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder="Select Country" />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {countries.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">State *</Label>
                                                        <Select 
                                                            value={formData.state} 
                                                            onValueChange={(val) => { handleInputChange('state', val); handleInputChange('city', ''); }}
                                                            disabled={!formData.country || isLoadingGeo.states}
                                                        >
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.state ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder={isLoadingGeo.states ? "Loading..." : "Select State"} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {states.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City *</Label>
                                                        <Select 
                                                            value={formData.city} 
                                                            onValueChange={(val) => handleInputChange('city', val)}
                                                            disabled={!formData.state || isLoadingGeo.cities}
                                                        >
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.city ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder={isLoadingGeo.cities ? "Loading..." : "Select City"} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {cities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Street Address *</Label>
                                                    <Input placeholder="123 Main St" value={formData.streetAddress} onChange={(e) => handleInputChange('streetAddress', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.streetAddress ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 2 && (
                                            <div className="space-y-1.5 md:space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Name *</Label>
                                                    <Input value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.companyName ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CAC / Reg Number *</Label>
                                                        <Input value={formData.bizRegNumber} onChange={(e) => handleInputChange('bizRegNumber', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.bizRegNumber ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone *</Label>
                                                        <Input value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.phone ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">State *</Label>
                                                        <Select 
                                                            value={formData.bizState} 
                                                            onValueChange={(val) => { handleInputChange('bizState', val); handleInputChange('bizCity', ''); }}
                                                            disabled={!formData.country || isLoadingGeo.bizStates}
                                                        >
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.bizState ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder={isLoadingGeo.bizStates ? "Loading..." : "Select State"} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {bizStates.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City *</Label>
                                                        <Select 
                                                            value={formData.bizCity} 
                                                            onValueChange={(val) => handleInputChange('bizCity', val)}
                                                            disabled={!formData.bizState || isLoadingGeo.bizCities}
                                                        >
                                                            <SelectTrigger className={`h-12 rounded-xl bg-white text-slate-900 text-xs font-semibold ${errors.bizCity ? "border-red-500 ring-offset-red-500" : ""}`}>
                                                                <SelectValue placeholder={isLoadingGeo.bizCities ? "Loading..." : "Select City"} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {bizCities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Street Address *</Label>
                                                    <Input placeholder="123 Main St" value={formData.bizStreetAddress} onChange={(e) => handleInputChange('bizStreetAddress', e.target.value)} className={`h-12 rounded-xl bg-white text-slate-900 ${errors.bizStreetAddress ? "border-red-500 ring-offset-red-500" : ""}`} />
                                                </div>
                                            </div>
                                        )}
                                        {step === 3 && (
                                            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Business Categories *</Label>
                                                    <p className="text-[10px] md:text-xs text-slate-500 italic mt-1 font-medium tracking-widest uppercase">Choose all that apply to your inventory.</p>
                                                </div>
                                                <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 rounded-3xl ${errors.categories ? "border-2 border-dashed border-red-500 bg-red-50" : "bg-white text-slate-900"}`}>
                                                    {["Cement", "Steel", "Electrical", "Plumbing", "Roofing", "Tiles", "Paints", "Tools"].map((cat) => (
                                                        <div key={cat} onClick={() => { if(errors.categories) setErrors(prev => { const n={...prev}; delete n.categories; return n; }); handleCategoryToggle(cat); }} className={`flex items-center space-x-2 md:space-x-3 p-3 md:p-4 border border-slate-100 rounded-2xl cursor-pointer transition-colors group ${formData.categories.includes(cat) ? "border-primary bg-primary/5" : "hover:bg-slate-50"}`}>
                                                            <Checkbox checked={formData.categories.includes(cat)} onCheckedChange={() => { if(errors.categories) setErrors(prev => { const n={...prev}; delete n.categories; return n; }); handleCategoryToggle(cat); }} />
                                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-700 group-hover:text-slate-900">{cat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {step === 4 && (
                                            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                                            Biz Certificate * {errors.bizCertificate && <span className="text-red-500">Required</span>}
                                                        </Label>
                                                        <div 
                                                            onClick={() => document.getElementById('biz-cert-upload')?.click()}
                                                            className={`border-2 border-dashed rounded-3xl p-6 md:p-8 text-center cursor-pointer transition-all ${formData.bizCertificate ? 'border-green-500 bg-green-50/50' : errors.bizCertificate ? 'border-red-500 bg-red-50/50' : 'hover:bg-slate-50 border-slate-200'}`}
                                                        >
                                                            <input 
                                                                id="biz-cert-upload"
                                                                type="file" 
                                                                className="hidden" 
                                                                onChange={(e) => handleInputChange('bizCertificate', e.target.files?.[0])}
                                                            />
                                                            <Upload className={`w-6 h-6 md:w-8 h-8 mx-auto mb-2 md:mb-4 ${formData.bizCertificate ? 'text-green-500' : errors.bizCertificate ? 'text-red-500' : 'text-primary'}`} />
                                                            <p className={`text-[10px] font-black uppercase tracking-widest truncate max-w-full px-2 ${errors.bizCertificate ? 'text-red-600' : ''}`}>
                                                                {formData.bizCertificate ? formData.bizCertificate.name : "Upload Document"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                                            Gov ID * {errors.govId && <span className="text-red-500">Required</span>}
                                                        </Label>
                                                        <div 
                                                            onClick={() => document.getElementById('gov-id-upload')?.click()}
                                                            className={`border-2 border-dashed rounded-3xl p-6 md:p-8 text-center cursor-pointer transition-all ${formData.govId ? 'border-green-500 bg-green-50/50' : errors.govId ? 'border-red-500 bg-red-50/50' : 'hover:bg-slate-50 border-slate-200'}`}
                                                        >
                                                            <input 
                                                                id="gov-id-upload"
                                                                type="file" 
                                                                className="hidden" 
                                                                onChange={(e) => handleInputChange('govId', e.target.files?.[0])}
                                                            />
                                                            <ShieldCheck className={`w-6 h-6 md:w-8 h-8 mx-auto mb-2 md:mb-4 ${formData.govId ? 'text-green-500' : errors.govId ? 'text-red-500' : 'text-primary'}`} />
                                                            <p className={`text-[10px] font-black uppercase tracking-widest truncate max-w-full px-2 ${errors.govId ? 'text-red-600' : ''}`}>
                                                                {formData.govId ? formData.govId.name : "Upload Document"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3 md:gap-4 mt-6 md:mt-8 pt-6 md:pt-8 border-t">
                                            {step > 1 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleBack}
                                                    className="w-1/3 h-12 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] border-2 border-slate-200"
                                                    disabled={isLoading}
                                                >
                                                    <ChevronLeft className="w-4 h-4 mr-1 md:mr-2" /> Back
                                                </Button>
                                            )}
                                            <Button
                                                onClick={handleNext}
                                                className={`h-12 rounded-xl font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[9px] md:text-[11px] gap-1 md:gap-2 shadow-xl ${step === 1 ? "w-full" : "flex-1"} bg-slate-900 text-white hover:bg-slate-800 transition-all`}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                    <>
                                                        {step === vendorSteps.length ? "Complete Registration" : "Continue"}
                                                        {step < vendorSteps.length && <ChevronRight className="w-4 h-4" />}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center mt-8 text-xs font-medium text-slate-400">
                        Already have an account? <Link to="/login" className="text-primary font-black hover:underline uppercase tracking-widest text-[10px] ml-1">Login</Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Register;
