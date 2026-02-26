import { useState } from "react";
import { AlertCircle, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

export const VerificationBanner = () => {
    const { user } = useAuth();
    const [sending, setSending] = useState(false);

    if (!user || user.email_confirmed_at) return null;

    const resendVerification = async () => {
        setSending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email!,
            });
            if (error) throw error;
            toast.success("Verification email sent! Please check your inbox.");
        } catch (error: any) {
            toast.error(error.message || "Failed to send verification email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-3 animate-in slide-in-from-top duration-500">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">
                        Your email <span className="underline decoration-amber-500/50">{user.email}</span> is not verified.
                        Please verify to unlock all platform features.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resendVerification}
                    disabled={sending}
                    className="rounded-xl border-amber-500/20 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-2 font-black uppercase tracking-tighter text-[10px] h-9"
                >
                    {sending ? (
                        <RotateCw className="w-3 h-3 animate-spin" />
                    ) : (
                        <Mail className="w-3 h-3" />
                    )}
                    {sending ? "Sending..." : "Resend Verification"}
                </Button>
            </div>
        </div>
    );
};
