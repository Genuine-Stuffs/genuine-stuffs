import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { supabase } from 'backend/supabaseClient';
import { planTakeoff, priceTakeoff, type Listing } from '@/lib/aec/takeoff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Calculator, ShoppingCart } from 'lucide-react';

interface AECBillOfQuantitiesProps {
  layout: SolvedLayout;
}

const naira = (v: number) => `₦${Math.round(v).toLocaleString()}`;

/**
 * The bill of quantities: measured from the drawn plan (takeoff.ts) and priced from the verified
 * marketplace listings, each line naming the listing it is priced from (feasibility study §9.2).
 * A line no verified supplier sells yet says so and stays out of the total.
 */
const AECBillOfQuantities: React.FC<AECBillOfQuantitiesProps> = ({ layout }) => {
  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['takeoff-listings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('id, name, category, price, unit, vendor_name').eq('is_verified', true);
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
    staleTime: 10 * 60 * 1000,
  });
  const lines = useMemo(() => planTakeoff(layout), [layout]);
  const priced = useMemo(() => priceTakeoff(lines, listings), [lines, listings]);
  if (!lines.length) return null;
  const total = priced.reduce((s, l) => s + (l.total ?? 0), 0);
  const unpriced = priced.filter(l => l.total === null).length;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <CardHeader className="bg-slate-900 border-b border-slate-800 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Calculator className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Your Bill of Quantities</CardTitle>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Measured from your plan · priced from verified suppliers (NGN)</p>
                </div>
            </div>
            <Badge className="bg-primary hover:bg-primary text-white text-[10px] font-black px-4 py-1 h-8 shadow-lg shadow-primary/20">
                {isLoading ? 'PRICING…' : `MATERIALS: ${naira(total)}`}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-white/5">
            <TableRow className="border-b dark:border-white/5 h-12">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-6">Item</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Quantity</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Priced from</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right pr-6">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priced.map(l => (
                <TableRow key={l.key + l.item} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 border-slate-100 align-top">
                  <TableCell className="pl-6 py-3 min-w-[220px]">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-white dark:bg-black/20 mb-1">{l.category}</Badge>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{l.item}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1">{l.basis}</p>
                  </TableCell>
                  <TableCell className="text-right py-3 whitespace-nowrap">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white tabular-nums">{l.quantity.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-slate-400 ml-1">{l.unit}</span>
                  </TableCell>
                  <TableCell className="py-3 min-w-[200px]">
                    {l.listing ? (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{l.listing.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {l.listing.vendor_name ? `${l.listing.vendor_name} · ` : ''}{naira(l.listing.price)} per {l.listing.unit}{l.buy !== l.quantity ? ` · buy ${l.buy}` : ''}
                        </p>
                        {l.key === 'window' && <p className="text-[10px] text-slate-500 dark:text-slate-400">{l.priceNote}</p>}
                        <Link to={`/marketplace?search=${encodeURIComponent(l.listing.name)}`} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:underline">
                          <ShoppingCart className="w-3 h-3" /> View listing
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{isLoading ? 'Looking up suppliers…' : l.priceNote}</p>
                        <Link to={`/marketplace?search=${encodeURIComponent(l.item.split(/[(,]/)[0].trim())}`} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:underline">
                          <ShoppingCart className="w-3 h-3" /> Search the marketplace
                        </Link>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6 py-3 whitespace-nowrap">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{l.total !== null ? naira(l.total) : '—'}</span>
                  </TableCell>
                </TableRow>
            ))}
            <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
              <TableCell colSpan={3} className="text-right py-4 pl-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Materials sub-total{unpriced ? ` (${unpriced} line${unpriced === 1 ? '' : 's'} not priced yet)` : ''}:
                </span>
              </TableCell>
              <TableCell className="text-right pr-6 py-4">
                <span className="text-sm font-black text-primary italic">{naira(total)}</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-black/20 space-y-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <p><span className="font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">How this is measured.</span> Walls, openings, floor slabs and the roof are measured from the plan as drawn; columns and beams from its structural grid. Cement, sand, granite and steel use common rates for an early estimate, written on each line. Prices are each item's cheapest verified listing on the Genuine Stuffs marketplace today.</p>
            <p><span className="font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Not included.</span> Labour, excavation, the stair, roof waterproofing, plumbing and electrical fittings, sanitary ware, transport and VAT. A quantity surveyor should confirm the quantities before you order.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECBillOfQuantities;
