import React, { useState, useEffect } from 'react';
import { Shield, Search, Check, Save, Lock } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function AccessManagement({ contentOnly = false }: { contentOnly?: boolean }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  
  // Track permissions per employee locally before saving
  const [permissions, setPermissions] = useState<Record<number, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const permissionGroups = [
    {
      title: 'Core Access',
      modules: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'guest', label: 'Guest' },
        { id: 'tasks', label: 'Tasks and Projects' },
        { id: 'reports', label: 'Report' },
        { id: 'inventory', label: 'Inventory' }
      ]
    },
    {
      title: 'HR Management',
      id: 'hr',
      modules: [
        { id: 'hr_employee', label: 'Employee' },
        { id: 'hr_admin', label: 'HR Admin' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave and Duty' }
      ]
    },
    {
      title: 'Finance',
      id: 'finance',
      modules: [
        { id: 'accounting', label: 'Accounting' },
        { id: 'requisitions', label: 'Receipt and Voucher' },
        { id: 'finance_paid', label: 'Paid' }
      ]
    },
    {
      title: 'Settings',
      id: 'settings',
      modules: [
        { id: 'settings_slip', label: 'Slip Configuration' },
        { id: 'settings_telegram', label: 'Telegram Automated Bot' },
        { id: 'settings_security', label: 'Update Password & Security' },
        { id: 'access', label: 'Access Control' },
        { id: 'activities', label: 'User Activity' }
      ]
    }
  ];

  const allModuleIds = permissionGroups.flatMap(g => g.modules.map(m => m.id)).concat(permissionGroups.filter(g => g.id).map(g => g.id as string));

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // 1. Fetch normal employees
      const resEmps = await fetch('/management/api/employees');
      const data = await resEmps.json();
      
      // 2. Fetch super admin permissions
      const activeAdminEmail = localStorage.getItem('userEmail') || 'k.e.bd.contact@gmail.com';
      const resAdmin = await fetch(`/management/api/auth/status?email=${encodeURIComponent(activeAdminEmail)}`);
      const adminData = await resAdmin.json();

      const superAdminVirtual = {
        id: -1,
        name: 'Super Administrator',
        email: adminData.email || activeAdminEmail,
        designation: 'Primary System Admin',
        employeeIdNumber: 'SUPERADMIN',
        isSuperAdmin: true,
        permissions: adminData.permissions || {}
      };

      // Combine: super admin profile at the top, then employee list
      const combined = [superAdminVirtual, ...data];
      setEmployees(combined);

      const initialPerms: Record<number, Record<string, boolean>> = {};
      combined.forEach((emp: any) => {
        initialPerms[emp.id] = emp.permissions || {};
      });
      setPermissions(initialPerms);
      
      if (combined.length > 0 && !selectedEmp) {
        setSelectedEmp(combined[0]);
      }
    } catch (err) {
      console.error('Error loading employee lists and admin permissions:', err);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.employeeIdNumber && e.employeeIdNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTogglePermission = (moduleId: string, group?: any) => {
    if (!selectedEmp) return;
    
    setPermissions(prev => {
      const current = prev[selectedEmp.id] || {};
      const newValue = !current[moduleId];
      
      const updated = { ...current, [moduleId]: newValue };

      // If toggling a group parent, toggle all its children
      if (group && group.id === moduleId) {
        group.modules.forEach((m: any) => {
          updated[m.id] = newValue;
        });
      }

      return {
        ...prev,
        [selectedEmp.id]: updated
      };
    });
  };

  const handleToggleAll = (value: boolean) => {
    if (!selectedEmp) return;
    const allPerms: Record<string, boolean> = {};
    allModuleIds.forEach(id => {
      allPerms[id] = value;
    });
    setPermissions(prev => ({
      ...prev,
      [selectedEmp.id]: allPerms
    }));
  };

  const handleSave = async () => {
    if (!selectedEmp) return;
    setIsSaving(true);
    
    try {
      if (selectedEmp.isSuperAdmin) {
        // Save Super Admin permissions to the admin settings configuration file
        const response = await fetch('/management/api/auth/update-admin-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissions: permissions[selectedEmp.id]
          })
        });
        if (response.ok) {
          alert('Super Administrator access permissions updated successfully.');
          window.dispatchEvent(new Event('auth-permissions-updated'));
        } else {
          const errData = await response.json();
          alert(`Error: ${errData.error || 'Failed to update admin permissions'}`);
        }
      } else {
        // Save normal employee permissions
        await fetch(`/management/api/employees/${selectedEmp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...selectedEmp,
            permissions: permissions[selectedEmp.id]
          })
        });
        if (selectedEmp.email) {
          alert(`Access permissions saved. Notification sent to ${selectedEmp.email}`);
        } else {
          alert('Access permissions saved successfully.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving permissions.');
    }
    
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className="space-y-6">
      {!contentOnly && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Access Management
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Control which modules each employee can access.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Employee List Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col col-span-1">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmp(emp)}
                className={cn(
                  "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group",
                  selectedEmp?.id === emp.id ? "bg-blue-50 hover:bg-blue-50" : ""
                )}
              >
                <div>
                  <div className={cn(
                    "font-bold text-sm",
                    selectedEmp?.id === emp.id ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600"
                  )}>
                    {emp.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{emp.designation}</div>
                  {emp.email && <div className="text-xs text-slate-500 font-medium mt-1">{emp.email}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col col-span-1 md:col-span-2">
          {selectedEmp ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedEmp.name}'s Access</h2>
                  <p className="text-sm text-slate-500">
                    Configure module visibility for this employee. {selectedEmp.email ? `Access granted via: ${selectedEmp.email}` : 'No email provided.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleAll(true)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Allow All
                  </button>
                  <button 
                    onClick={() => handleToggleAll(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Revoke All
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-10">
                {/* Module Permissions Grid */}
                {permissionGroups.map((group, gIdx) => {
                  const isParentGranted = group.id ? (permissions[selectedEmp.id]?.[group.id] ?? false) : false;
                  
                  return (
                    <div key={gIdx} className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                           {group.title}
                        </h3>
                        {group.id && (
                          <button 
                            onClick={() => handleTogglePermission(group.id!, group)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase",
                              isParentGranted 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {isParentGranted ? 'Full Access' : 'Grant Full'}
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.modules.map(module => {
                          const isGranted = (permissions[selectedEmp.id]?.[module.id] ?? false) || (group.id ? (permissions[selectedEmp.id]?.[group.id] ?? false) : false);
                          return (
                            <div 
                              key={module.id}
                              onClick={() => handleTogglePermission(module.id)}
                              className={cn(
                                "p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer",
                                isGranted 
                                  ? "border-blue-500 bg-blue-50/50" 
                                  : "border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-100 hover:border-slate-300"
                              )}
                            >
                              <span className={cn(
                                "font-bold text-[13px]",
                                isGranted ? "text-blue-900" : "text-slate-600"
                              )}>
                                {module.label}
                              </span>
                              <div className={cn(
                                "w-4 h-4 rounded flex items-center justify-center transition-colors shadow-sm",
                                isGranted ? "bg-blue-500 text-white" : "bg-white border text-transparent"
                              )}>
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Security Section */}
                {!selectedEmp.isSuperAdmin && (
                  <div className="pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Lock className="w-3.5 h-3.5" /> System Security
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-slate-800">Set Default Password</div>
                          <p className="text-xs text-slate-500 mt-1">
                            Reset this user's password to the system default: <span className="font-mono font-bold text-blue-600">Welcome@123</span>
                          </p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to reset password for ${selectedEmp.name}?`)) return;
                            try {
                              const res = await fetch(`/management/api/employees/${selectedEmp.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...selectedEmp, password: 'Welcome@123' })
                              });
                              if (res.ok) alert('Password reset to: Welcome@123');
                            } catch (err) {
                              alert('Failed to reset password.');
                            }
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Apply Default Password
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
              <Shield className="w-12 h-12 mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">Select an employee to manage their access</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
