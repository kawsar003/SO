import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/management/api/notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/management/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/management/api/notifications/mark-all-read', {
        method: 'POST'
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Alert': return AlertCircle;
      case 'Approval': return Info;
      case 'System': return CheckCircle;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Alert': return 'text-amber-500';
      case 'Approval': return 'text-blue-500';
      case 'System': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">System alerts, approval requests, and reminders.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="text-blue-600 font-bold text-sm hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <div 
                key={notif.id} 
                onClick={() => notif.status === 'unread' && markAsRead(notif.id)}
                className={cn(
                  "p-4 sm:p-6 transition-colors flex gap-4 cursor-pointer",
                  notif.status === 'unread' ? "bg-blue-50/30 hover:bg-blue-50/50" : "hover:bg-slate-50"
                )}
              >
                <div className={cn("mt-0.5 shrink-0", getColor(notif.type))}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className={cn("text-sm transition-colors", notif.status === 'unread' ? "font-bold text-slate-900" : "font-medium text-slate-600")}>
                        {notif.title}
                      </h3>
                      {notif.status === 'unread' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{notif.time}</span>
                  </div>
                  <p className={cn("text-sm mt-1 transition-colors", notif.status === 'unread' ? "text-slate-700" : "text-slate-500")}>
                    {notif.message}
                  </p>
                  {notif.type === 'Approval' && notif.status === 'unread' && (
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold shadow-sm hover:bg-blue-700">Approve</button>
                      <button className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50">Deny</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
