/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Attendance } from './pages/Attendance';
import { Requisitions } from './pages/Requisitions';
import { Leave } from './pages/Leave';
import { Accounting } from './pages/Accounting';
import { Inventory } from './pages/Inventory';
import { Tasks } from './pages/Tasks';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { AccessManagement } from './pages/AccessManagement';
import { UserActivities } from './pages/UserActivities';
import { Login } from './pages/Login';
import { Paid } from './pages/Paid';
import { EmployeeList } from './pages/EmployeeList';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || 'k.e.bd.contact@gmail.com';
  });
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

  const fetchStatus = () => {
    if (!isAuthenticated) return;
    fetch(`/management/api/auth/status?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setUserRole(data.role || 'employee');
          setPermissions(data.permissions || null);
        }
      })
      .catch(err => console.error('Error verifying auth status:', err));
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    setUserRole(null);
    setPermissions(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    fetchStatus();

    // Re-verify and fetch whenever permissions are updated or role is synced
    const handleUpdate = () => {
      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail && storedEmail !== userEmail) {
        setUserEmail(storedEmail);
      } else {
        fetchStatus();
      }
    };

    window.addEventListener('auth-permissions-updated', handleUpdate);
    return () => {
      window.removeEventListener('auth-permissions-updated', handleUpdate);
    };
  }, [isAuthenticated, userEmail]);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout userEmail={userEmail} onLogout={handleLogout} permissions={permissions} userRole={userRole} />}>
          <Route index element={<Dashboard />} />
          <Route path="employee-list" element={<EmployeeList />} />
          <Route path="hr" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="late" element={<Attendance statusFilter="Late" />} />
          <Route path="present" element={<Attendance statusFilter="Present" />} />
          <Route path="absent" element={<Attendance statusFilter="Absent" />} />
          <Route path="attendance-leave" element={<Attendance statusFilter="Leave" />} />
          <Route path="leave" element={<Leave />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="requisitions" element={<Requisitions />} />
          <Route path="paid" element={<Paid />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings userRole={userRole} permissions={permissions} />} />
          <Route path="access" element={<AccessManagement />} />
          <Route path="activities" element={<UserActivities />} />
          <Route path="*" element={<div className="flex h-64 items-center justify-center text-slate-400 font-medium">Module under construction</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}



