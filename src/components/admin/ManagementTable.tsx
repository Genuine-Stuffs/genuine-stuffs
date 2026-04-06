import React from 'react';
import { 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Eye,
  FileText,
  MapPin,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ManagementTableProps {
  data: any[];
  isLoading: boolean;
  type: 'vendor' | 'professional';
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (item: any) => void;
}

const ManagementTable: React.FC<ManagementTableProps> = ({ 
  data, 
  isLoading, 
  type,
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
        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
          <CheckCircle2 size={32} className="text-slate-400" />
        </div>
        <p className="font-medium">No pending {type === 'vendor' ? 'vendors' : 'professionals'}</p>
        <p className="text-sm">All registration requests have been processed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Entity / Name</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Details</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    {type === 'vendor' ? (item.company_name?.charAt(0) || 'V') : (item.full_name?.charAt(0) || 'P')}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {type === 'vendor' ? item.company_name : item.full_name}
                    </p>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter mt-1 h-4 px-1 border-slate-200 dark:border-slate-600">
                      {type === 'vendor' ? 'Vendor' : item.specialty || 'Professional'}
                    </Badge>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{item.city}, {item.state}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.country}</p>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FileText size={14} className="text-slate-400" />
                    <span>{type === 'vendor' ? item.cac_number || 'No CAC' : 'License Verified'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{item.phone}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onView(item)}
                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Eye size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onApprove(item.id)}
                    className="h-9 w-9 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <CheckCircle2 size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onReject(item.id)}
                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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

export default ManagementTable;
