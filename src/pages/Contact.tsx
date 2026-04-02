import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Linkedin, MapPin, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    role: "",
    projectStage: "",
    message: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Consultation Request Received!",
      description: "We'll contact you within 24 hours to schedule your free materials review.",
    });

    setFormData({
      name: "",
      company: "",
      role: "",
      projectStage: "",
      message: "",
      email: "",
      phone: "",
    });
    setIsSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const benefits = [
    "Free 30-minute materials review consultation",
    "Expert assessment of your project needs",
    "Custom recommendations for your specific challenges",
    "No obligation - just valuable insights",
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-secondary/30 dark:bg-slate-900/50 transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">
              Schedule Your Free Materials Review
            </h1>
            <p className="text-xl text-muted-foreground dark:text-slate-400 font-medium leading-relaxed">
              Let's discuss how quality material decisions can transform your construction project's success and longevity.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <Card className="border-2 dark:border-slate-800 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
                <CardContent className="pt-8">
                  <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-tighter">Book Your Consultation</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="+234 (0) 123 456 7890"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company">Company/Project Name</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleChange("company", e.target.value)}
                        placeholder="Your Company or Project"
                      />
                    </div>

                    <div>
                      <Label htmlFor="role">Your Role *</Label>
                      <Select onValueChange={(value) => handleChange("role", value)} value={formData.role}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project-owner">Project Owner</SelectItem>
                          <SelectItem value="project-manager">Project Manager</SelectItem>
                          <SelectItem value="builder">Builder/Contractor</SelectItem>
                          <SelectItem value="architect">Architect</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="projectStage">Project Stage</Label>
                      <Select onValueChange={(value) => handleChange("projectStage", value)} value={formData.projectStage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning/Pre-construction</SelectItem>
                          <SelectItem value="design">Design Phase</SelectItem>
                          <SelectItem value="procurement">Material Procurement</SelectItem>
                          <SelectItem value="construction">Under Construction</SelectItem>
                          <SelectItem value="completed">Completed - Review Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="message">Brief Message *</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        rows={4}
                        placeholder="Tell us about your project and material quality concerns..."
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-primary dark:text-slate-900 hover:bg-primary text-white font-black h-12 rounded-xl transition-all shadow-lg hover:shadow-primary/20" size="lg">
                      {isSubmitting ? "Submitting..." : "Book Free Consultation"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Info Sidebar */}
            <div className="space-y-8">
              {/* What to Expect */}
              <Card className="border-2 border-primary dark:bg-slate-900/50 rounded-3xl overflow-hidden shadow-sm">
                <CardContent className="pt-8">
                  <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">What to Expect</h3>
                  <ul className="space-y-4">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-600 dark:text-slate-400">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="border-2 dark:border-slate-800 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm transition-colors">
                <CardContent className="pt-8">
                  <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">Other Ways to Reach Us</h3>
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-primary mr-3 mt-0.5" />
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Email</p>
                        <a href="mailto:contact@genuinestuffs.com" className="font-bold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
                          contact@genuinestuffs.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Linkedin className="w-5 h-5 text-primary mr-3 mt-0.5" />
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">LinkedIn</p>
                        <a href="#" className="font-bold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
                          Genuine Stuffs Ltd
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-primary mr-3 mt-0.5" />
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Office</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                          No 8 Milverton Road<br />
                          Ikoyi, Lagos, Nigeria<br />
                          Available for projects nationwide
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card className="border-2 dark:border-slate-800 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm transition-colors">
                <CardContent className="pt-8">
                  <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">Business Hours</h3>
                  <div className="space-y-3 font-medium text-slate-600 dark:text-slate-400">
                    <p className="flex justify-between items-center"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Mon - Fri:</span> <span>8:00 AM - 6:00 PM</span></p>
                    <p className="flex justify-between items-center"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Sat:</span> <span>9:00 AM - 2:00 PM</span></p>
                    <p className="flex justify-between items-center"><span className="text-xs font-black uppercase tracking-widest text-slate-400 text-red-400">Sun:</span> <span className="text-red-400">Closed</span></p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-6 uppercase tracking-wider italic">
                    * We typically respond to inquiries within 24 business hours
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
