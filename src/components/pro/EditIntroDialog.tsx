import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "backend/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
    state: "",
    country: "",
    phone: "",
    bio: "",
    showLocation: true,
    showPhone: true
  });
  
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingGeo, setIsLoadingGeo] = useState({
      countries: false,
      states: false,
      cities: false
  });

  const FALLBACK_COUNTRIES = [
    "Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", 
    "United States", "Canada", "Germany", "United Arab Emirates", 
    "China", "India", "Australia"
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      const names = profile.full_name?.split(" ") || ["", ""];
      setFormData({
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        headline: profile.headline || profile.specialty || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        showLocation: profile.profile_settings?.showLocation !== false,
        showPhone: profile.profile_settings?.showPhone !== false
      });
    }
  }, [profile, isOpen]);

  // Fetch Countries on Mount
  useEffect(() => {
    const fetchCountries = async () => {
        setIsLoadingGeo(prev => ({ ...prev, countries: true }));
        try {
            const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
            const data = await res.json();
            if (!data.error) {
                const countryNames = data.data.map((c: any) => c.name).sort();
                setCountries(countryNames);
            }
        } catch (err) {
            setCountries(FALLBACK_COUNTRIES);
        } finally {
            setIsLoadingGeo(prev => ({ ...prev, countries: false }));
        }
    };
    fetchCountries();
  }, []);

  // Fetch States when Country changes
  useEffect(() => {
    if (!formData.country) {
        setStates([]);
        return;
    }
    const fetchStates = async () => {
        setIsLoadingGeo(prev => ({ ...prev, states: true }));
        try {
            const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: formData.country })
            });
            const data = await res.json();
            if (!data.error) {
                setStates(data.data.states.map((s: any) => s.name).sort());
            }
        } catch (err) {
            console.error("Failed to fetch states", err);
        } finally {
            setIsLoadingGeo(prev => ({ ...prev, states: false }));
        }
    };
    fetchStates();
  }, [formData.country]);

  // Fetch Cities when State changes
  useEffect(() => {
    if (!formData.country || !formData.state) {
        setCities([]);
        return;
    }
    const fetchCities = async () => {
        setIsLoadingGeo(prev => ({ ...prev, cities: true }));
        try {
            const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: formData.country, state: formData.state })
            });
            const data = await res.json();
            if (!data.error) {
                setCities(data.data.sort());
            }
        } catch (err) {
            console.error("Failed to fetch cities", err);
        } finally {
            setIsLoadingGeo(prev => ({ ...prev, cities: false }));
        }
    };
    fetchCities();
  }, [formData.country, formData.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First, try updating all fields (assuming DB is upgraded)
      const updatePayload: any = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        specialty: formData.headline,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        phone: formData.phone,
        bio: formData.bio,
        headline: formData.headline,
        profile_settings: {
          showLocation: formData.showLocation,
          showPhone: formData.showPhone
        }
      };

      const { error } = await supabase
        .from('professionals')
        .update(updatePayload)
        .eq('id', profile.id);

      if (error) {
        // If it fails with PGRST204 (missing column), try a basic update without the new columns
        if (error.code === 'PGRST204') {
          console.warn("DB Schema mismatch detected. Attempting basic update...");
          const basicPayload = {
            full_name: updatePayload.full_name,
            specialty: updatePayload.specialty,
            city: updatePayload.city,
            state: updatePayload.state,
            country: updatePayload.country,
            phone: updatePayload.phone,
            bio: updatePayload.bio
          };
          
          const { error: basicError } = await supabase
            .from('professionals')
            .update(basicPayload)
            .eq('id', profile.id);
            
          if (basicError) throw basicError;
          toast.warning("Profile saved with basic info. Please run the SQL script I provided to enable Privacy and Headline features.");
        } else {
          throw error;
        }
      } else {
        toast.success("Profile intro updated successfully!");
      }

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Country/Region*</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(val) => setFormData({ ...formData, country: val, state: "", city: "" })}
                >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs">
                        <SelectValue placeholder={isLoadingGeo.countries ? "Loading..." : "Select Country"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {countries.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">State*</Label>
                <Select 
                  value={formData.state} 
                  onValueChange={(val) => setFormData({ ...formData, state: val, city: "" })}
                  disabled={!formData.country || isLoadingGeo.states}
                >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs">
                        {isLoadingGeo.states && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                        <SelectValue placeholder={isLoadingGeo.states ? "Loading..." : "Select State"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {states.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">City*</Label>
                <Select 
                  value={formData.city} 
                  onValueChange={(val) => setFormData({ ...formData, city: val })}
                  disabled={!formData.state || isLoadingGeo.cities}
                >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs">
                        {isLoadingGeo.cities && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                        <SelectValue placeholder={isLoadingGeo.cities ? "Loading..." : "Select City"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {cities.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                </Select>
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
