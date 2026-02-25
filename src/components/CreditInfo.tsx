
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface CreditInfoProps {
    credits: number;
    totalCredits?: number;
    variant?: "compact" | "full";
}

const CreditInfo = ({ credits, totalCredits = 10, variant = "full" }: CreditInfoProps) => {
    const percentage = (credits / totalCredits) * 100;

    if (variant === "compact") {
        return (
            <div className="flex items-center gap-3 bg-primary/10 dark:bg-white/5 border dark:border-white/10 px-4 py-2 rounded-xl">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {credits} Credits
                </span>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-white dark:bg-card rounded-3xl overflow-hidden transition-all hover:shadow-2xl">
            <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> Usage & Credits
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Trial Mode Active</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black text-primary italic leading-none">{credits}</span>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Left</p>
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Utilization</span>
                        <span>{credits}/{totalCredits}</span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-slate-100 dark:bg-black/40 border dark:border-white/5" />
                </div>

                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white border-none h-12 font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary/20 group">
                    <Link to="/register/pro" className="flex items-center justify-center gap-2">
                        Upgrade for Unlimited <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

export default CreditInfo;
