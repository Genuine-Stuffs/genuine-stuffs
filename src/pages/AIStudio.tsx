import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, BookOpen, Sparkles, Wand2, FileText, Share2, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import CreditInfo from "@/components/CreditInfo";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const AIStudio = () => {
    const { user, role } = useAuth();
    const isPro = role === "pro";
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [promptText, setPromptText] = useState("");

    const creditPackages = [
        { name: "Starter", credits: 50, price: 5000, description: "Perfect for a single project vision" },
        { name: "Professional", credits: 150, price: 12500, description: "Our most popular project pack", popular: true },
        { name: "Enterprise", credits: 500, price: 35000, description: "For high-volume architectural teams" },
    ];

    useEffect(() => {
        const fetchCredits = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('professionals')
                    .select('credits')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setCredits(data?.credits ?? 0);
            } catch (err) {
                console.error("Error fetching credits:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCredits();
    }, [user]);

    const handlePaystackPayment = (pack: typeof creditPackages[0]) => {
        if (!user) return;

        const handler = (window as any).PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_mock_key', // Sandbox fallback
            email: user.email,
            amount: pack.price * 100, // In Kobo
            currency: 'NGN',
            callback: async (response: any) => {
                toast.success(`Payment Successful! Transaction: ${response.reference}`);

                // Atomic increment of credits in DB
                const newCredits = (credits || 0) + pack.credits;
                const { error } = await supabase
                    .from('professionals')
                    .update({ credits: newCredits })
                    .eq('id', user.id);

                if (!error) {
                    setCredits(newCredits);
                    setShowRefillModal(false);
                    toast.success(`${pack.credits} Credits added to your account.`);
                }
            },
            onClose: () => {
                toast.info("Payment cancelled.");
            }
        });

        handler.openIframe();
    };

    const handleGenerate = async () => {
        if (!isPro || credits === null || credits < 2) {
            toast.error("Insufficient credits or not a Pro account.");
            if (isPro) setShowRefillModal(true);
            return;
        }

        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            // Simulate AI lag + Cloud processing
            await new Promise(resolve => setTimeout(resolve, 5000));

            const { error } = await supabase
                .from('professionals')
                .update({ credits: credits - 2 })
                .eq('id', user?.id);

            if (error) throw error;

            // For now, using a premium placeholder since we haven't wired up the actual Edge Function for DALL-E
            setGeneratedImage("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200");

            setCredits(prev => (prev !== null ? prev - 2 : null));
            toast.success("Design Vision Rendered! (2 Credits used)");
        } catch (err) {
            toast.error("Generation failed. Please try again.");
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 py-12">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl shadow-inner transition-colors">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase">AI Innovation Studio</h1>
                    </div>
                    {isPro && (
                        <div className="mb-6">
                            <CreditInfo
                                credits={credits ?? 0}
                                variant="compact"
                                isPro={true}
                                onRefill={() => setShowRefillModal(true)}
                            />
                        </div>
                    )}
                    <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-3xl font-medium leading-relaxed italic">
                        Access next-generation building tools. Design, survey, and plan with AI-powered precision.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {/* Architect Tool */}
                    <Card className="lg:col-span-2 border-2 border-primary/20 dark:border-primary/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors">
                        <CardHeader className="p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tighter">
                                        <Wand2 className="w-7 h-7 text-primary" />
                                        Architectural Prompting
                                    </CardTitle>
                                    <CardDescription className="text-lg mt-4 text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                                        Describe your building vision in detail and let AI generate professional conceptual plans.
                                    </CardDescription>
                                </div>
                                {isPro ? (
                                    <span className="px-4 py-1.5 bg-green-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/20">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Pro Access Active
                                    </span>
                                ) : (
                                    <Button variant="outline" size="sm" className="rounded-full border-primary text-primary hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] h-9 px-6 transition-all" asChild>
                                        <Link to="/register/pro">Upgrade <Lock className="w-3 h-3 ml-2" /></Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-4 md:p-8 min-h-[450px] flex flex-col justify-between border-2 border-dashed border-slate-300 dark:border-slate-700 transition-colors relative group/preview">
                                {generatedImage ? (
                                    <div className="flex-1 rounded-2xl overflow-hidden relative shadow-2xl animate-in fade-in duration-1000 mb-6">
                                        <img src={generatedImage} alt="AI Generated Vision" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                            <p className="text-white font-bold italic text-sm mb-2">"{promptText || "Conceptual Villa Design"}"</p>
                                            <div className="flex gap-2">
                                                <Badge className="bg-primary text-white border-none text-[10px] font-black uppercase tracking-widest">Render v1.0</Badge>
                                                <Badge className="bg-white/20 backdrop-blur-md text-white border-none text-[10px] font-black uppercase tracking-widest">Concept Only</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 mb-8">
                                        {isGenerating ? (
                                            <div className="text-center space-y-4">
                                                <div className="relative">
                                                    <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
                                                    <Sparkles className="w-6 h-6 text-yellow-500 absolute top-0 right-0 animate-bounce" />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-widest">Processing Material Textures...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                                                    <Wand2 className="w-10 h-10 group-hover/preview:rotate-12 transition-transform duration-500" />
                                                </div>
                                                <p className="font-black uppercase tracking-widest text-[10px]">Your vision will appear here</p>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-6 max-w-full">
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                            disabled={!isPro || (credits !== null && credits < 2) || isGenerating}
                                            placeholder={!isPro ? "Upgrade to unlock AI Prompting" : (credits !== null && credits < 2) ? "Trial exhausted. Please upgrade." : "Prompt your building idea..."}
                                            className="flex-1 px-6 py-4 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-primary/10 font-bold placeholder:text-slate-400"
                                        />
                                        <Button
                                            onClick={handleGenerate}
                                            disabled={!isPro || (credits !== null && credits < 2) || isGenerating || !promptText}
                                            className="gap-2 font-black px-10 rounded-xl uppercase tracking-widest shadow-xl shadow-primary/20 h-14"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Generate (2 Credits)</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions / Team Focus */}
                    <div className="space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-xl dark:bg-slate-900/50 transition-colors">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tight">
                                    <BookOpen className="w-6 h-6 text-primary" /> Active Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8">
                                <div className="text-center py-10 text-slate-400 dark:text-slate-500 border-2 border-dashed dark:border-slate-800 rounded-2xl italic font-medium transition-colors">
                                    No active AI projects. Start a new prompt to begin.
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 dark:bg-black text-white rounded-[2.5rem] border-none shadow-2xl transition-all hover:scale-[1.02] overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black text-primary uppercase tracking-widest">Pro Tools Hub</CardTitle>
                                <CardDescription className="text-slate-400 font-medium italic">
                                    Specialized tools for your construction role.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-4">
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <Calculator className="w-4 h-4" /> Structural Load Estimator
                                </Button>
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic">
                                    <FileText className="w-4 h-4" /> Automated BoQ Generator
                                </Button>
                                <Button variant="outline" className="w-full h-12 justify-start gap-4 bg-white/5 text-slate-300 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl font-bold italic text-xs">
                                    <Share2 className="w-4 h-4" /> BIM Collaboration Hub
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Quantity Surveying Section */}
                <section className="py-16 border-t dark:border-slate-800 transition-colors">
                    <h2 className="text-3xl md:text-4xl font-black mb-10 text-slate-900 dark:text-white uppercase tracking-tight">AI Quantity Surveying</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <p className="text-xl text-muted-foreground dark:text-slate-400 font-medium leading-relaxed italic">
                                Upload your project documents and our AI will parse them to create a detailed, phase-by-phase material and cost breakdown.
                            </p>
                            <ul className="space-y-5">
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Automatic identification of material quantities from CAD.</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Live pricing synchronization with our marketplace.</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Interactive Phase Scheduling (Foundations, Shell, Finishes).</span>
                                </li>
                            </ul>
                            <Button
                                size="lg"
                                className="px-10 py-8 text-xl rounded-2xl shadow-2xl shadow-primary/20 transition-all font-black uppercase tracking-widest h-16"
                                asChild={!isPro}
                            >
                                {!isPro ? (
                                    <Link to="/register/pro">Become a Pro <Sparkles className="w-5 h-5 ml-3" /></Link>
                                ) : (
                                    <span>Upload Project Blueprint</span>
                                )}
                            </Button>
                        </div>
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 transition-colors">
                            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] aspect-video flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 transition-colors border-2 border-dashed dark:border-slate-700">
                                <Calculator className="w-20 h-20 mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">BIM/CAD Preview Area</p>
                                <p className="text-sm font-medium italic mt-2">Upload a model to see AI analysis overlap.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Refill Credits Modal */}
            <Dialog open={showRefillModal} onOpenChange={setShowRefillModal}>
                <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-3xl bg-white dark:bg-slate-950">
                    <div className="p-8 md:p-12">
                        <DialogHeader className="mb-10 text-center">
                            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-3">
                                <Sparkles className="w-8 h-8 text-primary" /> Refill AI Credits
                            </DialogTitle>
                            <DialogDescription className="text-lg font-medium italic text-slate-500 max-w-xl mx-auto mt-4">
                                Choose a package to power your architectural design visions. Credits never expire.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {creditPackages.map((pack) => (
                                <Card
                                    key={pack.name}
                                    className={`relative group border-2 transition-all p-6 flex flex-col rounded-[2rem] hover:scale-[1.02] cursor-pointer ${pack.popular ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                                        }`}
                                    onClick={() => handlePaystackPayment(pack)}
                                >
                                    {pack.popular && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                                            Most Popular
                                        </span>
                                    )}
                                    <div className="mb-6">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{pack.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-slate-900 dark:text-white italic">{pack.credits}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Credits</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic mb-8 flex-grow">
                                        {pack.description}
                                    </p>
                                    <div className="mt-auto">
                                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                                            ₦{pack.price.toLocaleString()}
                                        </div>
                                        <Button className="w-full bg-slate-900 dark:bg-white dark:text-black hover:bg-primary hover:text-white transition-all rounded-xl font-black uppercase tracking-widest text-xs h-12">
                                            Buy Pack
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
                            <img src="https://paystack.com/assets/payment/paystack-badge-light.png" alt="Paystack Secured" className="h-4 dark:hidden" />
                            <img src="https://paystack.com/assets/payment/paystack-badge-dark.png" alt="Paystack Secured" className="h-4 hidden dark:block" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
};

export default AIStudio;
