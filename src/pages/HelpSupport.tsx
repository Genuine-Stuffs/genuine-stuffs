import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    HelpCircle, 
    Search, 
    MessageSquare, 
    Phone, 
    Mail, 
    FileText, 
    ExternalLink,
    ChevronRight,
    Youtube,
    LifeBuoy,
    BookOpen,
    ShieldAlert
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const HelpSupport = () => {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const faqs = [
        {
            category: "General",
            questions: [
                { q: "What is Material Insight?", a: "Material Insight is a website that uses real data to connect sellers of building materials with checked professionals, so buying materials and running a project go smoothly." },
                { q: "How do I verify my account?", a: "Sellers upload their CAC (Corporate Affairs Commission) registration documents and a short business profile on the Settings page. Professionals are checked using their professional licence numbers." }
            ]
        },
        {
            category: "For Sellers",
            questions: [
                { q: "How do I list new materials?", a: "Go to the Material Inventory page and click 'Add Material'. Fill in the details and price, and upload clear photos." },
                { q: "What are the transaction fees?", a: "We charge a small fee on every completed sale. It pays for running the website and for holding each payment safely until the order is delivered (known as escrow)." }
            ]
        },
        {
            category: "Payments",
            questions: [
                { q: "How do I get paid?", a: "Payments go through Paystack, a secure online payment service. Once an order is marked as delivered and the customer confirms it, the money is paid into your registered bank account." },
                { q: "Can I cancel an order?", a: "You can cancel an order until it is marked 'Processing'. After that, cancelling depends on our refund policy." }
            ]
        }
    ];

    const handleSubmitTicket = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            toast({
                title: "Ticket Submitted",
                description: "Our support team will get back to you within 24 hours.",
            });
            setIsSubmitting(false);
            (e.target as HTMLFormElement).reset();
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
            <Navbar />
            
            <main className="pb-20">
                {/* Hero Section */}
                <section className="bg-slate-900 py-16 px-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
                        <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
                    </div>
                    
                    <div className="max-w-4xl mx-auto relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                            <LifeBuoy className="w-3.5 h-3.5" /> Support Center
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-8">How can we help you today?</h1>
                        
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input 
                                className="h-16 pl-14 pr-8 rounded-2xl bg-white/10 border-white/10 text-white placeholder:text-slate-400 text-lg font-medium backdrop-blur-md focus:bg-white/20 transition-all shadow-2xl" 
                                placeholder="Search for answers..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[
                            { icon: BookOpen, title: "Knowledge Base", desc: "Step-by-step guides to using the website.", color: "text-blue-500", bg: "bg-blue-50" },
                            { icon: Youtube, title: "Video Tutorials", desc: "Watch how-to videos for every feature.", color: "text-red-500", bg: "bg-red-50" },
                            { icon: ShieldAlert, title: "Building Standards", desc: "Learn how quality is checked and how to stay safe.", color: "text-amber-500", bg: "bg-amber-50" },
                        ].map((card, i) => (
                            <Card key={i} className="border-none shadow-xl rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                                <CardContent className="p-8">
                                    <div className={`w-14 h-14 ${card.bg} ${card.color} rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                        <card.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{card.title}</h3>
                                    <p className="text-slate-500 font-medium text-sm italic mb-6">{card.desc}</p>
                                    <Button variant="ghost" className="p-0 h-auto font-black text-[11px] uppercase tracking-widest text-primary gap-2 group/btn">
                                        Explore More <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* FAQ Section */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Frequently Asked Questions</h2>
                                <Button variant="link" className="font-bold text-primary">View All FAQ</Button>
                            </div>

                            <div className="space-y-6">
                                {faqs.map((cat, i) => (
                                    <div key={i} className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{cat.category}</h3>
                                        <Accordion type="single" collapsible className="w-full space-y-3">
                                            {cat.questions.map((faq, j) => (
                                                <AccordionItem key={j} value={`${i}-${j}`} className="border-none bg-white dark:bg-slate-900 rounded-2xl px-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                                    <AccordionTrigger className="hover:no-underline py-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors text-left">
                                                        {faq.q}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="text-slate-500 font-medium italic pb-5">
                                                        {faq.a}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contact & Ticket Section */}
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Get in Touch</h2>
                            
                            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-primary text-white">
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Live Chat</p>
                                            <p className="font-bold">Available 24/7</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Email Support</p>
                                            <p className="font-bold">support@materialinsight.com</p>
                                        </div>
                                    </div>
                                    <Button className="w-full h-14 bg-white text-primary hover:bg-slate-100 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg">
                                        Report a Problem
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-0">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Send Us a Message</CardTitle>
                                    <CardDescription className="italic font-medium">We'll respond as soon as possible.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-6">
                                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Subject</Label>
                                            <Input required className="h-11 rounded-xl bg-slate-50 border-none font-bold" placeholder="How can we help?" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Description</Label>
                                            <Textarea required className="min-h-[120px] rounded-2xl bg-slate-50 border-none font-medium text-sm p-4" placeholder="Tell us what went wrong..." />
                                        </div>
                                        <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
                                            {isSubmitting ? "Sending..." : "Send Ticket"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HelpSupport;
