import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Users, 
  Store, 
  Briefcase, 
  ShieldCheck, 
  BarChart3, 
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

const PMDashboard = () => {
  const { role, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Protection Check
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (role !== 'pm') return <Navigate to="/" replace />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'pros', label: 'Professionals', icon: Briefcase },
    { id: 'marketplace', label: 'Marketplace', icon: ShieldCheck },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Glassmorphic Sidebar */}
      <aside className="w-64 border-r border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 h-screen hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
            PM Control
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Material Insight</p>
        </div>
        
        <nav className="flex-grow p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-4 text-white">
            <p className="text-xs text-slate-400 font-medium">System Role</p>
            <p className="font-bold text-sm">Product Manager</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Top Header - Sticky Glass */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {activeTab} Management
            </h2>
            <p className="text-sm text-slate-500">Welcome back, PM Dashboard is ready.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Global Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-red-500 rounded-full text-sm w-64 focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
              />
            </div>
            <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors relative">
              <AlertCircle size={22} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Canvas */}
        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: '1,248', trend: '+12%', icon: Users, color: 'blue' },
                  { label: 'Verified Vendors', value: '84', sub: '12 pending', icon: Store, color: 'red' },
                  { label: 'Verified Pros', value: '156', sub: '9 pending', icon: Briefcase, color: 'green' },
                  { label: 'Market Active', value: '$12.4k', trend: '+5%', icon: BarChart3, color: 'purple' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                          <Icon size={24} />
                        </div>
                        {stat.trend && (
                          <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                      {stat.sub && <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>}
                    </div>
                  )
                })}
              </div>

              {/* Pending Verification Preview (High Density Card) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                       <Clock className="text-amber-500" size={18} />
                       Recent Verification Requests
                    </h3>
                    <button className="text-xs text-red-600 hover:underline font-bold">View Pipeline</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {[
                      { name: 'BuildLink Solutions', type: 'Vendor', date: '2h ago', status: 'Pending' },
                      { name: 'Engr. Sarah John', type: 'Professional', date: '5h ago', status: 'Reviewing' },
                      { name: 'Apex Materials Ltd', type: 'Vendor', date: '1d ago', status: 'Pending' },
                    ].map((req, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                            {req.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{req.name}</p>
                            <p className="text-xs text-slate-500">{req.type} • {req.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle2 size={18}/></button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={18}/></button>
                          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><MoreVertical size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
                   <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">Marketplace Activity</h3>
                    <BarChart3 className="text-slate-400" size={18} />
                   </div>
                   <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 size={24} />
                      </div>
                      <p className="text-slate-500 text-sm max-w-xs">Data trends and charts will be integrated in Phase 2 using the platform's analytics hook.</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-700">
                  <Filter className="text-slate-400" size={32} />
               </div>
               <h3 className="text-xl font-bold mb-2">Detailed {activeTab} Control</h3>
               <p className="text-slate-500 max-w-md">The management table and detailed moderation workflows for {activeTab} will be implemented in the next step.</p>
               <button className="mt-8 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg shadow-red-500/20 hover:scale-105 transition-transform">
                  Configure Table
               </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PMDashboard;
