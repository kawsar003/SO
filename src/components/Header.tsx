import React, { useState, useEffect } from 'react';
import { Bell, Search, Menu, LogOut } from 'lucide-react';
import { Link } from 'react-router';

interface HeaderProps {
  onMenuClick: () => void;
  userEmail: string;
  onLogout: () => void;
}

export function Header({ onMenuClick, userEmail, onLogout }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/management/api/notifications/unread-count');
      const data = await res.json();
      setUnreadCount(data.count);
    } catch (error) {
      // Silently fail to avoid console spam during dev server restarts
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm shrink-0 z-10 sticky top-0">
      <div className="flex items-center flex-1 gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-500 hover:text-slate-700 mr-2"
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Search bar removed per user request */}
      </div>
      
      <div className="flex items-center gap-6 ml-4">
        <Link to="/notifications" className="relative opacity-60 hover:opacity-100 transition-opacity text-slate-900">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-3.5 pl-6 border-l">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-900 truncate max-w-[150px]" title={userEmail}>
              {userEmail.split('@')[0]}
            </div>
            <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Super Admin</div>
          </div>
          <button 
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
