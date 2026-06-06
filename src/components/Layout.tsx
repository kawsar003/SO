import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Lock, Shield, ChevronLeft } from 'lucide-react';

interface LayoutProps {
  userEmail: string;
  onLogout: () => void;
  permissions: Record<string, boolean> | null;
  userRole: 'admin' | 'employee' | null;
}

export function Layout({ userEmail, onLogout, permissions, userRole }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Route paths and their required permissions keys
  const routePermissions: Record<string, string> = {
    '/': 'dashboard',
    '/hr': 'hr',
    '/attendance': 'attendance',
    '/leave': 'leave',
    '/accounting': 'accounting',
    '/requisitions': 'requisitions',
    '/tasks': 'tasks',
    '/notifications': 'notifications',
    '/reports': 'reports',
    '/settings': 'settings',
    '/access': 'access',
    '/activities': 'activities'
  };

  const currentPath = location.pathname;
  const permissionKey = routePermissions[currentPath] || 'dashboard';

  // Decide if route is permitted. If permissions is not loaded yet, default to loading screen (or true temporarily).
  // Super admins and settings auto-bypass all restrictions
  const isLoaded = permissions !== null || userRole === 'admin' || permissionKey === 'settings';
  const hasAccess = userRole === 'admin' || permissionKey === 'settings' || (isLoaded ? (permissions?.[permissionKey] ?? false) : true);

  const permittedModules = permissions ? Object.entries(permissions)
    .filter(([_, allowed]) => allowed)
    .map(([key]) => {
      const names: Record<string, string> = {
        dashboard: 'Dashboard',
        hr: 'HR Management',
        attendance: 'Attendance',
        leave: 'Leave and Duty',
        accounting: 'Accounting',
        requisitions: 'Receipt & Voucher',
        tasks: 'Tasks & Projects',
        notifications: 'Notifications',
        reports: 'Reports',
        guest: 'Guest Management',
        settings: 'Default Settings',
        access: 'Access Management',
        activities: 'User Activities'
      };
      return names[key] || key;
    }) : [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} permissions={permissions} userRole={userRole} />
      <div className="flex flex-col flex-1 w-0 overflow-hidden h-full">
        <Header onMenuClick={() => setSidebarOpen(true)} userEmail={userEmail} onLogout={onLogout} />
        <main className="flex-1 flex flex-col relative overflow-y-auto focus:outline-none h-full">
          <div className="p-6 flex flex-col gap-6 w-full max-w-[1400px] mx-auto min-h-0">
            {!isLoaded ? (
              <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
              </div>
            ) : !hasAccess ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] py-12 px-4 font-sans select-none animate-fadeIn">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
                  {/* Abstract structural glow */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />
                  
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 rounded-2xl border border-rose-100 text-rose-500 mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Access Locked</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      Your profile does not have privilege to access this module. Unauthorized options are restricted and locked.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Allocated Privileges
                    </div>
                    {permittedModules.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {permittedModules.map(mod => (
                          <div key={mod} className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {mod}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-bold italic text-center py-2">No accessible options configured</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.history.length > 1) {
                        window.history.back();
                      } else {
                        window.location.hash = '#/';
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md text-sm cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Go Back
                  </button>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
