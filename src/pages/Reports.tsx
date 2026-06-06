import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Send,
  Loader2
} from 'lucide-react';

export function Reports() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Telegram trigger state
  const [telegramStatus, setTelegramStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string | null }>({
    type: 'idle',
    message: null
  });

  // Loaded database states
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('finance');

  // Status logs
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Fetch all database records
  const loadStatsData = async () => {
    setIsLoading(true);
    try {
      const [empRes, attRes, recRes, taskRes, guestRes, leaveRes, transRes] = await Promise.all([
        fetch('/management/api/employees').then(r => r.json()).catch(() => []),
        fetch('/management/api/attendances').then(r => r.json()).catch(() => []),
        fetch('/management/api/receipts').then(r => r.json()).catch(() => []),
        fetch('/management/api/tasks').then(r => r.json()).catch(() => []),
        fetch('/management/api/guests').then(r => r.json()).catch(() => []),
        fetch('/management/api/leave-requests').then(r => r.json()).catch(() => []),
        fetch('/management/api/transactions').then(r => r.json()).catch(() => [])
      ]);

      setEmployees(empRes || []);
      setAttendances(attRes || []);
      setReceipts(recRes || []);
      setTasks(taskRes || []);
      setGuests(guestRes || []);
      setLeaveRequests(leaveRes || []);
      setTransactions(transRes || []);
    } catch (err) {
      console.error('Error loading reports database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatsData();
  }, []);

  // Compute Daily Summaries for Finance Tab
  const getFinanceSummaries = () => {
    const allDates = new Set<string>();
    leaveRequests.forEach(r => {
      if (r.createdAt) allDates.add(r.createdAt.split('T')[0]);
      if (r.startDate) allDates.add(r.startDate.split('T')[0]);
    });
    receipts.forEach(r => {
      if (r.date) allDates.add(r.date.split('T')[0]);
    });
    transactions.forEach(t => {
      if (t.date) allDates.add(t.date.split('T')[0]);
    });
    const sortedDates = Array.from(allDates).sort();

    let runningBalance = 0;
    const summaries = sortedDates.map(date => {
      const dailyReceipts = receipts.filter(r => r.date?.split('T')[0] === date);
      const totalR = dailyReceipts.length;
      const approvedR = dailyReceipts.filter(r => r.status === 'approved').length;
      const pendingR = dailyReceipts.filter(r => r.status === 'pending' || r.status === 'received' || !r.status).length;

      const dailyTransactions = transactions.filter(t => t.date?.split('T')[0] === date);

      const receiptExpenses = dailyReceipts.filter(r => r.status === 'approved' && r.type !== 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const transactionEx = dailyTransactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const tExpenses = receiptExpenses + transactionEx;

      const receiptCredit = dailyReceipts.filter(r => r.status === 'approved' && r.type === 'Credit').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const transactionIn = dailyTransactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const addFund = receiptCredit + transactionIn;

      runningBalance += (addFund - tExpenses);

      return {
        date,
        totalR,
        approvedR,
        pendingR,
        tExpenses,
        addFund,
        availableF: runningBalance
      };
    });

    return summaries;
  };

  const getFilteredFinanceSummaries = () => {
    let items = getFinanceSummaries();
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        return Object.values(item).some(val => String(val).toLowerCase().includes(q));
      });
    }
    if (startDate || endDate) {
      items = items.filter(item => {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
        return true;
      });
    }
    return items;
  };

  // Compute Daily Summaries for HRM Tab
  const getHRMSummaries = () => {
    const allDates = new Set<string>();
    attendances.forEach(a => {
      if (a.date) allDates.add(a.date.split('T')[0]);
    });
    leaveRequests.forEach(r => {
      if (r.createdAt) allDates.add(r.createdAt.split('T')[0]);
      if (r.startDate) allDates.add(r.startDate.split('T')[0]);
    });
    const sortedDates = Array.from(allDates).sort();

    const summaries = sortedDates.map(date => {
      const dailyAttendances = attendances.filter(a => a.date?.split('T')[0] === date);
      
      const totalEmployees = employees.length;
      const present = dailyAttendances.filter(a => a.status === 'Present').length;
      const absent = dailyAttendances.filter(a => a.status === 'Absent').length;
      const late = dailyAttendances.filter(a => a.status === 'Late').length;
      
      const onLeave = leaveRequests.filter(r => {
        return r.status === 'Approved' && date >= r.startDate && date <= r.endDate;
      }).length;

      return {
        date,
        totalEmployees,
        present,
        absent,
        leave: onLeave,
        late
      };
    });

    return summaries;
  };

  const getFilteredHRMSummaries = () => {
    let items = getHRMSummaries();
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        return Object.values(item).some(val => String(val).toLowerCase().includes(q));
      });
    }
    if (startDate || endDate) {
      items = items.filter(item => {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
        return true;
      });
    }
    return items;
  };

  const getFilteredGuests = () => {
    let items = [...guests];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        return Object.values(item).some(val => String(val).toLowerCase().includes(q));
      });
    }
    if (startDate || endDate) {
      items = items.filter(item => {
        const d = item.createdAt ? item.createdAt.split('T')[0] : '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    // Sort logic to make recent first or keep as is. Let's do recent first.
    return items.sort((a, b) => {
       const da = a.createdAt || '';
       const db = b.createdAt || '';
       return db.localeCompare(da);
    });
  };

  const financeData = getFilteredFinanceSummaries();
  const hrmData = getFilteredHRMSummaries();
  const filteredGuests = getFilteredGuests();

  // Send selected date's automated report via Telegram Bot setup
  const handleTelegramSendByDate = async (targetDate?: string) => {
    const defaultDate = new Date().toISOString().split('T')[0];
    const payload = {
      startDate: targetDate ? targetDate : (startDate || defaultDate),
      endDate: targetDate ? targetDate : (endDate || startDate || defaultDate),
      module: targetDate ? activeTab : 'all'
    };
    
    const label = targetDate ? `${targetDate} (${activeTab})` : `${payload.startDate} to ${payload.endDate}`;

    setTelegramStatus({ type: 'loading', message: 'Sending report...' });
    setAlertMessage(`Sending Custom Report (${label}) to Telegram...`);

    try {
      const response = await fetch('/management/api/telegram-settings/send-date-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || resData.message || 'Failed to dispatch report.');
      }

      setTelegramStatus({ type: 'success', message: 'Successfully sent!' });
      setAlertMessage(`Telegram Sent: Custom Report successfully sent!`);
      
      setTimeout(() => {
        setTelegramStatus({ type: 'idle', message: null });
        setAlertMessage(null);
      }, 5000);
    } catch (err: any) {
      setTelegramStatus({ type: 'error', message: err.message || 'Error occurred' });
      setAlertMessage(`Telegram Error: ${err.message || 'Verification needed'}`);
      
      setTimeout(() => {
        setTelegramStatus({ type: 'idle', message: null });
        setAlertMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border rounded-xl shadow-sm p-4 text-center mx-auto max-w-5xl">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Interactive Reports Ledger</h1>
        <p className="text-xs text-slate-600 mt-1">
          Explore workspace audit records, generate custom filters, and export high-precision financial and employee spreadsheets.
        </p>
      </div>

      {alertMessage && (
        <div className="px-4 py-3 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl max-w-5xl mx-auto flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto mt-2 px-2">
        <div className="border border-black rounded-xl p-3 bg-white/50 space-y-3 shadow-sm">
          {/* Row 1: Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Cell Values......" 
              className="w-full pl-10 pr-4 py-1.5 border border-black rounded-full text-base font-bold text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white"
            />
          </div>

          {/* Row 2: Dates and Telegram button */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 w-full px-3 py-1.5 border border-black rounded-full font-bold text-base text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <span className="text-lg font-black text-black tracking-tight shrink-0">To</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 w-full px-3 py-1.5 border border-black rounded-full font-bold text-base text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            
            <button 
              onClick={() => handleTelegramSendByDate()}
              disabled={telegramStatus.type === 'loading'}
              className="px-4 py-1.5 border border-black rounded-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 transition-colors active:scale-95 shrink-0"
            >
              <div className="w-6 h-6 bg-[#2bb2e1] rounded-full flex items-center justify-center">
                {telegramStatus.type === 'loading' ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : (
                  <Send className="w-3 h-3 text-white ml-[-1px] mt-[1px]" />
                )}
              </div>
              <span className="text-base font-bold tracking-wide text-black">telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs and Data Table */}
      <div className="max-w-5xl mx-auto px-2 mt-4">
        {/* Tabs */}
        <div className="flex gap-2 items-end pl-2">
          <button 
            onClick={() => setActiveTab('finance')}
            className={`min-w-[100px] px-4 py-1.5 text-base font-black border border-black transition-all ${
              activeTab === 'finance' 
                ? 'bg-[#aef0d7] border-b-0 rounded-t-lg -mb-px relative z-10 pt-2' 
                : 'bg-white rounded-lg hover:bg-slate-50 mb-px'
            }`}
          >
            Finance
          </button>
          <button 
            onClick={() => setActiveTab('hrm')}
            className={`min-w-[100px] px-4 py-1.5 text-base font-black border border-black transition-all ${
              activeTab === 'hrm' 
                ? 'bg-[#aef0d7] border-b-0 rounded-t-lg -mb-px relative z-10 pt-2' 
                : 'bg-white rounded-lg hover:bg-slate-50 mb-px'
            }`}
          >
            HRM
          </button>
          <button 
            onClick={() => setActiveTab('guest')}
            className={`min-w-[100px] px-4 py-1.5 text-base font-black border border-black transition-all ${
              activeTab === 'guest' 
                ? 'bg-[#aef0d7] border-b-0 rounded-t-lg -mb-px relative z-10 pt-2' 
                : 'bg-white rounded-lg hover:bg-slate-50 mb-px'
            }`}
          >
            Guest
          </button>
        </div>

        {/* Table Container */}
        <div className="border border-black rounded-b-lg rounded-tr-lg bg-[#aef0d7] p-1 shadow-sm relative z-0">
          <div className="overflow-x-auto w-full bg-[#aef0d7] rounded border border-[#aef0d7]">
            {activeTab === 'finance' && (
              <table className="w-full border-collapse border-hidden">
                <thead>
                  <tr>
                    {['Date', 'Total R', 'Approved R', 'Pending R', 'T- Expenses', 'Add Fund', 'Available F', 'Telegram'].map((h) => (
                      <th key={h} className="border border-black py-2 px-2 bg-[#3ab2e6] text-black font-extrabold text-xs sm:text-sm text-center whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[#aef0d7]">
                  {financeData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-black py-4 text-center font-bold text-sm text-gray-700">No records found.</td>
                    </tr>
                  ) : (
                    financeData.map((row, i) => (
                      <tr key={i} className="hover:bg-[#9de4ca] transition-colors text-xs sm:text-sm">
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.totalR}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.approvedR}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.pendingR}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.tExpenses.toLocaleString()}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.addFund.toLocaleString()}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.availableF.toLocaleString()}
                        </td>
                        <td className="border border-black py-1.5 px-1 bg-[#aef0d7]">
                          <button 
                            onClick={() => handleTelegramSendByDate(row.date)}
                            className="w-6 h-6 bg-[#3ab2e6] rounded-full mx-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                            title={`Send ${row.date} report`}
                          >
                            <Send className="w-3 h-3 text-white ml-[ -1px ] mt-[1px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Simple Placeholders for HRM & Guest Tabs */}
            {activeTab === 'hrm' && (
              <table className="w-full border-collapse border-hidden">
                <thead>
                  <tr>
                    {['Date', 'Total employees', 'Present', 'Absent', 'Leave', 'Late', 'Telegram'].map((h) => (
                      <th key={h} className="border border-black py-2 px-2 bg-[#3ab2e6] text-black font-extrabold text-xs sm:text-sm text-center whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[#aef0d7]">
                  {hrmData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-black py-4 text-center font-bold text-sm text-gray-700">No records found.</td>
                    </tr>
                  ) : (
                    hrmData.map((row, i) => (
                      <tr key={i} className="hover:bg-[#9de4ca] transition-colors text-xs sm:text-sm">
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.totalEmployees}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.present}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.absent}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.leave}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.late}
                        </td>
                        <td className="border border-black py-1.5 px-1 bg-[#aef0d7]">
                          <button 
                            onClick={() => handleTelegramSendByDate(row.date)}
                            className="w-6 h-6 bg-[#3ab2e6] rounded-full mx-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                            title={`Send ${row.date} report`}
                          >
                            <Send className="w-3 h-3 text-white ml-[ -1px ] mt-[1px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            
            {activeTab === 'guest' && (
              <table className="w-full border-collapse border-hidden">
                <thead>
                  <tr>
                    {['Date', 'Host', 'Name', 'Number of attendees', 'Telegram'].map((h) => (
                      <th key={h} className="border border-black py-2 px-2 bg-[#3ab2e6] text-black font-extrabold text-xs sm:text-sm text-center whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[#aef0d7]">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-black py-4 text-center font-bold text-sm text-gray-700">No records found.</td>
                    </tr>
                  ) : (
                    filteredGuests.map((row, i) => {
                      const dateStr = row.createdAt ? row.createdAt.split('T')[0] : '';
                      return (
                      <tr key={i} className="hover:bg-[#9de4ca] transition-colors text-xs sm:text-sm">
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.visitingPerson || 'N/A'}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.name || 'N/A'}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-black">
                          {row.pax || 1}
                        </td>
                        <td className="border border-black py-1.5 px-1 bg-[#aef0d7]">
                          <button 
                            onClick={() => handleTelegramSendByDate(dateStr)}
                            className="w-6 h-6 bg-[#3ab2e6] rounded-full mx-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                            title={`Send ${dateStr} report`}
                          >
                            <Send className="w-3 h-3 text-white ml-[ -1px ] mt-[1px]" />
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

