import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface EditIntroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated: () => void;
}

const EditIntroDialog = ({ isOpen, onClose, profile, onProfileUpdated }: EditIntroDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    headline: "",
    city: "",
    country: "",
    phone: "",
    bio: "",
    showLocation: true,
    showPhone: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      const names = profile.full_name?.split(" ") || ["", ""];
      setFormData({
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        headline: profile.headline || profile.specialty || "",
        city: profile.city || "",
        country: profile.country || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        showLocation: profile.profile_settings?.showLocation !== false,
        showPhone: profile.profile_settings?.showPhone !== false
      });
    }
  }, [profile, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          specialty: formData.headline,
          headline: formData.headline,
          city: formData.city,
          country: formData.country,
          phone: formData.phone,
          bio: formData.bio,
          profile_settings: {
            showLocation: formData.showLocation,
            showPhone: formData.showPhone
          }
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("Profile intro updated successfully!");
      onProfileUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error updating profile intro:", err);
      toast.error(err.message || "Failed to update profile intro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit intro</DialogTitle>
          <DialogDescription className="text-xs font-medium italic text-slate-500">* Indicates required</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Basic info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">First name*</Label>
                <Input 
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Last name*</Label>
                <Input 
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Headline*</Label>
              <Textarea 
                required
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g. Senior Architect | Sustainable Design Expert"
                className="min-h-[80px] rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium p-4"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Country/Region*</Label>
                <Input 
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">City*</Label>
                <Input 
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
              <Checkbox 
                id="showLocation" 
                checked={formData.showLocation}
                onCheckedChange={(checked) => setFormData({ ...formData, showLocation: checked as boolean })}
              />
              <label htmlFor="showLocation" className="text-xs font-bold cursor-pointer">Show location in my intro</label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Contact info</h3>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Phone Number</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
              />
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
              <Checkbox 
                id="showPhone" 
                checked={formData.showPhone}
                onCheckedChange={(checked) => setFormData({ ...formData, showPhone: checked as boolean })}
              />
              <label htmlFor="showPhone" className="text-xs font-bold cursor-pointer">Show contact info in my intro</label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest">Bio / Summary</Label>
            <Textarea 
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium p-4"
            />
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full md:w-auto h-11 rounded-full px-10 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIntroDialog;
