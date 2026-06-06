import React, { useState, useEffect } from 'react';
import { Download, Search, DollarSign, Calculator, ChevronDown, CheckCircle, Clock, XCircle, FileText, Send, Settings, Save, Edit, Check, Eye } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

export function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  
  // Salary Structuring Percentages from hrm-settings
  const [medicalPercent, setMedicalPercent] = useState<number>(8);
  const [housingPercent, setHousingPercent] = useState<number>(25);
  const [festivalPercent, setFestivalPercent] = useState<number>(65);
  const [eidFitrMonth, setEidFitrMonth] = useState<string>('2026-03');
  const [eidAdhaMonth, setEidAdhaMonth] = useState<string>('2026-05');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);

  // Filter & selections
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  // Inline editing of basic, advance, and custom override salaries
  const [editMode, setEditMode] = useState(false);
  const [editedSalaries, setEditedSalaries] = useState<{[key: number]: { basicSalary: number, advanceSalary: number, customBonus: number }}>({});
  const [isSavingSalaries, setIsSavingSalaries] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);

  const fetchAllData = () => {
    Promise.all([
      fetch('/management/api/employees').then(r => r.json()),
      fetch('/management/api/attendances').then(r => r.json()),
      fetch('/management/api/leave-requests').then(r => r.json()),
      fetch('/management/api/hrm-settings').then(r => r.json()),
      fetch('/management/api/receipts').then(r => r.json()).catch(() => [])
    ]).then(([empData, attData, leaveData, settingsData, receiptData]) => {
      setEmployees(empData || []);
      setAttendances(attData || []);
      setLeaves(leaveData || []);
      setReceipts(receiptData || []);
      if (settingsData) {
        setMedicalPercent(settingsData.medicalPercentage !== undefined ? Number(settingsData.medicalPercentage) : 8);
        setHousingPercent(settingsData.housingPercentage !== undefined ? Number(settingsData.housingPercentage) : 25);
        setFestivalPercent(settingsData.festivalPercentage !== undefined ? Number(settingsData.festivalPercentage) : 65);
        setEidFitrMonth(settingsData.eidFitrMonth !== undefined ? settingsData.eidFitrMonth : '2026-03');
        setEidAdhaMonth(settingsData.eidAdhaMonth !== undefined ? settingsData.eidAdhaMonth : '2026-05');
      }
    }).catch(err => {
      console.error("Error loading payroll dashboard data:", err);
    });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Sync editedSalaries with current values when entering edit mode
  const handleToggleEditMode = () => {
    if (!editMode) {
      const initialEdited: typeof editedSalaries = {};
      employees.forEach(emp => {
        initialEdited[emp.id] = {
          basicSalary: emp.basicSalary !== undefined ? Number(emp.basicSalary) : 15000,
          advanceSalary: emp.advanceSalary !== undefined ? Number(emp.advanceSalary) : 0,
          customBonus: emp.customBonus !== undefined ? Number(emp.customBonus) : -1
        };
      });
      setEditedSalaries(initialEdited);
    }
    setEditMode(!editMode);
  };

  const handleInlineChange = (empId: number, field: 'basicSalary' | 'advanceSalary' | 'customBonus', val: number) => {
    setEditedSalaries(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: val
      }
    }));
  };

  const handleSavePercentSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/management/api/hrm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicalPercentage: Number(medicalPercent),
          housingPercentage: Number(housingPercent),
          festivalPercentage: Number(festivalPercent),
          eidFitrMonth: eidFitrMonth,
          eidAdhaMonth: eidAdhaMonth
        })
      });
      if (res.ok) {
        alert('All allowance, bonus percentages, and holiday cycles updated successfully!');
      } else {
        alert('Failed to save calculation percentages.');
      }
    } catch (e: any) {
      alert('Error updating percentages: ' + e.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveInlineSalaries = async () => {
    setIsSavingSalaries(true);
    try {
      const promises = Object.entries(editedSalaries).map(async ([id, data]: [string, any]) => {
        const emp = employees.find(e => String(e.id) === id);
        if (!emp) return;
        
        await fetch(`/management/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...emp,
            basicSalary: Number(data.basicSalary),
            advanceSalary: Number(data.advanceSalary),
            customBonus: Number(data.customBonus)
          })
        });
      });
      
      await Promise.all(promises);
      setEditMode(false);
      setEditedSalaries({});
      alert('Tuned payroll wage elements and customizable bonuses persisted safely!');
      
      // Reload lists
      fetch('/management/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data || []));
    } catch (e: any) {
      alert('Error processing salary list update: ' + e.message);
    } finally {
      setIsSavingSalaries(false);
    }
  };

  // Filter based on search query
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.employeeIdNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // High-precision math utility matching Bangladesh standard payroll specs
  const getEmployeeStats = (empId: number, monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const totalDays = endDate.getDate(); // Exact number of days in the month

    const empAttendances = attendances.filter(a => {
      const aDate = new Date(a.date);
      return a.employeeId === empId && aDate >= startDate && aDate <= endDate;
    });

    const empLeaves = leaves.filter(l => {
      const lDate = new Date(l.createdAt || l.startDate);
      return l.employeeId === empId && l.status === 'Approved' && lDate >= startDate && lDate <= endDate;
    });

    const present = empAttendances.filter(a => a.status === 'Present').length;
    const late = empAttendances.filter(a => a.status === 'Late').length;
    const absent = empAttendances.filter(a => a.status === 'Absent').length;
    
    const leaveFromAttendance = empAttendances.filter(a => a.status === 'Leave').length;
    const leaveCount = empLeaves.length + leaveFromAttendance;

    // Resolve salary parameters (check for active edit mode values first)
    const empRecord = employees.find(e => e.id === empId);
    let basicSalary = 15000;
    let advanceSalary = 0;
    let customBonus = -1;

    if (editMode && editedSalaries[empId]) {
      basicSalary = editedSalaries[empId].basicSalary;
      advanceSalary = editedSalaries[empId].advanceSalary;
      customBonus = editedSalaries[empId].customBonus !== undefined ? Number(editedSalaries[empId].customBonus) : -1;
    } else if (empRecord) {
      basicSalary = empRecord.basicSalary !== undefined ? Number(empRecord.basicSalary) : 15000;
      advanceSalary = empRecord.advanceSalary !== undefined ? Number(empRecord.advanceSalary) : 0;
      customBonus = empRecord.customBonus !== undefined ? Number(empRecord.customBonus) : -1;
    }

    // Dynamic percentages configured by system
    const medical = basicSalary * (medicalPercent / 100);
    const housing = basicSalary * (housingPercent / 100);
    
    // Festival Bonus computation (twice a year, Eid al-Fitr or Eid al-Adha holiday months) or individual override
    let festival = 0;
    if (customBonus >= 0) {
      festival = customBonus;
    } else if (monthStr === eidFitrMonth || monthStr === eidAdhaMonth) {
      festival = basicSalary * (festivalPercent / 100);
    }

    // Fine grain deductions (Absent penalty = basicSalary/days, Late penalty = 0.25 * basicSalary/days)
    const dailyRate = basicSalary / totalDays;
    const deductions = (absent * dailyRate) + (late * (dailyRate * 0.25));

    // Dynamic Connection: Pull advance salary vouchers from receipts table
    const voucherAdvances = receipts
      .filter(r => r.employeeId === empId && r.purpose === 'Advance' && r.status === 'approved' && r.salaryMonth === monthStr)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const computedTotalAdvance = advanceSalary + voucherAdvances;
    const netSalary = basicSalary + medical + housing + festival - computedTotalAdvance - deductions;

    // Pull paid salary vouchers from receipts table
    const paidSalaryVouchers = receipts
      .filter(r => r.employeeId === empId && r.purpose === 'Salary' && r.status === 'approved' && r.salaryMonth === monthStr)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    let paymentStatus = 'Unpaid';
    if (netSalary <= 0) {
      paymentStatus = 'Zero Net';
    } else if (paidSalaryVouchers >= netSalary) {
      paymentStatus = 'Paid';
    } else if (paidSalaryVouchers > 0) {
      paymentStatus = 'Partially Paid';
    }

    return { 
      totalDays,
      present, 
      late, 
      absent, 
      leaveCount, 
      basicSalary, 
      medical, 
      housing, 
      festival, 
      advanceSalary: computedTotalAdvance, 
      voucherAdvances,
      paidSalaryVouchers,
      paymentStatus,
      deductions, 
      netSalary 
    };
  };

  const getCsvData = () => {
    let csvContent = `Employee Name,Employee ID,Department,Total Days,Present,Late,Absent,Leave,Basic Salary (৳),Medical (${medicalPercent}%),Housing (${housingPercent}%),Festival (${festivalPercent}%),Advance (৳),Deductions (৳),Net Salary (৳)\n`;
    filteredEmployees.forEach(emp => {
      const stats = getEmployeeStats(emp.id, selectedMonth);
      csvContent += `"${emp.name}","${emp.employeeIdNumber || 'EMP-'+emp.id}","${emp.department}",${stats.totalDays},${stats.present},${stats.late},${stats.absent},${stats.leaveCount},${stats.basicSalary.toFixed(2)},${stats.medical.toFixed(2)},${stats.housing.toFixed(2)},${stats.festival.toFixed(2)},${stats.advanceSalary.toFixed(2)},${stats.deductions.toFixed(2)},${stats.netSalary.toFixed(2)}\n`;
    });
    return csvContent;
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + getCsvData();
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Salary_Sheet_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTelegramExport = async () => {
    setIsSendingTelegram(true);
    try {
      const response = await fetch('/management/api/telegram-settings/send-csv-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `Salary_Sheet_${selectedMonth}.csv`,
          content: getCsvData(),
          caption: `Official Automated Salary Sheet Summary for ${selectedMonth} with configured allowance percentages (Medical: ${medicalPercent}%, Housing: ${housingPercent}%, Festival: ${festivalPercent}%)`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch report document');
      alert('Official dynamic Salary Sheet dispatched directly to active Telegram Recipient pipelines!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-8 h-8 text-blue-600 animate-pulse" />
            High-Precision Salary Sheet
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic payroll auditing of Present, Absent, Late, and Leave stats with editable salary variables and live customizable percentage ratios.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-slate-700"
          />
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Settings className="w-4 h-4 mr-1.5" /> Configure % Rates
          </button>
          <button 
            onClick={handleToggleEditMode}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-xl flex items-center transition-all border shadow-sm active:scale-95 cursor-pointer",
              editMode 
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" 
                : "bg-slate-900 border-slate-950 text-white hover:bg-slate-800"
            )}
          >
            {editMode ? <Check className="w-4 h-4 mr-1.5 animate-bounce" /> : <Edit className="w-4 h-4 mr-1.5" />}
            {editMode ? 'Exit Tuning' : 'Adjust Wage Specs'}
          </button>
          <button 
            onClick={handleTelegramExport}
            disabled={isSendingTelegram || filteredEmployees.length === 0}
            className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-bold flex items-center shadow-sm transition-colors"
          >
            <Send className={cn("w-3.5 h-3.5 mr-1.5", isSendingTelegram && "animate-pulse")} /> 
            {isSendingTelegram ? 'Dispatching...' : 'Send to Telegram'}
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Dynamic customizable percentage settings system */}
      {showSettingsPanel && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs animate-fadeIn grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-1.5 md:col-span-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-blue-600 animate-spin-slow" />
              Dynamic Allowance & Bonus Structuring
            </h3>
            <p className="text-xs text-slate-500">
              Customize percentage rates linked with employee basic salary values. Changes here propagate live into complete payroll audit computations.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Medical Expenses</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number" 
                    value={medicalPercent}
                    onChange={(e) => setMedicalPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="8"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Housing Costs</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number" 
                    value={housingPercent}
                    onChange={(e) => setHousingPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="25"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Festival Bonus</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number" 
                    value={festivalPercent}
                    onChange={(e) => setFestivalPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="65"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs space-y-1">
                <label className="text-[10px] font-black text-emerald-700 uppercase block">Eid al-Fitr Month</label>
                <input 
                  type="month" 
                  value={eidFitrMonth}
                  onChange={(e) => setEidFitrMonth(e.target.value)}
                  className="w-full bg-emerald-50/50 focus:bg-white text-xs font-bold text-emerald-800 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs space-y-1">
                <label className="text-[10px] font-black text-purple-700 uppercase block">Eid al-Adha Month</label>
                <input 
                  type="month" 
                  value={eidAdhaMonth}
                  onChange={(e) => setEidAdhaMonth(e.target.value)}
                  className="w-full bg-purple-50/50 focus:bg-white text-xs font-bold text-purple-800 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSavePercentSettings}
              disabled={isSavingSettings}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Rates (Any Time)
            </button>
            <p className="text-[10px] text-slate-400 font-semibold text-center leading-normal">
              Click to persist percentage choices securely to configuration files.
            </p>
          </div>
        </div>
      )}

      {/* Warning/Status Bar for active edit mode */}
      {editMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Salaries & Advances Edit Mode Active</h4>
              <p className="text-[11px] text-amber-700 mt-0.5">Change employee basic salary values and active advance-salary registers right on the sheet cells live.</p>
            </div>
          </div>
          <button
            onClick={handleSaveInlineSalaries}
            disabled={isSavingSalaries}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            {isSavingSalaries ? 'Saving Adjustments...' : <Save className="w-4 h-4" />}
            Save Employee Salaries
          </button>
        </div>
      )}

      {selectedMonth === eidFitrMonth || selectedMonth === eidAdhaMonth ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Active Holiday Bonus Month detected ({selectedMonth === eidFitrMonth ? "Eid al-Fitr" : "Eid al-Adha"})
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                All basic-salary employees automatically receive a {festivalPercent}% festival bonus on the sheet below, except for employees with direct customized bonus overrides.
              </p>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            {selectedMonth === eidFitrMonth ? "Eid al-Fitr" : "Eid al-Adha"} active
          </span>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Normal Month Cycle ({selectedMonth})</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                No Eid al-Fitr or Eid al-Adha holidays are configured for this month. The festival bonus defaults to ৳0, except for employees configured with customized bonus overrides.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <button
              onClick={async () => {
                setEidFitrMonth(selectedMonth);
                alert(`Set Eid al-Fitr holiday to "${selectedMonth}". Be sure to click "Save Rates" to persist across reloads!`);
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              Set as Eid al-Fitr Month
            </button>
            <button
              onClick={async () => {
                setEidAdhaMonth(selectedMonth);
                alert(`Set Eid al-Adha holiday to "${selectedMonth}". Be sure to click "Save Rates" to persist across reloads!`);
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              Set as Eid al-Adha Month
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 bg-slate-50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search active payroll employees..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase text-[9px] font-bold tracking-widest border-b">
                <th className="p-3.5">Employee Details</th>
                <th className="p-3.5 text-center bg-slate-100/50">Total Days</th>
                <th className="p-3.5 text-center text-emerald-700 bg-emerald-50/50">Present</th>
                <th className="p-3.5 text-center text-amber-700 bg-amber-50/50">Late</th>
                <th className="p-3.5 text-center text-red-700 bg-red-400/10">Absent</th>
                <th className="p-3.5 text-center text-blue-700 bg-blue-50/50">Leave</th>
                <th className="p-3.5 text-right font-black text-slate-700 border-l">Basic (৳)</th>
                <th className="p-3.5 text-right font-medium text-slate-600">Med ({medicalPercent}%)</th>
                <th className="p-3.5 text-right font-medium text-slate-600">House ({housingPercent}%)</th>
                <th className="p-3.5 text-right font-medium text-slate-600">Bonus ({festivalPercent}%)</th>
                <th className="p-3.5 text-right text-rose-600">Advance (৳)</th>
                <th className="p-3.5 text-right text-red-700">Ded. (৳)</th>
                <th className="p-3.5 text-right font-black text-blue-800 bg-blue-50/30">Net Pay (৳)</th>
                <th className="p-3.5 text-center font-bold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => {
                const stats = getEmployeeStats(emp.id, selectedMonth);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        {emp.photoUrl ? (
                          <img 
                            src={emp.photoUrl} 
                            alt="" 
                            className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-sans text-xs shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.employeeIdNumber || `EMP-${1000 + emp.id}`} • {emp.department}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-3.5 text-center font-bold font-mono text-slate-500 bg-slate-50/30">
                      {stats.totalDays}
                    </td>

                    <td className="p-3.5 text-center font-bold font-mono text-emerald-600 bg-emerald-50/10">
                      {stats.present || '-'}
                    </td>
                    
                    <td className="p-3.5 text-center font-bold font-mono text-amber-600 bg-amber-50/10">
                      {stats.late || '-'}
                    </td>
                    
                    <td className="p-3.5 text-center font-bold font-mono text-rose-600 bg-red-500/5">
                      {stats.absent || '-'}
                    </td>
                    
                    <td className="p-3.5 text-center font-bold font-mono text-blue-600 bg-blue-50/10">
                      {stats.leaveCount || '-'}
                    </td>
                    
                    {/* Basic salary input or raw view */}
                    <td className="p-3.5 text-right font-mono border-l">
                      {editMode ? (
                        <input
                          type="number"
                          value={editedSalaries[emp.id]?.basicSalary || 0}
                          onChange={(e) => handleInlineChange(emp.id, 'basicSalary', Number(e.target.value))}
                          className="w-20 px-2 py-1 text-right text-xs font-bold bg-amber-50 border border-amber-300 rounded outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{stats.basicSalary.toLocaleString()}</span>
                      )}
                    </td>

                    {/* Medical calculation */}
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {stats.medical.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>

                    {/* Housing calculations */}
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {stats.housing.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>

                    {/* Festival Bonus calculations with inline customize overrides */}
                    <td className="p-3.5 text-right font-mono">
                      {editMode ? (
                        <div className="flex flex-col items-end">
                          <input
                            type="number"
                            value={editedSalaries[emp.id]?.customBonus !== undefined ? editedSalaries[emp.id].customBonus : -1}
                            onChange={(e) => handleInlineChange(emp.id, 'customBonus', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 text-right text-xs font-bold bg-amber-50 border border-amber-300 rounded outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                            title="Directly customize bonus amount. Use -1 for standard automatic calculation (calculated on Eid month, 0 elsewhere)."
                          />
                          <span className="text-[8px] text-slate-400 mt-0.5">(-1 default)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className={cn(stats.festival > 0 ? "font-bold text-emerald-600" : "text-slate-400")}>
                            {stats.festival > 0 ? stats.festival.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'}
                          </span>
                          {emp.customBonus !== undefined && Number(emp.customBonus) >= 0 && (
                            <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 rounded mt-0.5 font-bold uppercase tracking-wider">custom</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Advance salary inputs */}
                    <td className="p-3.5 text-right font-mono">
                      {editMode ? (
                        <input
                          type="number"
                          value={editedSalaries[emp.id]?.advanceSalary || 0}
                          onChange={(e) => handleInlineChange(emp.id, 'advanceSalary', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-right text-xs font-bold bg-amber-50 border border-amber-300 rounded outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      ) : (
                        <span className={cn(stats.advanceSalary > 0 ? "text-rose-600 font-bold" : "text-slate-400")}>
                          {stats.advanceSalary > 0 ? `-${stats.advanceSalary.toLocaleString()}` : '0'}
                        </span>
                      )}
                    </td>

                    {/* Absent / late deductions */}
                    <td className="p-3.5 text-right font-mono text-rose-500 font-semibold">
                      {stats.deductions > 0 ? `-${stats.deductions.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : '0'}
                    </td>

                    {/* Final Net payout computed */}
                    <td className="p-3.5 text-right font-mono font-black text-blue-900 bg-blue-50/20 text-sm">
                      ৳{stats.netSalary.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>

                    {/* Voucher Payment Status Badge */}
                    <td className="p-3.5 text-center font-semibold">
                      {stats.paymentStatus === 'Paid' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider">
                          PAID
                        </span>
                      )}
                      {stats.paymentStatus === 'Partially Paid' && (
                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider" title={`Paid ৳${stats.paidSalaryVouchers.toLocaleString()}`}>
                          PARTIAL
                        </span>
                      )}
                      {stats.paymentStatus === 'Unpaid' && (
                        <span className="inline-flex items-center gap-1 bg-red-400/10 text-red-700 border border-red-200/40 px-2.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider">
                          UNPAID
                        </span>
                      )}
                      {stats.paymentStatus === 'Zero Net' && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded text-[9px] uppercase font-semibold">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400 italic">
                    No registered HR employees match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
