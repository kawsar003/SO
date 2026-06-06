import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Download, CheckCircle, XCircle, Clock, X, Send, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Attendance({ statusFilter }: { statusFilter?: string }) {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(null);
  const [newAttendance, setNewAttendance] = useState({
    employeeId: '',
    status: 'Present',
    checkIn: format(new Date(), 'HH:mm'),
    checkOut: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchAttendances = () => {
    fetch('/management/api/attendances')
      .then(res => res.json())
      .then(data => setAttendances(data));
  };

  useEffect(() => {
    fetchAttendances();
    fetch('/management/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data));
  }, []);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Employee,Date,Status,Check In,Check Out\n"
      + attendances.map(a => `${a.employeeName},${a.date},${a.status},${a.checkIn},${a.checkOut || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWorkingDaysInMonth = (dateString: string) => {
    const date = new Date(dateString);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    
    // Bangladesh Government Holidays 2026 (Sample implementation, can be extended)
    const govtHolidays = [
      '2026-02-21', // Shaheed Day
      '2026-03-17', // Sheikh Mujibur Rahman's Birthday
      '2026-03-26', // Independence Day
      '2026-04-14', // Bengali New Year
      '2026-05-01', // May Day
      '2026-08-15', // National Mourning Day
      '2026-12-16', // Victory Day
      '2026-12-25'  // Christmas Day
    ];

    let workingDays = 0;
    days.forEach(d => {
      const isFriday = getDay(d) === 5;
      const formattedDate = format(d, 'yyyy-MM-dd');
      const isHoliday = govtHolidays.includes(formattedDate);
      
      if (!isFriday && !isHoliday) {
        workingDays++;
      }
    });
    
    return workingDays;
  };

  const generateMonthlySummaryCSV = (empId?: number | string) => {
    const monthPrefix = filterDate.substring(0, 7); // yyyy-MM
    const totalWorkingDays = getWorkingDaysInMonth(filterDate);
    
    let csvData = "Employee Name,ID,Total Working Day,Present,Absent,Late,Leave\n";
    
    let employeesToProcess = empId ? employees.filter(e => String(e.id) === String(empId)) : employees;

    // Fallback if employee is not in the list but we have attendance data or was requested specifically
    if (empId && employeesToProcess.length === 0) {
      const empAtt = attendances.find(a => String(a.employeeId) === String(empId));
      if (empAtt) {
        employeesToProcess = [{
          id: empAtt.employeeId,
          name: empAtt.employeeName,
          employeeIdNumber: `EMP-${empAtt.employeeId}`
        }];
      }
    }

    employeesToProcess.forEach(emp => {
      const empAtts = attendances.filter(a => String(a.employeeId) === String(emp.id) && a.date.startsWith(monthPrefix));
      
      const present = empAtts.filter(a => a.status === 'Present').length;
      const absent = empAtts.filter(a => a.status === 'Absent').length;
      const late = empAtts.filter(a => a.status === 'Late').length;
      const leave = empAtts.filter(a => a.status === 'Leave').length;

      csvData += `${emp.name || emp.employeeName || 'Unknown'},${emp.employeeIdNumber || 'EMP-'+emp.id},${totalWorkingDays},${present},${absent},${late},${leave}\n`;
    });
    
    return csvData;
  };

  const handleTelegramExport = async () => {
    setIsSendingTelegram(true);
    try {
      const monthPrefix = filterDate.substring(0, 7);
      const totalWorkingDays = getWorkingDaysInMonth(filterDate);

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Monthly Attendance Summary - ${monthPrefix}`, 14, 15);
      
      const head = [["Employee Name", "ID", "Total Working Day", "Present", "Absent", "Late", "Leave"]];
      const body: any[] = [];
      
      employees.forEach(emp => {
        const empAtts = attendances.filter(a => String(a.employeeId) === String(emp.id) && a.date.startsWith(monthPrefix));
        
        const present = empAtts.filter(a => a.status === 'Present').length;
        const absent = empAtts.filter(a => a.status === 'Absent').length;
        const late = empAtts.filter(a => a.status === 'Late').length;
        const leave = empAtts.filter(a => a.status === 'Leave').length;

        body.push([
          emp.name || emp.employeeName || 'Unknown',
          emp.employeeIdNumber || `EMP-${emp.id}`,
          totalWorkingDays,
          present,
          absent,
          late,
          leave
        ]);
      });

      autoTable(doc, {
        head: head,
        body: body,
        startY: 20,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      const base64Pdf = doc.output('datauristring').split(',')[1];
      
      const response = await fetch('/management/api/telegram-settings/send-base64-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `Monthly_Attendance_Summary_${monthPrefix}.pdf`,
          base64Content: base64Pdf,
          mimeType: 'application/pdf',
          caption: `Monthly Attendance Sheet - ${monthPrefix}`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send to Telegram');
      alert('Successfully sent to Telegram!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const [sendingIndividual, setSendingIndividual] = useState<number | null>(null);

  const handleIndividualTelegramExport = async (att: any) => {
    setSendingIndividual(att.id);
    
    try {
      const monthPrefix = filterDate.substring(0, 7); 
      
      const empAttendances = attendances
        .filter(a => a.employeeId === att.employeeId && a.date.startsWith(monthPrefix))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Monthly Attendance : ${att.employeeName}`, 14, 15);
      
      doc.setFontSize(10);
      const employeeObj = employees.find(e => String(e.id) === String(att.employeeId));
      const displayId = employeeObj?.employeeIdNumber || `EMP-${att.employeeId}`;
      doc.text(`Employee ID: ${displayId}`, 14, 22);
      
      const monthNameWithYear = format(new Date(`${monthPrefix}-01`), 'MMMM yyyy');
      doc.text(`Month: ${monthNameWithYear}`, 14, 27);

      const head = [["Date", "Status", "Check In", "Check Out"]];
      const body = empAttendances.map(a => [
        a.date,
        a.status,
        a.checkIn || '--:--',
        a.checkOut || '--:--'
      ]);

      autoTable(doc, {
        head: head,
        body: body,
        startY: 32,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [46, 204, 113] } // Emerald-ish color
      });

      const base64Pdf = doc.output('datauristring').split(',')[1];

      const response = await fetch('/management/api/telegram-settings/send-base64-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `Attendance_${att.employeeName.replace(/\s+/g, '_')}_${monthPrefix}.pdf`,
          base64Content: base64Pdf,
          mimeType: 'application/pdf',
          caption: `Monthly Attendance: ${att.employeeName} (${monthPrefix})`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send to Telegram');
      alert(`Sent ${att.employeeName}'s attendance to Telegram!`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSendingIndividual(null);
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employeeId: parseInt(newAttendance.employeeId),
        status: newAttendance.status,
        checkIn: newAttendance.checkIn,
        checkOut: newAttendance.checkOut,
        date: newAttendance.date
      };
      
      const url = editingAttendanceId ? `/management/api/attendances/${editingAttendanceId}` : '/management/api/attendances';
      const method = editingAttendanceId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeAndResetModal();
        fetchAttendances();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to mark attendance.');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const openEditModal = (att: any) => {
    setEditingAttendanceId(att.id);
    setNewAttendance({
      employeeId: String(att.employeeId),
      status: att.status,
      checkIn: att.checkIn || '',
      checkOut: att.checkOut || '',
      date: att.date || format(new Date(), 'yyyy-MM-dd')
    });
    setIsMarkModalOpen(true);
  };

  const closeAndResetModal = () => {
    setIsMarkModalOpen(false);
    setEditingAttendanceId(null);
    setNewAttendance({
      employeeId: '',
      status: 'Present',
      checkIn: format(new Date(), 'HH:mm'),
      checkOut: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleDeleteAttendance = async (id: number) => {
    const pass = prompt('Enter Super Admin Password to confirm deletion:');
    if (pass !== 'Welcome@123') {
      if (pass !== null) alert('Incorrect password. Deletion cancelled.');
      return;
    }
    try {
      const res = await fetch(`/management/api/attendances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAttendances();
      }
    } catch (err) {
      console.error('Error deleting attendance:', err);
    }
  };

  const visibleAttendances = attendances.filter(att => 
    (!statusFilter || att.status === statusFilter) &&
    (att.date === filterDate) &&
    (att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {statusFilter ? `${statusFilter} Employees` : 'Daily Attendance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {statusFilter 
              ? `View all ${statusFilter.toLowerCase()} employees.` 
              : 'Monitor employee attendance, late marks, and overtimes.'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleTelegramExport}
            disabled={isSendingTelegram || visibleAttendances.length === 0}
            className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 px-4 py-2 rounded-md font-medium flex items-center transition-colors"
          >
            <Send className={cn("w-4 h-4 mr-2", isSendingTelegram && "animate-pulse")} /> 
            {isSendingTelegram ? 'Sending...' : 'Send to Telegram'}
          </button>
          <button 
            onClick={handleExport}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-medium flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          {!statusFilter && (
            <button 
              onClick={() => {
                setEditingAttendanceId(null);
                setNewAttendance({
                  employeeId: '',
                  status: 'Present',
                  checkIn: format(new Date(), 'HH:mm'),
                  checkOut: '',
                  date: format(new Date(), 'yyyy-MM-dd')
                });
                setIsMarkModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors"
            >
              Mark Attendance
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{format(new Date(filterDate), 'dd MMM, yyyy')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Present</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {attendances.filter(a => a.date === filterDate && a.status === 'Present').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Late</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {attendances.filter(a => a.date === filterDate && a.status === 'Late').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Absent</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {attendances.filter(a => a.date === filterDate && a.status === 'Absent').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Leave</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {attendances.filter(a => a.date === filterDate && a.status === 'Leave').length}
          </div>
        </div>
      </div>

      {/* Interactive Status Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.hash = '#/attendance';
            window.location.href = newUrl.href;
          }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-colors",
            !statusFilter ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          )}
        >
          All
        </button>
        <button 
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.hash = '#/present';
            window.location.href = newUrl.href;
          }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
            statusFilter === 'Present' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          )}
        >
          <CheckCircle className="w-3.5 h-3.5" /> Present
        </button>
        <button 
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.hash = '#/late';
            window.location.href = newUrl.href;
          }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
            statusFilter === 'Late' ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
          )}
        >
          <Clock className="w-3.5 h-3.5" /> Late
        </button>
        <button 
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.hash = '#/absent';
            window.location.href = newUrl.href;
          }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
            statusFilter === 'Absent' ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-red-500 border-red-200 hover:bg-red-50"
          )}
        >
          <XCircle className="w-3.5 h-3.5" /> Absent
        </button>
        <button 
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.hash = '#/attendance-leave';
            window.location.href = newUrl.href;
          }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
            statusFilter === 'Leave' ? "bg-blue-400 text-white border-blue-400 shadow-sm" : "bg-white text-blue-500 border-blue-200 hover:bg-blue-50"
          )}
        >
          <Calendar className="w-3.5 h-3.5" /> Leave
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" 
            />
          </div>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50" 
          />
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <th className="p-4">Employee</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleAttendances.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              )}
              {visibleAttendances.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">{att.employeeName}</td>
                  <td className="p-4 text-slate-500">{att.date}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">{att.status}</span>
                  </td>
                  <td className="p-4 text-slate-900 font-mono font-medium">{att.checkIn}</td>
                  <td className="p-4 text-slate-500 font-mono">{att.checkOut || '--:--'}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(att)}
                        title="Edit Attendance"
                        className="p-1.5 text-amber-600 hover:bg-amber-50 bg-slate-50 rounded border border-transparent hover:border-amber-200 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttendance(att.id)}
                        title="Delete Attendance"
                        className="p-1.5 text-red-600 hover:bg-red-50 bg-slate-50 rounded border border-transparent hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleIndividualTelegramExport(att)}
                        title={`Send ${att.employeeName}'s monthly sheet to Telegram`}
                        disabled={sendingIndividual === att.id}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 bg-slate-50 rounded border border-transparent hover:border-blue-200 transition-colors disabled:opacity-50"
                      >
                        <Send className={cn("w-3.5 h-3.5", sendingIndividual === att.id && "animate-pulse")} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isMarkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">{editingAttendanceId ? 'Edit Attendance' : 'Mark Attendance'}</h2>
              <button onClick={closeAndResetModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleMarkAttendance} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee</label>
                <select 
                  required
                  value={newAttendance.employeeId}
                  onChange={e => setNewAttendance({...newAttendance, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date</label>
                  <input 
                    required
                    type="date" 
                    value={newAttendance.date}
                    onChange={e => setNewAttendance({...newAttendance, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Check In</label>
                  <input 
                    required
                    type="time" 
                    value={newAttendance.checkIn}
                    onChange={e => setNewAttendance({...newAttendance, checkIn: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Check Out</label>
                  <input 
                    type="time" 
                    value={newAttendance.checkOut}
                    onChange={e => setNewAttendance({...newAttendance, checkOut: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                <select 
                  value={newAttendance.status}
                  onChange={e => setNewAttendance({...newAttendance, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeAndResetModal}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                >
                  {editingAttendanceId ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
