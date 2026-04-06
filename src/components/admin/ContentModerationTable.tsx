import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ContentModerationTableProps {
  data: any[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (item: any) => void;
}

const ContentModerationTable: React.FC<ContentModerationTableProps> = ({ 
  data, 
  isLoading, 
  onApprove,
  onReject,
  onView 
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
        <p className="font-medium">No pending content for review</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Material / Listing</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price / Details</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs">{item.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.category}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.vendor_name}</span>
              </td>
              <td className="px-6 py-4">
                <p className="text-xs font-black text-red-600">₦{Number(item.price).toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Per {item.unit}</p>
              </td>
              <td className="px-6 py-4">
                <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-none text-[8px] font-black uppercase">Pending Review</Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onView(item)}
                    className="h-9 w-9 text-slate-400 hover:text-red-600"
                  >
                    <Eye size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onApprove(item.id)}
                    className="h-9 w-9 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle2 size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onReject(item.id)}
                    className="h-9 w-9 text-red-600 hover:bg-red-50"
                  >
                    <XCircle size={18} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContentModerationTable;
