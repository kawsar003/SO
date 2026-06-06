import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  Briefcase, 
  FileText, 
  Package, 
  CheckSquare, 
  Bell, 
  Settings,
  X,
  UserPlus,
  ChevronDown,
  Shield,
  Activity,
  Lock,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GuestModal } from './GuestModal';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { 
    icon: Users, 
    label: 'HR Management', 
    children: [
      { icon: UserCheck, label: 'Employee', path: '/employee-list' },
      { icon: DollarSign, label: 'Salary Sheet', path: '/hr' },
      { icon: Clock, label: 'Attendance', path: '/attendance' },
      { icon: Calendar, label: 'Leave', path: '/leave' }
    ]
  },
  { 
    icon: Briefcase, 
    label: 'Finance', 
    children: [
      { icon: Briefcase, label: 'Accounting', path: '/accounting' },
      { icon: FileText, label: 'Receipt & Voucher', path: '/requisitions' },
      { icon: DollarSign, label: 'Paid', path: '/paid' },
    ]
  },
  { icon: CheckSquare, label: 'Tasks and Projects', path: '/tasks' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
];

function NavItem({ item, onClose, depth = 0, permissions, userRole, expandedMenu, onToggleMenu }: any) {
  const location = useLocation();
  const [localIsOpen, setLocalIsOpen] = useState(
    item.children?.some((child: any) => location.pathname === child.path) || (item.path && location.pathname === item.path)
  );

  const isOpen = depth === 0 && expandedMenu !== undefined 
    ? expandedMenu === item.label 
    : localIsOpen;

  const handleToggle = () => {
    if (depth === 0 && onToggleMenu) {
      onToggleMenu(isOpen ? null : item.label);
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };
  
  const plClass = depth === 0 ? "pl-4 pr-4" : "pl-11 pr-4";

  const checkAccess = (pathOrKey: string): boolean => {
    if (!permissions) return true;
    
    const keyMap: Record<string, string[]> = {
      '/': ['dashboard'],
      '/employee-list': ['hr', 'hr_employee'],
      '/hr': ['hr', 'hr_admin'],
      '/attendance': ['hr', 'attendance'],
      '/leave': ['hr', 'leave'],
      '/late': ['hr', 'attendance'],
      '/present': ['hr', 'attendance'],
      '/absent': ['hr', 'attendance'],
      '/accounting': ['finance', 'accounting'],
      '/requisitions': ['finance', 'requisitions'],
      '/paid': ['finance', 'finance_paid'],
      '/tasks': ['tasks'],
      '/notifications': ['notifications'],
      '/reports': ['reports'],
      '/settings': ['settings', 'settings_slip', 'settings_telegram', 'settings_security', 'access', 'activities'],
      '/access': ['settings', 'access'],
      '/activities': ['settings', 'activities'],
      'guest': ['guest']
    };
    
    const keys = keyMap[pathOrKey] || [pathOrKey];
    return keys.some(key => permissions[key] === true);
  };

  const isLocked = item.path ? !checkAccess(item.path) : false;

  if (item.children) {
    const isActiveParent = (item.path && location.pathname === item.path) || item.children.some((child: any) => location.pathname === child.path);
    return (
      <div className="flex flex-col">
        {item.path ? (
          <div className="flex w-full">
            <NavLink
              end={item.path === '/'}
              onClick={onClose}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center justify-between py-2 font-medium transition-colors text-sm flex-1",
                plClass,
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 bg-slate-800 hover:bg-slate-800" 
                  : isLocked 
                    ? "text-slate-500 hover:text-slate-400" 
                    : "hover:bg-slate-800 text-slate-300 border-r-2 border-transparent"
              )}
            >
              {({ isActive }) => (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "flex-shrink-0 h-4 w-4",
                      isActive ? "text-blue-400" : isLocked ? "text-slate-600" : "text-slate-400"
                    )} />
                    <span className={isLocked ? "line-through decoration-dotted decoration-slate-600" : ""}>{item.label}</span>
                  </div>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-slate-600" />}
                </div>
              )}
            </NavLink>
            <button
              onClick={handleToggle}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center border-r-2 border-transparent"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleToggle}
            className={cn(
              "flex items-center justify-between w-full py-2 font-medium transition-colors text-sm",
              plClass,
              isActiveParent
                ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 bg-slate-800" 
                : "hover:bg-slate-800 text-slate-300 border-r-2 border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn(
                "flex-shrink-0 h-4 w-4",
                isActiveParent ? "text-blue-400" : "text-slate-400"
              )} />
              {item.label}
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")} />
          </button>
        )}
        {isOpen && (
          <div className="flex flex-col mt-1">
            {item.children.map((child: any) => (
              <NavItem 
                key={child.path} 
                item={child} 
                onClose={onClose} 
                depth={depth + 1} 
                permissions={permissions} 
                userRole={userRole} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      end={item.path === '/'}
      onClick={onClose}
      to={item.path}
      className={({ isActive }) => cn(
        "flex items-center gap-3 py-2 font-medium transition-colors text-sm",
        plClass,
        isActive 
          ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 bg-slate-800 hover:bg-slate-800" 
          : isLocked 
            ? "text-slate-500 hover:text-slate-400" 
            : "hover:bg-slate-800 text-slate-300 border-r-2 border-transparent"
      )}
    >
      {({ isActive }) => (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className={cn(
              "flex-shrink-0 h-4 w-4",
              isActive ? "text-blue-400" : isLocked ? "text-slate-600" : "text-slate-400"
            )} />}
            <span className={isLocked ? "line-through decoration-dotted decoration-slate-600" : ""}>{item.label}</span>
          </div>
          {isLocked && <Lock className="h-3.5 w-3.5 text-slate-600" />}
        </div>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: Record<string, boolean> | null;
  userRole: 'admin' | 'employee' | null;
}

export function Sidebar({ isOpen, onClose, permissions, userRole }: SidebarProps) {
  const location = useLocation();
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    const activeItem = navItems.find(item => item.children?.some((child: any) => location.pathname === child.path));
    return activeItem ? activeItem.label : null;
  });

  const checkAccess = (pathOrKey: string): boolean => {
    if (!permissions) return true; // Default to true while loading to avoid blanks
    
    const keyMap: Record<string, string[]> = {
      '/': ['dashboard'],
      '/employee-list': ['hr', 'hr_employee'],
      '/hr': ['hr', 'hr_admin'],
      '/attendance': ['hr', 'attendance'],
      '/leave': ['hr', 'leave'],
      '/late': ['hr', 'attendance'],
      '/present': ['hr', 'attendance'],
      '/absent': ['hr', 'attendance'],
      '/accounting': ['finance', 'accounting'],
      '/requisitions': ['finance', 'requisitions'],
      '/paid': ['finance', 'finance_paid'],
      '/tasks': ['tasks'],
      '/notifications': ['notifications'],
      '/reports': ['reports'],
      '/settings': ['settings', 'settings_slip', 'settings_telegram', 'settings_security', 'access', 'activities'],
      '/access': ['settings', 'access'],
      '/activities': ['settings', 'activities'],
      'guest': ['guest']
    };
    
    const keys = keyMap[pathOrKey] || [pathOrKey];
    return keys.some(key => permissions[key] === true);
  };

  const isGuestLocked = !checkAccess('guest');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "bg-slate-900 text-white min-h-screen flex flex-col shrink-0 w-60 fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h1 className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black">SO</div>
            <div className="flex flex-col tracking-tight">
              <span className="text-xl font-bold leading-none">Smart Office</span>
              <span className="text-[10px] text-slate-400 font-medium">Powered by Kawsar Enterprise</span>
            </div>
          </h1>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Core Modules</div>
          <nav className="flex flex-col flex-1">
            {navItems.map((item) => {
              return (
                <NavItem 
                  key={item.label} 
                  item={item} 
                  onClose={onClose} 
                  permissions={permissions} 
                  userRole={userRole} 
                  expandedMenu={expandedMenu}
                  onToggleMenu={setExpandedMenu}
                />
              );
            })}
            
            {/* Guest Action in the main list */}
            <button
              onClick={() => {
                if (isGuestLocked) {
                  alert("Access Locked: Your profile does not have privilege to access the Guest Management module.");
                  return;
                }
                setIsGuestModalOpen(true);
                if (window.innerWidth < 768) {
                  onClose();
                }
              }}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2 font-medium transition-colors text-sm border-r-2 border-transparent w-full text-left inline-flex",
                isGuestLocked 
                  ? "text-slate-500 hover:text-slate-400 cursor-not-allowed" 
                  : "hover:bg-slate-800 text-slate-300"
              )}
            >
              <div className="flex items-center gap-3">
                <UserPlus className={cn("flex-shrink-0 h-4 w-4", isGuestLocked ? "text-slate-600" : "text-emerald-400 animate-pulse")} />
                <span className={isGuestLocked ? "line-through decoration-dotted decoration-slate-600" : ""}>Guest</span>
              </div>
              {isGuestLocked && <Lock className="h-3.5 w-3.5 text-slate-600" />}
            </button>
            
            <NavItem 
              item={{
                icon: FileText,
                label: 'Report',
                path: '/reports'
              }} 
              onClose={onClose} 
              permissions={permissions}
              userRole={userRole}
            />
            
            <div className="flex-1 min-h-[4rem]" />
            
            <div className="mt-auto border-t border-slate-800 pt-2 pb-4">
              <NavItem 
                item={{
                  icon: Settings,
                  label: 'Settings',
                  path: '/settings'
                }}
                onClose={onClose}
                permissions={permissions}
                userRole={userRole}
              />
            </div>
          </nav>
        </div>
      </aside>

      <GuestModal isOpen={isGuestModalOpen} onClose={() => setIsGuestModalOpen(false)} />
    </>
  );
}
