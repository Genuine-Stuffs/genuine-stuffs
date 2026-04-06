import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye,
  User,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface IncidentReportTableProps {
  data: any[];
  isLoading: boolean;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
  onView: (item: any) => void;
}

const IncidentReportTable: React.FC<IncidentReportTableProps> = ({ 
  data, 
  isLoading, 
  onResolve,
  onDismiss,
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
        <p className="font-medium">No active incident reports</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Target Listing</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reporter Reason</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reported</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{item.materials?.name || 'Unknown Material'}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.materials?.vendor_name}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-start gap-2 max-w-xs">
                  <AlertTriangle size={14} className="text-amber-500 mt-1 shrink-0" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">{item.reason}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-none text-[8px] font-black uppercase">High Priority</Badge>
              </td>
              <td className="px-6 py-4 text-xs text-slate-500 font-medium font-mono">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onView(item)} className="h-9 w-9 text-slate-400 hover:text-red-600">
                    <Eye size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onResolve(item.id)} className="h-9 w-9 text-green-600 hover:bg-green-50">
                    <CheckCircle2 size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDismiss(item.id)} className="h-9 w-9 text-red-600 hover:bg-red-50">
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

export default IncidentReportTable;
