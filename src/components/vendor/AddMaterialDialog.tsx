import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Upload, ImageIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// ── Comprehensive Material Catalogue ────────────────────────────────
const materialCatalogue: Record<string, string[]> = {
  "Cement & Aggregates": [
    "Cement (OPC)",
    "Cement (PPC)",
    "Granite/Gravel",
    "Sharp Sand",
    "Plaster Sand",
    "Laterite Sand",
    "Stone Dust",
    "Hard-core Stone",
    "Site Water",
    "Sandcrete Hollow Block",
    "Concrete Hollow Block",
    "Brick",
    "Precast Concrete Slab",
  ],
  "Steel & Iron": [
    "Rebar (Y10)",
    "Rebar (Y12)",
    "Rebar (Y16)",
    "Rebar (Y20)",
    "Rebar (Y25)",
    "Steel Sheet",
    "Binding Wire",
    "BRC Wire Mesh",
    "H Beam (Steel)",
    "Angle Iron",
    "Steel Pipe",
    "Flat Bar",
    "Channel Iron",
    "Nails (Various Sizes)",
  ],
  "Roofing": [
    "Roof Sheet (Corrugated)",
    "Roof Sheet (Step Tile)",
    "Roof Sheet (Long Span)",
    "Roof Sheet (Stone Coated)",
    "Bituminous Felt",
    "Roof Truss",
    "Fascia Board",
    "Ridge Cap",
    "Gutter & Downpipe",
  ],
  "Flooring": [
    "Floor Tiles (Ceramic)",
    "Floor Tiles (Porcelain)",
    "Floor Tiles (Vitrified)",
    "Wall Tiles",
    "Granite Tile",
    "Marble Tile",
    "Terrazzo Tile",
    "Tile Adhesive",
    "Tile Grout",
    "Interlocking Stone",
    "Kerb Stone",
  ],
  "Finishing": [
    "Paint (Emulsion)",
    "Paint (Gloss/Oil)",
    "Paint (Textured)",
    "Paint (Screeding)",
    "Primer & Undercoat",
    "POP (Plaster of Paris)",
    "Wall Putty / Filler",
    "Sandpaper",
    "Waterproof Coating",
    "Sealant & Caulk",
    "Epoxy Coating",
  ],
  "Electrical": [
    "Electrical Cable & Wire",
    "Armoured Cable",
    "Recline Cable",
    "Electrical Conduit/Pipe",
    "Switch (Socket)",
    "Junction Box",
    "Circuit Breaker",
    "Distribution Board",
    "Lightning/Thunder Arrestor",
    "Metering Device",
    "Lighting Bulb",
    "Chandelier",
    "Fluorescent Fitting",
    "LED Panel Light",
    "Transformer",
    "Electricity Pole (Wooden)",
    "Electricity Pole (Concrete)",
  ],
  "Plumbing": [
    "PVC Pipe",
    "PPR Pipe",
    "CPVC Pipe",
    "Plumbing Fittings (Elbow, Tee, etc.)",
    "Water Heater",
    "Floor Drain",
    "Wash Hand Basin",
    "Kitchen Sink",
    "Bathtub",
    "Bidet",
    "WC / Toilet",
    "Shower Set",
    "Water Tap / Faucet",
    "Septic Tank",
    "DPC / DPM",
    "Water Hose",
  ],
  "Doors, Windows & Glazing": [
    "Door (Wooden)",
    "Door (Metal/Steel)",
    "Door (Flush)",
    "Door (Panel)",
    "Door Handle & Lock",
    "Aluminium Window",
    "Aluminium Subframe",
    "Glass & Glazing",
    "Burglar Proof",
    "Gate (Metal)",
    "Gate (Sliding)",
  ],
  "Ceiling & Interior": [
    "POP Ceiling",
    "PVC Ceiling",
    "Wood Ceiling",
    "Suspended Ceiling Grid",
    "Kitchen Cabinet",
    "Wardrobe",
    "Air-Conditioning Unit (Split)",
    "Air-Conditioning Unit (Window)",
  ],
  "Wood & Timber": [
    "1×12 Wood",
    "2×2 Wood Bracing",
    "2×3 Wood",
    "2×4 Wood",
    "2×6 Wood",
    "H Beam Timber",
    "Marine Board",
    "Plywood",
    "MDF Board",
    "HDF Board",
    "Particle Board",
    "Wooden Peg",
  ],
  "Paving & Roadworks": [
    "Asphalt",
    "Bituminous Felt",
    "Stone Base",
    "Interlocking Stone",
    "Kerb Stone",
    "Stone Dust",
    "Concrete Slab",
    "Road Marking Paint",
    "Speed Bump (Rubber)",
    "Traffic Cone",
  ],
  "Water & Pumps": [
    "Submersible Pump",
    "Surface Pump",
    "Booster Pump",
    "Water Storage Tank (Plastic)",
    "Water Storage Tank (Steel)",
    "Water Treatment Equipment",
    "Overhead Tank Stand",
    "Pressure Tank",
  ],
  "Power & Energy": [
    "Generator Set",
    "Solar Panel",
    "Inverter",
    "Battery (Solar/Inverter)",
    "Change-Over Switch",
    "Voltage Regulator / Stabilizer",
    "Power Cable Tray",
  ],
  "Security & Outdoor": [
    "Concertina Barbed Wire",
    "Razor Wire",
    "Security Camera (CCTV)",
    "Outdoor Lighting",
    "Solar Street Light",
    "Fence Post",
    "Electric Fence Kit",
    "Perimeter Alarm",
    "Motion Sensor",
  ],
  "Tools": [
    "Hand Saw",
    "Electric Saw (Circular)",
    "Hammer",
    "Measuring Tape",
    "Spirit Level",
    "Plumb Bob",
    "Nail (Assorted)",
    "Line / Rope",
    "Ranging Pole",
    "Cutlass",
    "Shovel",
    "Hand Trowel",
    "Hand Pan",
    "Wheelbarrow",
    "Crowbar / Wrecking Bar",
    "Chisel (Cold & Wood)",
    "Drill Machine",
    "Angle Grinder",
    "Paint Roller & Tray",
    "Screwdriver Set",
    "Spanner / Wrench Set",
    "Pipe Wrench",
  ],
  "Safety Gear": [
    "Helmet",
    "Reflective Jacket / Vest",
    "Rain Boot",
    "Site Boot (Safety)",
    "Hand Glove",
    "Nose Mask / Respirator",
    "Eye Protector / Goggles",
    "Ear Muff / Plug",
    "Safety Harness",
    "First Aid Kit",
    "Fire Extinguisher",
    "Deldrex Anti-Termite",
  ],
  "Equipment": [
    "Bulldozer",
    "Excavator",
    "Swamp Buggy",
    "Grader",
    "Payloader",
    "Digger",
    "Concrete Mixer",
    "Metal Formwork",
    "Plastic Formwork",
    "Galvanised Props",
    "Compactor Machine",
    "Vibrator Machine",
    "Water Spray Machine",
    "Levelling Instrument",
    "Theodolite",
    "Total Station",
    "Differential GPS",
    "Scaffolding Set",
    "Crane (Mobile)",
    "Boom Lift",
    "Jack Hammer",
    "Plate Compactor",
  ],
};

