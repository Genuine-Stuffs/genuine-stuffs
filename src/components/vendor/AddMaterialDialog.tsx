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

export function AddMaterialDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    unit: "",
    unit: "",
    description: "",
    availability: "In Stock"
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          console.warn("Storage bucker 'materials' might not exist or be accessible, using fallback image.");
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
      vendor_name: user?.user_metadata?.full_name || "Vendor", // fallback
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
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="px-2 space-y-3">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Add New Material</DialogTitle>
          <DialogDescription className="text-sm font-medium italic text-slate-500">
            List a new product to your inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 py-4 px-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Name
            </Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="col-span-3 h-12 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold placeholder:font-medium placeholder:italic"
              placeholder="e.g. Portland Cement"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
              Category
            </Label>
            <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({...formData, category: val})}
                required
            >
              <SelectTrigger className="col-span-3 h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary shadow-sm font-bold">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 font-bold">
                <SelectItem value="Cement & Aggregates">Cement & Aggregates</SelectItem>
                <SelectItem value="Steel & Iron">Steel & Iron</SelectItem>
                <SelectItem value="Flooring">Flooring</SelectItem>
                <SelectItem value="Roofing">Roofing</SelectItem>
                <SelectItem value="Finishing">Finishing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
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
              className="col-span-3 h-12 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold"
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
              className="col-span-3 h-12 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold placeholder:font-medium placeholder:italic"
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
              className="col-span-3 min-h-[100px] rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm font-bold resize-none placeholder:font-medium placeholder:italic"
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
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${previewUrl ? 'border-primary/50 bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'}`}
              >
                {previewUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to upload</span>
                    <span className="text-xs font-medium italic mt-1 opacity-70">JPG, PNG or WEBP</span>
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
