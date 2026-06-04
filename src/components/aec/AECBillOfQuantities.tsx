import React, { useMemo } from 'react';
import { MaterialRequirement, SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { structuralEngine } from '@/lib/aec/solver/structural';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Calculator, ShoppingCart, TrendingUp } from 'lucide-react';

interface AECBillOfQuantitiesProps {
  materials: MaterialRequirement[];
  layout?: SolvedLayout;
}

const AECBillOfQuantities: React.FC<AECBillOfQuantitiesProps> = ({ materials, layout }) => {
  const displayMaterials = useMemo(() => {
      let finalMats = [...materials];
      
      if (layout) {
          const skeleton = structuralEngine.generateSkeleton(layout);
          
          // Calculate Concrete Volume
          let concreteVol = 0;
          skeleton.columns.forEach(c => concreteVol += (c.width_m * c.depth_m * 3.0));
          skeleton.beams.forEach(b => concreteVol += (b.width_m * b.depth_m * b.span_m));
          
          if (concreteVol > 0) {
              finalMats.push({
                  category: "Structural",
                  specification: "C20 Grade Concrete (Columns & Beams)",
                  quantity_estimate: Math.ceil(concreteVol),
                  unit: "m3",
                  unit_price: 65000,
                  total_price: Math.ceil(concreteVol) * 65000,
                  suggested_marketplace_type: "system"
              });

              // Heuristic: ~120kg of steel per m3 of concrete
              const steelKg = concreteVol * 120;
              const steelTons = steelKg / 1000;
              finalMats.push({
                  category: "Structural",
                  specification: "High Yield Reinforcement Steel (12mm/16mm)",
                  quantity_estimate: Number(steelTons.toFixed(2)),
                  unit: "Tons",
                  unit_price: 1200000,
                  total_price: Number(steelTons.toFixed(2)) * 1200000,
                  suggested_marketplace_type: "system"
              });
          }
      }
      
      return finalMats;
  }, [materials, layout]);

  const totalProjectCost = displayMaterials.reduce((sum, mat) => sum + (mat.total_price || (mat.quantity_estimate * (mat.unit_price || 0))), 0);

  if (!displayMaterials || displayMaterials.length === 0) return null;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <CardHeader className="bg-slate-900 border-b border-slate-800 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Calculator className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Project Bill of Quantities</CardTitle>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Automated Material Take-off & Costing (Est. NGN)</p>
                </div>
            </div>
            <Badge className="bg-primary hover:bg-primary text-white text-[10px] font-black px-4 py-1 h-8 shadow-lg shadow-primary/20">
                PROVISIONAL SUM: ₦{totalProjectCost.toLocaleString()}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-white/5">
            <TableRow className="border-b dark:border-white/5 h-12">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-6">Category</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Description / Specs</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Quantity</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Unit Price</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right pr-6">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayMaterials.map((mat, idx) => {
              const unitPrice = mat.unit_price || 0;
              const lineTotal = mat.total_price || (mat.quantity_estimate * unitPrice);
              
              // Fallback Logic: In Phase 1, if the marketplace doesn't have a real vendor,
              // we rely on the System Default price (simulated here if marketplace_type is missing/system)
              const isFallback = !mat.suggested_marketplace_type || mat.suggested_marketplace_type === 'system';
              
              return (
                <TableRow key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 border-slate-100">
                  <TableCell className="pl-6">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-white dark:bg-black/20">
                        {mat.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{mat.specification}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShoppingCart className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                            {isFallback ? 'Find local supplier' : 'Buy on GS Marketplace'}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white">{mat.quantity_estimate}</span>
                    <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">{mat.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                    <div className="flex flex-col items-end">
                        <span>{unitPrice > 0 ? `₦${unitPrice.toLocaleString()}` : 'Market Price'}</span>
                        {isFallback && <span className="text-[7px] text-amber-500 font-black uppercase tracking-widest">Estimated Market Rate</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 flex flex-col items-end gap-2 py-3">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono">₦{lineTotal.toLocaleString()}</span>
                    {isFallback ? (
                        <button className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                            Request Supplier
                        </button>
                    ) : (
                        <button className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded hover:bg-primary/90 shadow-md shadow-primary/20 transition-colors">
                            Buy Now
                        </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Grand Total Row */}
            <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
              <TableCell colSpan={4} className="text-right py-4 pl-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Projected Material Sub-total:</span>
              </TableCell>
              <TableCell className="text-right pr-6 py-4">
                <span className="text-sm font-black text-primary italic">₦{totalProjectCost.toLocaleString()}</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        
        <div className="p-6 bg-slate-50 dark:bg-black/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 flex items-center justify-center overflow-hidden">
                            <img src={`https://i.pravatar.cc/100?u=${i}`} alt="Vendor" className="w-full h-full object-cover opacity-80" />
                        </div>
                    ))}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Vendor Insight</p>
                    <p className="text-[9px] text-slate-500 font-medium italic">5 local suppliers matched your project specs.</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button className="px-6 h-10 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/20 transition-all flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Price Trend Report
                </button>
                <button className="px-8 h-10 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5" /> Request Quotes
                </button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECBillOfQuantities;
