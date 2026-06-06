import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, MoreVertical, X, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function EmployeeList() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    employeeIdNumber: '',
    department: '',
    designation: '',
    whatsappNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    cvUrl: '',
    cvFilename: '',
    photoUrl: '',
    password: 'Welcome@123',
    basicSalary: 15000,
    advanceSalary: 0,
    customBonus: -1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = () => {
    fetch('/management/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingEmployeeId 
        ? `/management/api/employees/${editingEmployeeId}`
        : '/management/api/employees';
      const method = editingEmployeeId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEmployee)
      });
      
      if (response.ok) {
        setIsAddModalOpen(false);
        setEditingEmployeeId(null);
        setNewEmployee({
          name: '',
          email: '',
          employeeIdNumber: '',
          department: '',
          designation: '',
          whatsappNumber: '',
          joiningDate: new Date().toISOString().split('T')[0],
          status: 'Active',
          cvUrl: '',
          cvFilename: '',
          photoUrl: '',
          password: 'Welcome@123'
        });
        fetchEmployees();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save employee'}\n${errorData.details || ''}`);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Network error. Check server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (emp: any) => {
    setNewEmployee({
      name: emp.name,
      email: emp.email || '',
      employeeIdNumber: emp.employeeIdNumber || '',
      department: emp.department,
      designation: emp.designation,
      whatsappNumber: emp.whatsappNumber || '',
      joiningDate: new Date(emp.joiningDate).toISOString().split('T')[0],
      status: emp.status,
      cvUrl: emp.cvUrl || '',
      cvFilename: emp.cvFilename || '',
      photoUrl: emp.photoUrl || '',
      password: emp.password || 'Welcome@123',
      basicSalary: emp.basicSalary !== undefined ? Number(emp.basicSalary) : 15000,
      advanceSalary: emp.advanceSalary !== undefined ? Number(emp.advanceSalary) : 0,
      customBonus: emp.customBonus !== undefined ? Number(emp.customBonus) : -1
    });
    setEditingEmployeeId(emp.id);
    setIsAddModalOpen(true);
  };

  const closeAndResetModal = () => {
    setIsAddModalOpen(false);
    setEditingEmployeeId(null);
    setNewEmployee({
      name: '',
      email: '',
      employeeIdNumber: '',
      department: '',
      designation: '',
      whatsappNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      cvUrl: '',
      cvFilename: '',
      photoUrl: '',
      password: 'Welcome@123',
      basicSalary: 15000,
      advanceSalary: 0,
      customBonus: -1
    });
  };

  const handleDeleteEmployee = async (id: number) => {
    const pass = prompt('Enter Super Admin Password to confirm deletion:');
    if (pass !== 'Welcome@123') {
      if (pass !== null) alert('Incorrect password. Deletion cancelled.');
      return;
    }
    try {
      const response = await fetch(`/management/api/employees/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const downloadEmployeeData = () => {
    if (!viewingEmployee) return;
    
    const dataString = `
Employee Name: ${viewingEmployee.name}
Employee ID: ${viewingEmployee.employeeIdNumber || 'EMP-' + (1000 + viewingEmployee.id)}
Department: ${viewingEmployee.department}
Designation: ${viewingEmployee.designation}
WhatsApp Number: ${viewingEmployee.whatsappNumber || 'N/A'}
Joining Date: ${new Date(viewingEmployee.joiningDate).toLocaleDateString()}
Status: ${viewingEmployee.status}
CV Uploaded: ${viewingEmployee.cvUrl ? 'Yes' : 'No'}
Photo Uploaded: ${viewingEmployee.photoUrl ? 'Yes' : 'No'}
    `.trim();
    
    const blob = new Blob([dataString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${viewingEmployee.name.replace(/\\s+/g, '_')}_profile.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.employeeIdNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Options</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all employees, add new members, and edit profiles.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 border rounded flex items-center text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-wider transition-colors">
              <Filter className="w-3.5 h-3.5 mr-2" /> Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <th className="p-4">Employee</th>
                <th className="p-4">ID</th>
                <th className="p-4">Department & Role</th>
                <th className="p-4">Joining Date</th>
                <th className="p-4">CV</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => setViewingEmployee(emp)}
                    >
                      {emp.photoUrl ? (
                         <img 
                          src={emp.photoUrl} 
                          alt="" 
                          className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200"
                          referrerPolicy="no-referrer"
                         />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@company.com`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium">{emp.employeeIdNumber || `EMP-${1000 + emp.id}`}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{emp.designation}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{emp.department}</div>
                  </td>
                  <td className="p-4 text-slate-500">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                  <td className="p-4">
                    {emp.cvUrl ? (
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = emp.cvUrl;
                          link.download = emp.cvFilename || 'CV_Document.pdf';
                          if (!emp.cvUrl.startsWith('data:')) {
                            const blob = new Blob([`Simulated CV File Content for ${emp.name}`], { type: 'text/plain' });
                            link.href = URL.createObjectURL(blob);
                            link.download = emp.cvUrl;
                          }
                          link.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                        title={`Download ${emp.cvFilename || 'CV File'}`}
                      >
                        Download CV
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-semibold text-[10px]",
                      emp.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(emp)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
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
        
        {/* Pagination Dummy */}
        <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>Showing 1 to {filteredEmployees.length} of {filteredEmployees.length} results</span>
          <div className="flex gap-2">
            <button className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
            <button className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button type="button" onClick={closeAndResetModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Photo (Max 5MB)</label>
                <div className="flex items-center gap-4">
                  {newEmployee.photoUrl && (
                    <img 
                      src={newEmployee.photoUrl} 
                      alt="Preview" 
                      className="h-12 w-12 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Photo too large. Maximum photo size is 5MB.');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Data = event.target?.result as string;
                          setNewEmployee({...newEmployee, photoUrl: base64Data});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={newEmployee.name}
                  onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={newEmployee.email || ''}
                  onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee ID Number</label>
                <input 
                  required
                  type="text" 
                  value={newEmployee.employeeIdNumber}
                  onChange={e => setNewEmployee({...newEmployee, employeeIdNumber: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. EMP-001"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <input 
                  required
                  type="text" 
                  value={newEmployee.department}
                  onChange={e => setNewEmployee({...newEmployee, department: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. Engineering"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Designation / Role</label>
                <input 
                  required
                  type="text" 
                  value={newEmployee.designation}
                  onChange={e => setNewEmployee({...newEmployee, designation: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">WhatsApp Number</label>
                <input 
                  type="text" 
                  value={newEmployee.whatsappNumber}
                  onChange={e => setNewEmployee({...newEmployee, whatsappNumber: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="e.g. +1 234 567 890"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Joining Date</label>
                  <input 
                    required
                    type="date" 
                    value={newEmployee.joiningDate}
                    onChange={e => setNewEmployee({...newEmployee, joiningDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                  <select 
                    value={newEmployee.status}
                    onChange={e => setNewEmployee({...newEmployee, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload CV (Max 10MB)</label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert('File too large. Maximum CV size is 10MB.');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64Data = event.target?.result as string;
                        setNewEmployee({...newEmployee, cvUrl: base64Data, cvFilename: file.name});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {newEmployee.cvUrl && (
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-100 animate-fadeIn">
                    <span className="font-bold text-emerald-700">Selected CV:</span> 
                    <span className="truncate font-mono">{newEmployee.cvFilename || 'Document Attached'}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Basic Salary (৳)</label>
                  <input 
                    required
                    type="number" 
                    value={newEmployee.basicSalary || 0}
                    onChange={e => setNewEmployee({...newEmployee, basicSalary: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Advance Salary (৳)</label>
                  <input 
                    required
                    type="number" 
                    value={newEmployee.advanceSalary || 0}
                    onChange={e => setNewEmployee({...newEmployee, advanceSalary: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    placeholder="e.g. 0"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeAndResetModal}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={cn(
                    "px-4 py-2 text-sm font-bold text-white rounded-md transition-colors shadow-sm",
                    isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : (editingEmployeeId ? 'Update Employee' : 'Save Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg">Employee Profile</h2>
              <button type="button" onClick={() => setViewingEmployee(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                {viewingEmployee.photoUrl ? (
                  <img 
                    src={viewingEmployee.photoUrl} 
                    alt="" 
                    className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewingEmployee.name}</h3>
                  <p className="text-slate-500 text-sm font-medium">{viewingEmployee.designation}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Employee ID</div>
                  <div className="font-mono text-sm font-bold text-slate-800">{viewingEmployee.employeeIdNumber || `EMP-${1000 + viewingEmployee.id}`}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Status</div>
                  <div className="text-sm font-medium">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-semibold text-[10px]",
                      viewingEmployee.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {viewingEmployee.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Department</div>
                  <div className="text-sm font-medium text-slate-800">{viewingEmployee.department}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Designation &amp; Role</div>
                  <div className="text-sm font-medium text-slate-805 text-slate-900">{viewingEmployee.designation}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Email Address</div>
                  <div className="text-sm font-mono text-slate-800 text-blue-600 font-bold block truncate" title={viewingEmployee.email}>{viewingEmployee.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">System Login Password</div>
                  <div className="text-sm font-mono text-slate-800 font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 border border-slate-200 rounded inline-block select-all transition-colors cursor-pointer" title="Select to copy password">
                    {viewingEmployee.password || 'Welcome@123'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Joining Date</div>
                  <div className="text-sm font-medium text-slate-800">{new Date(viewingEmployee.joiningDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">WhatsApp Number</div>
                  <div className="text-sm font-medium text-slate-800 font-mono">{viewingEmployee.whatsappNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">CV Document / Resume</div>
                  {viewingEmployee.cvUrl ? (
                    <div className="space-y-1 mt-1">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = viewingEmployee.cvUrl;
                          link.download = viewingEmployee.cvFilename || 'CV_Document.pdf';
                          if (!viewingEmployee.cvUrl.startsWith('data:')) {
                            const blob = new Blob([`Simulated CV File Content for ${viewingEmployee.name}`], { type: 'text/plain' });
                            link.href = URL.createObjectURL(blob);
                            link.download = viewingEmployee.cvUrl;
                          }
                          link.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 transition-colors text-xs font-bold cursor-pointer"
                      >
                        Download CV
                      </button>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]" title={viewingEmployee.cvFilename || viewingEmployee.cvUrl}>
                        {viewingEmployee.cvFilename || 'Attached CV Document'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-slate-400">Not Uploaded</div>
                  )}
                </div>
              </div>

              {/* Module Access / General Permissions list in Employee Options */}
              <div className="mt-6 pt-4 border-t border-slate-150">
                <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">Module Access Privileges</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'hr', label: 'HR Management' },
                    { id: 'attendance', label: 'Attendance' },
                    { id: 'leave', label: 'Leave & Duty' },
                    { id: 'finance', label: 'Finance' },
                    { id: 'accounting', label: 'Accounting' },
                    { id: 'requisitions', label: 'Receipt & Voucher' },
                    { id: 'tasks', label: 'Tasks & Projects' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'reports', label: 'Reports' },
                    { id: 'guest', label: 'Guest Management' }
                  ].map(mod => {
                    const isGranted = viewingEmployee.permissions 
                      ? !!viewingEmployee.permissions[mod.id] 
                      : true; // Default to true if not explicitly set
                    return (
                      <div 
                        key={mod.id} 
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-lg border text-xs font-semibold",
                          isGranted 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                            : "bg-slate-50 border-slate-100 text-slate-400 line-through"
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          isGranted ? "bg-emerald-500" : "bg-slate-300"
                        )} />
                        {mod.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 font-medium text-sm text-slate-700 bg-white hover:bg-slate-100 border rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={downloadEmployeeData}
                className="flex items-center gap-2 px-4 py-2 font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
