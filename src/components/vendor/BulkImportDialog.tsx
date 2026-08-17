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
import { FileUp, Loader2, UploadCloud, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Papa from "papaparse";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BulkImportDialogProps {
  trigger?: React.ReactNode;
}

export function BulkImportDialog({ trigger }: BulkImportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please select a valid CSV file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const mutation = useMutation({
    mutationFn: async (csvData: any[]) => {
      // Map and insert data
      const insertData = csvData.map((row) => ({
        name: row.Name || row.name,
        category: row.Category || row.category,
        price: parseFloat(row.Price || row.price || 0),
        unit: row.Unit || row.unit || "unit",
        description: row.Description || row.description || "",
        availability: row.Availability || row.availability || "In Stock",
        vendor_id: user?.id,
        vendor_name: user?.user_metadata?.full_name || "Vendor",
        is_verified: true,
        rating: 5.0,
        tags: [],
        co2_footprint: "Low Impact",
        image_url: "/images/materials/cement_bags.png", // Default image for imported materials
      }));

      // Basic validation
      const validData = insertData.filter(d => d.name && d.category && !isNaN(d.price));
      if (validData.length === 0) {
         throw new Error("No valid data found in CSV. Make sure you have Name, Category, and Price columns.");
      }

      const { data, error } = await supabase
        .from('materials')
        .insert(validData);

      if (error) throw error;
      return validData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-materials'] });
      toast.success(`Successfully imported ${data.length} materials!`);
      setOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to import materials: ${error.message}`);
    }
  });

  const handleImport = () => {
    if (!selectedFile) return;
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }

    setParsing(true);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        if (results.errors && results.errors.length > 0) {
          console.error("CSV Parse Errors:", results.errors);
        }
        mutation.mutate(results.data);
      },
      error: (error: any) => {
        setParsing(false);
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setSelectedFile(null); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shrink-0">
              <FileUp className="w-4 h-4" /> Bulk Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="px-2 space-y-3 shrink-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Bulk Import
          </DialogTitle>
          <DialogDescription className="text-sm font-medium italic text-slate-500">
            Upload a CSV file to add multiple materials to your inventory at once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 px-2">
            <Alert className="mb-4 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Format Required</AlertTitle>
                <AlertDescription className="text-xs text-slate-500 font-medium italic mt-2">
                    Your CSV must include headers: <span className="font-bold text-slate-700 dark:text-slate-300">Name, Category, Price</span>. Optional headers: Unit, Description, Availability.
                </AlertDescription>
            </Alert>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
            />
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${selectedFile ? 'border-primary/50 bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'}`}
            >
                {selectedFile ? (
                    <div className="flex flex-col items-center justify-center text-center">
                        <FileUp className="w-10 h-10 mb-3 text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white truncate max-w-[250px]">{selectedFile.name}</span>
                        <span className="text-xs font-medium italic mt-1 text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500">
                        <UploadCloud className="w-10 h-10 mb-3 opacity-50" />
                        <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Click to upload CSV</span>
                        <span className="text-xs font-medium italic mt-1 opacity-70">Drag and drop your file here</span>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter className="px-2 pt-4 flex-col sm:flex-row gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => { setOpen(false); setSelectedFile(null); }}
            className="rounded-xl font-black uppercase tracking-widest text-xs text-slate-500"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleImport} 
            disabled={!selectedFile || parsing || mutation.isPending}
            className="w-full sm:w-auto rounded-xl font-black uppercase tracking-widest text-xs h-11 px-8 shadow-lg shadow-primary/20"
           >
            {(parsing || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Materials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
