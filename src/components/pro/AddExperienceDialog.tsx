import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Sparkles } from "lucide-react";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";

interface AddExperienceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    professionalId: string;
    onExperienceAdded: () => void;
}

const AddExperienceDialog = ({ isOpen, onClose, professionalId, onExperienceAdded }: AddExperienceDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        company: "",
        employment_type: "",
        location: "",
        location_type: "",
        start_month: "",
        start_year: "",
        end_month: "",
        end_year: "",
        is_current: false,
        description: "",
        skills: [] as string[]
    });
    const [newSkill, setNewSkill] = useState("");

    const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const handleAddSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
            setNewSkill("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.start_month || !formData.start_year) {
            toast.error("Please select a start month and year.");
            return;
        }

        if (!formData.is_current && (!formData.end_month || !formData.end_year)) {
            toast.error("Please select an end month and year or mark as current.");
            return;
        }

        setIsSubmitting(true);

        try {
            const startMonthIndex = months.indexOf(formData.start_month);
            const startDate = `${formData.start_year}-${(startMonthIndex + 1).toString().padStart(2, '0')}-01`;
            
            let endDate = null;
            if (!formData.is_current) {
                const endMonthIndex = months.indexOf(formData.end_month);
                endDate = `${formData.end_year}-${(endMonthIndex + 1).toString().padStart(2, '0')}-01`;
            }

            const { error } = await supabase
                .from('professional_experiences')
                .insert([{
                    professional_id: professionalId,
                    title: formData.title,
                    company: formData.company,
                    employment_type: formData.employment_type || null,
                    location: formData.location,
                    location_type: formData.location_type || null,
                    start_date: startDate,
                    end_date: endDate,
                    is_current: formData.is_current,
                    description: formData.description,
                    skills: formData.skills
                }]);

            if (error) throw error;

            toast.success("Experience added successfully!");
            onExperienceAdded();
            onClose();
        } catch (err: any) {
            console.error("Error adding experience:", err);
            toast.error(err.message || "Failed to add experience.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none p-0 bg-white dark:bg-card">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter italic">Add Experience</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 italic flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> Enhance your professional story
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pt-0 space-y-6">
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Notify network</span>
                                <div className="w-10 h-5 bg-slate-200 dark:bg-white/10 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title *</Label>
                                <Input 
                                    placeholder="Ex: Retail Sales Manager" 
                                    className="h-12 rounded-xl text-sm font-semibold italic"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employment type</Label>
                                <Select onValueChange={(val) => setFormData(prev => ({ ...prev, employment_type: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold italic">
                                        <SelectValue placeholder="Please select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Full-time', 'Part-time', 'Self-employed', 'Freelance', 'Contract', 'Internship'].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company or organization *</Label>
                            <Input 
                                placeholder="Ex: Microsoft" 
                                className="h-12 rounded-xl text-sm font-semibold italic"
                                required
                                value={formData.company}
                                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center space-x-2 py-2">
                            <Checkbox 
                                id="current-role" 
                                checked={formData.is_current}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_current: !!checked }))}
                            />
                            <Label htmlFor="current-role" className="text-xs font-bold text-slate-700 pointer-events-none italic">
                                I am currently working in this role
                            </Label>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Month *</Label>
                                <Select onValueChange={(val) => setFormData(prev => ({ ...prev, start_month: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl text-xs font-semibold italic px-2">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Year *</Label>
                                <Select onValueChange={(val) => setFormData(prev => ({ ...prev, start_year: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl text-xs font-semibold italic px-2">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {!formData.is_current && (
                                <>
                                    <div className="space-y-1.5 col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Month *</Label>
                                        <Select onValueChange={(val) => setFormData(prev => ({ ...prev, end_month: val }))}>
                                            <SelectTrigger className="h-12 rounded-xl text-xs font-semibold italic px-2">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Year *</Label>
                                        <Select onValueChange={(val) => setFormData(prev => ({ ...prev, end_year: val }))}>
                                            <SelectTrigger className="h-12 rounded-xl text-xs font-semibold italic px-2">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</Label>
                                <Input 
                                    placeholder="Ex: London, United Kingdom" 
                                    className="h-12 rounded-xl text-sm font-semibold italic"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location type</Label>
                                <Select onValueChange={(val) => setFormData(prev => ({ ...prev, location_type: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold italic">
                                        <SelectValue placeholder="Please select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['On-site', 'Hybrid', 'Remote'].map(l => (
                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
                            <Textarea 
                                className="min-h-[120px] rounded-2xl text-sm font-medium italic resize-none"
                                placeholder="Describe your responsibilities and achievements..."
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                maxLength={2000}
                            />
                            <div className="text-right text-[9px] font-bold text-slate-400">
                                {formData.description.length}/2,000
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Skills</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Add skill (e.g. Structural Engineering)" 
                                    className="h-10 rounded-xl text-xs font-semibold italic"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                />
                                <Button type="button" onClick={handleAddSkill} variant="outline" className="h-10 rounded-xl border-primary text-primary hover:bg-primary/10">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.skills.map(skill => (
                                    <span key={skill} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-tighter">
                                        {skill}
                                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeSkill(skill)} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 border-t border-slate-100 dark:border-white/5">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full font-black uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90 rounded-full h-12 px-10 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddExperienceDialog;
