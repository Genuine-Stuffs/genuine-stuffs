import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ShoppingBag, ArrowLeft, Trash2, Plus, Minus, ShieldCheck, ChevronRight, CreditCard, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

const Cart = () => {
    const navigate = useNavigate();
    const { items: cartItems, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
    const { user } = useAuth();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const deliveryFee = cartItems.length > 0 ? 5000 : 0;
    const platformFee = cartItems.length > 0 ? 1000 : 0; // Flat service/handling fee
    const finalTotal = totalPrice + deliveryFee + platformFee;

    const handleCheckout = () => {
        if (!user) {
            toast.error("Please login to complete your order.");
            navigate("/login");
            return;
        }

        setIsCheckingOut(true);

        const handler = (window as any).PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_mock_key',
            email: user.email || '',
            amount: finalTotal * 100,
            currency: 'NGN',
            callback: async (response: any) => {
                try {
                    // 1. Create order record
                    const { data: orderData, error: orderError } = await supabase
                        .from('orders')
                        .insert({
                            client_id: user.id,
                            subtotal: totalPrice,
                            delivery_fee: deliveryFee,
                            platform_fee: platformFee,
                            total_amount: finalTotal,
                            payment_status: 'paid',
                            payment_reference: response.reference,
                            delivery_address: 'Verification pending',
                            delivery_city: 'Lagos',
                            delivery_state: 'Ikeja'
                        })
                        .select()
                        .single();

                    if (orderError) throw orderError;

                    // 2. Create order items record with 5% platform commission cut
                    const orderItemsData = cartItems.map(item => ({
                        order_id: orderData.id,
                        material_id: item.id,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.price * item.quantity,
                        vendor_id: item.vendor_id || null,
                        commission_rate: 0.05,
                        commission_amount: item.price * item.quantity * 0.05,
                        escrow_status: 'held',
                        fulfillment_status: 'processing'
                    }));

                    const { error: itemsError } = await supabase
                        .from('order_items')
                        .insert(orderItemsData);

                    if (itemsError) throw itemsError;

                    // 3. Clear cart and redirect
                    clearCart();
                    toast.success("Order placed successfully! Transaction is protected in escrow.");
                    navigate("/profile");
                } catch (err: any) {
                    console.error("Order logging failed:", err);
                    toast.error(`Checkout succeeded but order logging failed: ${err.message}`);
                } finally {
                    setIsCheckingOut(false);
                }
            },
            onClose: () => {
                setIsCheckingOut(false);
                toast.info("Transaction cancelled.");
            }
        });

        handler.openIframe();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            <Navbar />
            
            <main className="container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => navigate("/marketplace")}
                                className="rounded-full bg-white dark:bg-card shadow-sm border border-slate-100 dark:border-border"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                                Your <span className="text-primary italic">Cart</span>
                                {totalItems > 0 && <span className="ml-3 text-sm font-bold text-slate-400">({totalItems} items)</span>}
                            </h1>
                        </div>
                        {cartItems.length > 0 && (
                            <Button 
                                variant="ghost" 
                                onClick={() => navigate("/marketplace")}
                                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors hidden md:flex"
                            >
                                Continue Shopping <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
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
                        /* Cart Content */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-2 space-y-4">
                                {cartItems.map((item) => (
                                    <Card key={item.id} className="p-4 md:p-6 rounded-3xl bg-white dark:bg-card border border-slate-100 dark:border-border overflow-hidden transition-all hover:shadow-md group">
                                        <div className="flex gap-4 md:gap-6">
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-slate-50 dark:bg-muted/50 overflow-hidden shrink-0 border border-slate-100 dark:border-border/50">
                                                <img 
                                                    src={item.image_url || "/images/materials/cement.png"} 
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{item.vendor_name || "Official Partner"}</p>
                                                        <h3 className="text-base md:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-tight line-clamp-1">
                                                            {item.name}
                                                        </h3>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                
                                                <div className="mt-auto pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="text-xl font-black text-slate-900 dark:text-white">
                                                        ₦{item.price.toLocaleString()}
                                                        <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/{item.unit}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center bg-slate-50 dark:bg-muted/30 p-1 rounded-xl border border-slate-100 dark:border-border w-fit">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="w-7 h-7 rounded-lg hover:bg-white dark:hover:bg-card"
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <Minus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                        </Button>
                                                        <span className="w-10 text-center text-xs font-black text-slate-900 dark:text-white">
                                                            {item.quantity}
                                                        </span>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="w-7 h-7 rounded-lg hover:bg-white dark:hover:bg-card"
                                                        >
                                                            <Plus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            
                            <div className="lg:col-span-1">
                                <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 border-none sticky top-24">
                                    <h3 className="text-lg font-black uppercase tracking-widest mb-6">Order Summary</h3>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between text-slate-400 font-bold text-sm">
                                            <span>Subtotal</span>
                                            <span className="text-white">₦{totalPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 font-bold text-sm">
                                            <span>Delivery Fee</span>
                                            <span className="text-white">₦{deliveryFee.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 font-bold text-sm">
                                            <span>Platform Service Fee</span>
                                            <span className="text-white">₦{platformFee.toLocaleString()}</span>
                                        </div>
                                        <Separator className="bg-white/10" />
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-white font-black uppercase tracking-widest text-xs">Total</span>
                                            <span className="text-2xl font-black text-primary italic">₦{finalTotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                         className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest transition-all gap-3 shadow-xl shadow-primary/20"
                                         onClick={handleCheckout}
                                         disabled={isCheckingOut}
                                     >
                                         {isCheckingOut ? (
                                             <>Loading checkout...</>
                                         ) : (
                                             <><CreditCard className="w-5 h-5" /> Checkout Now</>
                                         )}
                                     </Button>
                                    
                                    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <Lock className="w-3 h-3" /> Secure Transaction
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Trust Badges */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl bg-white dark:bg-card border border-slate-100 dark:border-border flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                <ShieldCheck className="w-6 h-6 " />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Secure Payments</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Verified Safe Checkout</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white dark:bg-card border border-slate-100 dark:border-border flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                <ShoppingBag className="w-6 h-6 " />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Direct Marketplace</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Reliable Vendor Access</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white dark:bg-card border border-slate-100 dark:border-border flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                <ArrowLeft className="w-6 h-6 rotate-180" />
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
