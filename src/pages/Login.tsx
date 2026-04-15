import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Loader2,
    Eye,
    EyeOff,
    ArrowRight,
    KeyRound,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Login = () => {
    const { signInWithGoogle, signInWithEmail, signInWithOtp } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleMagicLink = async () => {
        if (!formData.email) {
            toast.error("Please enter your email address first.");
            return;
        }
        setIsMagicLinkLoading(true);
        try {
            await signInWithOtp(formData.email);
            toast.success("Magic link sent! Please check your email inbox.");
        } catch (err: any) {
            toast.error(err.message || "Failed to send magic link.");
        } finally {
            setIsMagicLinkLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await signInWithEmail(formData.email, formData.password);
            navigate("/");
        } catch (err: any) {
            toast.error(err.message || "Invalid credentials. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

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
                        Welcome <span className="text-primary italic">Back</span>
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground font-medium italic hidden sm:block">
                        Enter your credentials to access your construction workspace.
                    </p>
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 pt-2 md:pt-4 pb-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg">
                    <Card className="border-none shadow-2xl bg-white backdrop-blur-xl rounded-[2.5rem] overflow-hidden transition-all duration-500">
                        <CardHeader className="bg-white p-4 md:p-6 text-center border-b">
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-3">
                                <KeyRound className="w-5 h-5 text-primary" /> Secure Gateway
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-4 md:p-8">
                            <div className="space-y-2 md:space-y-6">
                                <Button
                                    onClick={signInWithGoogle}
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-2 border-slate-100 font-black uppercase tracking-widest text-[10px] gap-3 hover:bg-slate-50 transition-all"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Sign in with Google
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-100" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase">
                                        <span className="bg-white px-4 text-slate-400 font-black tracking-widest italic">Or use credentials</span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="pro@genuine.com"
                                            required
                                            className="h-12 rounded-xl bg-white"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                                            <Link to="#" className="text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">Forgot?</Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                className="h-12 rounded-xl pr-12 bg-white"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
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

                                    <Button
                                        type="submit"
                                        className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all font-black uppercase tracking-[0.2em] text-[11px] gap-2"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>Authenticate <ArrowRight className="w-4 h-4" /></>
                                        )}
                                    </Button>

                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleMagicLink}
                                            disabled={isMagicLinkLoading}
                                            className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 gap-2"
                                        >
                                            {isMagicLinkLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <><Sparkles className="w-3.5 h-3.5" /> Sign in with Magic Link</>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-2 text-center space-y-4">
                        <p className="text-xs font-medium text-slate-500">
                            New here? <Link to="/register" className="text-primary font-black uppercase tracking-widest text-[10px] ml-1 hover:underline">Join the ecosystem</Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
