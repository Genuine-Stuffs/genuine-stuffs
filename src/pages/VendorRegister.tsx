import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Upload, Building2, User, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const VendorRegister = () => {
    const [step, setStep] = useState(1);
    const totalSteps = 4;

    const handleNext = () => setStep((prev) => Math.min(prev + 1, totalSteps + 1));
    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const steps = [
        { id: 1, title: "Account Basics", icon: User },
        { id: 2, title: "Business Info", icon: Building2 },
        { id: 3, title: "Categories", icon: FileText },
        { id: 4, title: "Verification", icon: CheckCircle2 },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto px-4 py-12 flex justify-center">
                <div className="w-full max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Vendor Registration</h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            Join the premier building materials marketplace. Complete your profile to start listing products to top project owners and professionals.
                        </p>
                    </div>

                    {step <= totalSteps ? (
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            {/* Progress Indicator */}
                            <div className="bg-slate-100 flex justify-between items-center p-4 md:px-8 border-b">
                                {steps.map((s, idx) => (
                                    <div key={s.id} className="flex items-center">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step === s.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : step > s.id
                                                        ? "bg-green-500 text-white"
                                                        : "bg-slate-300 text-slate-500"
                                                }`}
                                        >
                                            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                        </div>
                                        <span
                                            className={`ml-2 text-sm hidden md:block ${step === s.id ? "font-bold text-slate-800" : "text-slate-500"
                                                }`}
                                        >
                                            {s.title}
                                        </span>
                                        {idx < steps.length - 1 && (
                                            <div className="w-8 md:w-16 h-1 bg-slate-300 mx-2 md:mx-4 rounded-full">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                                                    style={{ width: step > s.id ? "100%" : "0%" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form Content */}
                            <div className="p-6 md:p-10">
                                {step === 1 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                            <User className="w-6 h-6 text-primary" /> Personal Details
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input id="firstName" placeholder="e.g. David" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input id="lastName" placeholder="e.g. Okonkwo" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" type="email" placeholder="you@company.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" />
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
                                            <Input id="companyName" placeholder="e.g. Metro Builders Materials Ltd" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bizRegNumber">Business Registration Number (e.g. CAC)</Label>
                                            <Input id="bizRegNumber" placeholder="RC Number" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Official Business Address</Label>
                                            <Input id="address" placeholder="Street Address" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City / State</Label>
                                                <Input id="city" placeholder="Lagos" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Business Phone Number</Label>
                                                <Input id="phone" placeholder="+234 XXX XXX XXXX" />
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
                                                    <Checkbox id={`cat-${cat}`} />
                                                    <Label htmlFor={`cat-${cat}`} className="flex-1 cursor-pointer font-medium">{cat}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                            <CheckCircle2 className="w-6 h-6 text-primary" /> Document Verification
                                        </h2>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            To ensure platform quality, we require verification documents. You can upload these now or later in your dashboard.
                                        </p>
                                        <div className="space-y-4">
                                            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                                <h3 className="font-semibold text-lg">Upload Business Registration Certificate</h3>
                                                <p className="text-sm text-muted-foreground mt-2">PDF, JPG, PNG up to 5MB</p>
                                            </div>
                                            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                                <h3 className="font-semibold text-lg">Upload Valid Means of ID</h3>
                                                <p className="text-sm text-muted-foreground mt-2">Driver's License, NIN, or Passport</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer Buttons */}
                                <div className="flex justify-between items-center mt-10 pt-6 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={handleBack}
                                        disabled={step === 1}
                                        className="gap-2 px-6"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="gap-2 px-8" size="lg">
                                        {step === totalSteps ? "Complete Registration" : "Continue"}
                                        {step !== totalSteps && <ChevronRight className="w-4 h-4" />}
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
