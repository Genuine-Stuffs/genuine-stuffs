import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ShoppingBag, ArrowLeft, Trash2, Plus, Minus, ShieldCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const Cart = () => {
    const navigate = useNavigate();

    // Placeholder cart items
    const cartItems: any[] = [];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            
            <main className="container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate(-1)}
                            className="rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                            Your <span className="text-primary italic">Cart</span>
                        </h1>
                    </div>

                    {cartItems.length === 0 ? (
                        /* Empty State */
                        <Card className="p-12 md:p-24 text-center border-2 border-dashed border-slate-200 dark:border-border rounded-[2.5rem] bg-white dark:bg-card shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-muted/40 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                                Your cart is currently empty
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic mb-8 max-w-md mx-auto">
                                Looks like you haven't added any premium construction materials to your cart yet.
                            </p>
                            <Button 
                                onClick={() => navigate("/marketplace")}
                                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all gap-3"
                            >
                                <ShoppingCart className="w-4 h-4" /> Start Shopping
                            </Button>
                        </Card>
                    ) : (
                        /* Cart Content (Future Implementation) */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4">
                                {/* Items will go here */}
                            </div>
                            <div className="lg:col-span-1">
                                {/* Summary will go here */}
                            </div>
                        </div>
                    )}

                    {/* Trust Badges */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-border flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card flex items-center justify-center shadow-sm">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Secure Payments</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Verified Safe Checkout</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-border flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card flex items-center justify-center shadow-sm">
                                <ShoppingBag className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Direct Marketplace</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Reliable Vendor Access</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-border flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card flex items-center justify-center shadow-sm">
                                <ArrowLeft className="w-6 h-6 text-primary rotate-180" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Easy Returns</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Quality Guaranteed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Cart;