const allCategories = Object.keys(materialCatalogue);
// ────────────────────────────────────────────────────────────────────

export function AddMaterialDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    unit: "",
    description: "",
    availability: "In Stock"
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When category changes, reset the name selection
  const handleCategoryChange = (val: string) => {
    setFormData({ ...formData, category: val, name: "" });
  };

  const availableNames = formData.category ? materialCatalogue[formData.category] || [] : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async (newMaterial: any) => {
      let uploadedImageUrl = "/images/materials/cement_bags.png";

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user?.id || 'public'}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, selectedFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('materials')
            .getPublicUrl(filePath);
          uploadedImageUrl = publicUrl;
        } else {
          console.warn("Storage bucket 'materials' might not exist or be accessible, using fallback image.");
        }
      }

      newMaterial.image_url = uploadedImageUrl;

      const { data, error } = await supabase
        .from('materials')
        .insert([newMaterial])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-materials'] });
      toast.success("Material added successfully!");
      setOpen(false);
      setFormData({
        name: "",
        category: "",
        price: "",
        unit: "",
        description: "",
        availability: "In Stock"
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to add material: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast.error("You must be logged in to add a material.");
        return;
    }
    mutation.mutate({
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      unit: formData.unit,
      description: formData.description,
      availability: formData.availability,
      vendor_id: user.id,
      vendor_name: user?.user_metadata?.full_name || "Vendor",
      is_verified: true,
      rating: 5.0,
      tags: [],
      co2_footprint: "Low Impact"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs h-11 px-6 rounded-xl shrink-0">
            <Plus className="w-4 h-4" /> Add Material
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="px-2 space-y-3 shrink-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Add New Material</DialogTitle>
          <DialogDescription className="text-sm font-medium italic text-slate-500">
            List a new product to your inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 px-2">
          {/* ── Category Select ── */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Category
            </Label>
            <Select 
                value={formData.category} 
                onValueChange={handleCategoryChange}
                required
            >
              <SelectTrigger className="col-span-3 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary shadow-sm font-bold">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 font-bold max-h-60">
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* ── Name Select (filtered by category) ── */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Name
            </Label>
            <Select
              value={formData.name}
              onValueChange={(val) => setFormData({ ...formData, name: val })}
              required
              disabled={!formData.category}
            >
              <SelectTrigger className={`col-span-3 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary shadow-sm font-bold ${!formData.category ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder={formData.category ? "Select material" : "Pick a category first"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 font-bold max-h-60">
                {availableNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Price (₦)
            </Label>
            <Input
              id="price"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="col-span-3 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Unit
            </Label>
            <Input
              id="unit"
              required
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              className="col-span-3 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold placeholder:font-medium placeholder:italic"
              placeholder="e.g. 50kg Bag, Ton, sqm"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Description
            </Label>
            <Textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="col-span-3 min-h-[80px] rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold resize-none placeholder:font-medium placeholder:italic text-sm"
              placeholder="Brief details about the material..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Image
            </Label>
            <div className="col-span-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${previewUrl ? 'border-primary/50 bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'}`}
              >
                {previewUrl ? (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-slate-500">
                    <Upload className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to upload</span>
                    <span className="text-[10px] font-medium italic mt-1 opacity-70">JPG, PNG or WEBP</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
        <DialogFooter className="px-2 pt-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="rounded-xl font-black uppercase tracking-widest text-xs text-slate-500"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={mutation.isPending}
            className="w-full sm:w-auto rounded-xl font-black uppercase tracking-widest text-xs h-11 px-8 shadow-lg shadow-primary/20"
           >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            List Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
