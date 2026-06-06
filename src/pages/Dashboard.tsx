import React, { useEffect, useState } from 'react';
import { Users, Clock, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/management/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Could not load stats", err));
  }, []);

  const attendanceData = [
    { name: 'Mon', present: 0, absent: 0 },
    { name: 'Tue', present: 0, absent: 0 },
    { name: 'Wed', present: 0, absent: 0 },
    { name: 'Thu', present: 0, absent: 0 },
    { name: 'Fri', present: 0, absent: 0 },
  ];

  const financialData = [
    { name: 'Jan', income: 0, expense: 0 },
    { name: 'Feb', income: 0, expense: 0 },
    { name: 'Mar', income: 0, expense: 0 },
    { name: 'Apr', income: 0, expense: 0 },
    { name: 'May', income: 0, expense: 0 },
  ];

  if (!stats) return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ERP Dashboard</h1>
        <div className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          subtitle={`${stats.activeEmployees} Active currently`}
          icon={<Users className="w-4 h-4 text-blue-500" />}
        />
        <StatCard 
          title="Present Today" 
          value={stats.presentToday} 
          subtitle={`${stats.activeEmployees - stats.presentToday} Absent or on leave`}
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <StatCard 
          title="Total Expenses" 
          value={`৳${Number(stats.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          subtitle="Voucher debit & payments"
          icon={<TrendingUp className="w-4 h-4 text-red-500" />}
        />
        <StatCard 
          title="Available Fund" 
          value={`৳${Number(stats.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          subtitle="Includes credit allocations"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[460px]">
        {/* Attendance Chart */}
        <div className="flex-1 bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="border-b pb-3 mb-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Attendance Overview (This Week)</h3>
          </div>
          <div className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <RechartsTooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', fontSize: '12px', padding: '8px'}} />
                <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={16} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Chart */}
        <div className="flex-1 bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="border-b pb-3 mb-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Financial Overview ('000s)</h3>
          </div>
          <div className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', fontSize: '12px', padding: '8px'}} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{r: 3, strokeWidth: 2}} activeDot={{r: 5}} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} dot={{r: 3, strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, trend }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
      <div className="flex justify-between text-slate-400 mb-2 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500 font-medium mt-1">{subtitle}</div>
    </div>
  );
}
