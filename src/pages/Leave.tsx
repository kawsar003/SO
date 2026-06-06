import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, X, Edit2, Trash2 } from 'lucide-react';

export function Leave() {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    status: 'Pending'
  });

  const fetchRequests = () => {
    fetch('/management/api/leave-requests')
      .then(res => res.json())
      .then(data => setLeaveRequests(data));
  };

  useEffect(() => {
    fetchRequests();
    fetch('/management/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data));
  }, []);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employeeId: parseInt(newRequest.employeeId),
        type: newRequest.type,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        status: newRequest.status
      };
      
      const url = editingId ? `/management/api/leave-requests/${editingId}` : '/management/api/leave-requests';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeAndResetModal();
        fetchRequests();
      }
    } catch (error) {
      console.error('Error saving leave request:', error);
    }
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewRequest({
      employeeId: '',
      type: 'Annual Leave',
      startDate: '',
      endDate: '',
      status: 'Pending'
    });
  };

  const openEditModal = (req: any) => {
    setEditingId(req.id);
    setNewRequest({
      employeeId: String(req.employeeId),
      type: req.type,
      startDate: req.startDate,
      endDate: req.endDate,
      status: req.status
    });
    setIsModalOpen(true);
  };

  const handleDeleteRequest = async (id: number) => {
    const pass = prompt('Enter Super Admin Password to confirm deletion:');
    if (pass !== 'Welcome@123') {
      if (pass !== null) alert('Incorrect password. Deletion cancelled.');
      return;
    }
    try {
      const res = await fetch(`/management/api/leave-requests/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error deleting leave request:', error);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const reqToUpdate = leaveRequests.find(r => r.id === id);
      if(!reqToUpdate) return;
      
      const res = await fetch(`/management/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqToUpdate, status: newStatus })
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error updating leave request status:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave and Duty</h1>
          <p className="text-sm text-slate-500 mt-1">Manage employee leave requests and duty scheduling.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden flex-1">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search requests..." className="w-full pl-9 pr-4 py-1.5 text-xs border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button className="px-3 py-1.5 border rounded flex items-center text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-wider transition-colors">
            <Filter className="w-3.5 h-3.5 mr-2" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <th className="p-4">Employee</th>
                <th className="p-4">Type</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">{req.employeeName || req.employee}</td>
                  <td className="p-4 text-slate-600">{req.type}</td>
                  <td className="p-4 text-slate-500">{req.startDate} to {req.endDate}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                      req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 text-right">
                      {req.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(req.id, 'Approved')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                            className="px-2 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => openEditModal(req)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edit Request"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete Request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">New Request</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddRequest} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee</label>
                <select 
                  required
                  value={newRequest.employeeId}
                  onChange={e => setNewRequest({...newRequest, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Type</label>
                <select 
                  value={newRequest.type}
                  onChange={e => setNewRequest({...newRequest, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Duty">Duty</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Start Date</label>
                  <input 
                    required
                    type="date" 
                    value={newRequest.startDate}
                    onChange={e => setNewRequest({...newRequest, startDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">End Date</label>
                  <input 
                    required
                    type="date" 
                    value={newRequest.endDate}
                    onChange={e => setNewRequest({...newRequest, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
