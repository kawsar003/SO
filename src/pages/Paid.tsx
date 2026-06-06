import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  User, 
  Layers, 
  Clipboard, 
  Filter, 
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Voucher {
  id: number;
  name: string;
  date: string;
  type: 'Debit' | 'Credit';
  amount: number;
  paidTo: string;
  status: string;
  note?: string;
  items?: any[];
  contributions?: Record<string, number>;
}

export function Paid() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Controls how joint vouchers (e.g., "Salim Sir + Nazim Sir") are calculated
  const [calculationModel, setCalculationModel] = useState<'split' | 'full'>('split');
  
  // Voucher status filter
  const [statusFilter, setStatusFilter] = useState<'approved' | 'all'>('all');
  
  // Entity filter/selection to view drill-down details
  const [selectedEntity, setSelectedEntity] = useState<string>('Salim Sir');

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/management/api/receipts');
      if (!res.ok) {
        throw new Error('Failed to retrieve voucher history.');
      }
      const data = await res.json();
      setVouchers(data || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading payment data.');
    } finally {
      setLoading(false);
    }
  };

  // Safe categorization logic matching standard entries
  const getEntitiesForVoucher = (paidTo: string): string[] => {
    if (!paidTo) return ['Others'];
    
    const targets: string[] = [];
    const normalized = paidTo.toLowerCase();
    
    let matched = false;
    if (normalized.includes('salim')) {
      targets.push('Salim Sir');
      matched = true;
    }
    if (normalized.includes('nazim')) {
      targets.push('Nazim Sir');
      matched = true;
    }
    
    if (!matched || normalized.includes('others') || normalized.includes('fund')) {
      targets.push('Others');
    }
    
    return targets;
  };

  // Filter vouchers based on status constraint
  const filteredVouchers = vouchers.filter(v => {
    if (statusFilter === 'approved') {
      return v.status === 'approved';
    }
    return true; // all
  });

  // Calculate stats for Salim Sir, Nazim Sir, Others
  const getEntityStats = (entityName: string) => {
    let debitTotal = 0;
    let creditTotal = 0;
    const associatedVouchers: Voucher[] = [];

    filteredVouchers.forEach(v => {
      const hasDirectContributions = v.contributions && Object.keys(v.contributions).length > 0;
      let associated = false;
      let contribAmount = 0;

      const entities = hasDirectContributions 
        ? Object.keys(v.contributions!) 
        : getEntitiesForVoucher(v.paidTo);
      
      const isThreePeopleCredit = v.type === 'Credit' && entities.length >= 3;

      if (hasDirectContributions) {
        const matchKey = Object.keys(v.contributions!).find(k => k.toLowerCase() === entityName.toLowerCase());
        if (matchKey !== undefined) {
          associated = true;
          contribAmount = Number(v.contributions![matchKey]) || 0;
        }
      } else {
        if (entities.includes(entityName)) {
          associated = true;
          const count = entities.length;
          const coef = calculationModel === 'split' ? (1 / count) : 1;
          const amount = (Number(v.amount) || v.items?.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0) || 0);
          contribAmount = amount * coef;
        }
      }

      if (associated) {
        associatedVouchers.push(v);
        if (v.type === 'Credit') {
          creditTotal += contribAmount;
        } else {
          debitTotal += contribAmount;
        }
      }
    });

    return {
      debitTotal,
      creditTotal,
      netChange: creditTotal + debitTotal,
      vouchers: associatedVouchers
    };
  };

  const entitiesList = [
    { name: 'Salim Sir', label: 'Salim Sir', color: 'blue' },
    { name: 'Nazim Sir', label: 'Nazim Sir', color: 'indigo' },
    { name: 'Others', label: 'Others / Unassigned', color: 'amber' },
  ];

  const entityCalculations = entitiesList.reduce((acc, entity) => {
    acc[entity.name] = getEntityStats(entity.name);
    return acc;
  }, {} as Record<string, ReturnType<typeof getEntityStats>>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Analyzing payment distributions across Salim Sir, Nazim Sir, and Others...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 text-lg mb-1">Retrieval Outage</h3>
        <p className="text-red-650 text-sm mb-4">{error}</p>
        <button 
          onClick={fetchVouchers} 
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const handleSendTelegramReport = async () => {
    try {
      const res = await fetch('/management/api/telegram-settings/test-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // We don't need to pass anything, it will use saved settings
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Failed to send report: ' + (data.error || data.errors?.[0] || 'Unknown error'));
      } else {
        alert('Report sent successfully via Telegram!');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending report.');
    }
  };

  return (
    <div id="paid-module" className="flex flex-col gap-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-blue-600" />
            Paid & Deposited Outlays
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze, track, and locate requisition amounts next to their names automatically.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex gap-2 flex-wrap text-xs font-semibold">
          <button 
            onClick={handleSendTelegramReport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm"
          >
            <Send className="w-4 h-4" />
            Telegram Report
          </button>
          
          {/* Status filters */}
          <div className="flex bg-slate-200/60 rounded-lg p-0.5 border border-slate-300">
            <button 
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer",
                statusFilter === 'all' ? "bg-white text-slate-900 shadow-xs" : "text-slate-650 hover:text-slate-900"
              )}
            >
              All Vouchers
            </button>
            <button 
              onClick={() => setStatusFilter('approved')}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer",
                statusFilter === 'approved' ? "bg-white text-slate-900 shadow-xs" : "text-slate-650 hover:text-slate-900"
              )}
            >
              Approved Only
            </button>
          </div>

          {/* Allocation model toggles */}
          <div className="flex bg-slate-200/60 rounded-lg p-0.5 border border-slate-300" title="Choose how joint vouchers are distributed">
            <button 
              onClick={() => setCalculationModel('split')}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1",
                calculationModel === 'split' ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-650 hover:text-slate-900"
              )}
            >
              <span>Split model</span>
            </button>
            <button 
              onClick={() => setCalculationModel('full')}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1",
                calculationModel === 'full' ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-650 hover:text-slate-900"
              )}
            >
              <span>Full attribution</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3 Entity Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entitiesList.map((ent) => {
          const stats = entityCalculations[ent.name];
          const isSelected = selectedEntity === ent.name;
          
          return (
            <div 
              key={ent.name}
              onClick={() => setSelectedEntity(ent.name)}
              className={cn(
                "bg-white rounded-xl border p-5 shadow-xs transition-all duration-200 cursor-pointer select-none relative overflow-hidden flex flex-col justify-between h-[180px]",
                isSelected 
                  ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-300 ring-offset-1 scale-102"
                  : "hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              {/* Highlight bar */}
              <div className={cn(
                "absolute top-0 inset-x-0 h-1.5",
                ent.color === 'blue' ? "bg-blue-500" :
                ent.color === 'indigo' ? "bg-indigo-500" :
                ent.color === 'emerald' ? "bg-emerald-500" : "bg-amber-500"
              )} />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-1.5">
                    <User className="w-4 h-4 opacity-70" />
                    {ent.label}
                  </h3>
                  <p className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">
                    {stats.vouchers.length} dynamic activities
                  </p>
                </div>
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping absolute top-5 right-5" />
                )}
              </div>

              {/* Dynamic totals placed immediately inside/next to the entity names. */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                {/* Outflow / Paid */}
                <div className="flex justify-between items-center bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">
                  <span className="font-bold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    Paid (Debit)
                  </span>
                  <span className="font-mono font-black text-sm">
                    ৳{stats.debitTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Inflow / Deposited */}
                <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                  <span className="font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Deposited (Credit)
                  </span>
                  <span className="font-mono font-black text-sm">
                    ৳{stats.creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info notice about calculation models */}
      <div className="bg-slate-50 border rounded-xl p-4 leading-normal text-xs text-slate-600 flex items-start gap-2.5 shadow-2xs">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">Dynamic Multi-Entity Attributions:</p>
          {calculationModel === 'split' ? (
            <p>
              Under the active <strong className="text-emerald-700 uppercase">Split Model</strong>, vouchers assigned to compound entities (e.g., <strong>"Salim Sir + Nazim Sir"</strong>) automatically divide their monetary values evenly amongst all participants involved.
            </p>
          ) : (
            <p>
              Under <strong className="text-blue-700 uppercase">Full Attribution</strong>, compound vouchers attribute their entire worth to every participant name specified.
            </p>
          )}
        </div>
      </div>

      {/* Table details for active entity selected */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-black text-slate-950 text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Activities breakdown for {selectedEntity}
            </h2>
            <p className="text-slate-550 text-xs">
              Reviewing {entityCalculations[selectedEntity]?.vouchers.length || 0} associated vouchers and receipts.
            </p>
          </div>

          <div className="flex gap-2 text-xs font-semibold">
            {/* Display net impact for selected person */}
            <div className={cn(
              "px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5",
              entityCalculations[selectedEntity]?.netChange >= 0 
                ? "bg-emerald-50 text-emerald-800 border-emerald-250 animate-fadeIn" 
                : "bg-amber-50 text-amber-800 border-amber-250 animate-fadeIn"
            )}>
              <span>Net balance impact:</span>
              <span className="font-mono font-black">
                ৳{(entityCalculations[selectedEntity]?.netChange || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {entityCalculations[selectedEntity]?.vouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clipboard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">No vouchers matching {selectedEntity} have been recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Whenever a Debit/Credit voucher references this entity in the Paid To field, it displays right here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Voucher No</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Payment Date</th>
                  <th className="p-4">Paid To Option</th>
                  <th className="p-4 text-center">Type</th>
                  <th className="p-4 text-right">Raw Amt</th>
                  <th className="p-4 text-right">Attributed ({calculationModel})</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {entityCalculations[selectedEntity].vouchers.map((v) => {
                  const hasDirectContributions = v.contributions && Object.keys(v.contributions).length > 0;
                  const vEntities = hasDirectContributions 
                    ? Object.keys(v.contributions!) 
                    : getEntitiesForVoucher(v.paidTo);
                  
                  const isThreePeopleCredit = v.type === 'Credit' && vEntities.length >= 3;
                  const rawAmount = Number(v.amount) || v.items?.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0) || 0;
                  
                  let attributedAmount = 0;

                  if (hasDirectContributions) {
                    const matchKey = Object.keys(v.contributions!).find(k => k.toLowerCase() === selectedEntity.toLowerCase());
                    if (matchKey !== undefined) {
                      attributedAmount = Number(v.contributions![matchKey]) || 0;
                    }
                  } else {
                    const entitiesCount = vEntities.length;
                    const factor = calculationModel === 'split' ? (1 / entitiesCount) : 1;
                    attributedAmount = rawAmount * factor;
                  }

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        #{String(v.id).padStart(4, '0')}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{v.name || 'Untitled Voucher'}</div>
                        {v.note && <div className="text-[11px] text-slate-500 font-normal">{v.note}</div>}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {v.date}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-mono font-bold">
                          {v.paidTo || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded font-bold text-[10px] uppercase",
                          v.type === 'Credit' 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-rose-100 text-rose-800"
                        )}>
                          {v.type === 'Credit' ? 'CREDIT' : 'DEBIT'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        ৳{rawAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-950">
                        ৳{attributedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                          v.status === 'approved' 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-150"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", v.status === 'approved' ? "bg-emerald-500" : "bg-amber-500")} />
                          {v.status === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
