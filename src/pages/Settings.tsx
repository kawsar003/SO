import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Check, 
  Loader2, 
  Plus, 
  Trash2, 
  Send, 
  Info, 
  AlertCircle, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  Lock, 
  Shield, 
  Activity, 
  Bot, 
  FileText, 
  Key,
  UserCheck,
  CheckSquare,
  Smartphone,
  Copy
} from 'lucide-react';
import { AccessManagement } from './AccessManagement';
import { UserActivities } from './UserActivities';
import { cn } from '@/src/lib/utils';

interface SettingsProps {
  userRole?: 'admin' | 'employee' | null;
  permissions?: Record<string, boolean> | null;
}

export function Settings({ userRole, permissions }: SettingsProps) {
  const [activeModule, setActiveModule] = useState<string>('slip');
  const [slipSettings, setSlipSettings] = useState({
    title1: '',
    title2: '',
    address: '',
    phone: '',
    additionalInfo: ''
  });
  const [hrmSettings, setHrmSettings] = useState({
    smartOfficeId: '',
    apiToken: '',
    apiKey: ''
  });
  const [telegramSettings, setTelegramSettings] = useState({
    botToken: '',
    userIds: [] as string[],
    sendDaily: true,
    sendMonthly: true,
    sendPaid: true,
    lastDailySent: '',
    lastMonthlySent: '',
    lastPaidSent: ''
  });
  const [newUserId, setNewUserId] = useState('');
  
  const [manualDailyDate, setManualDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualMonthlyMonth, setManualMonthlyMonth] = useState(new Date().toISOString().substring(0, 7));
  const [manualPaidMonth, setManualPaidMonth] = useState(new Date().toISOString().substring(0, 7));
  
  const [showBotToken, setShowBotToken] = useState(false);
  
  // Credentials custom states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [saveTelegramSuccess, setSaveTelegramSuccess] = useState(false);
  
  const [showSmartOfficeId, setShowSmartOfficeId] = useState(true);
  const [showApiToken, setShowApiToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  const [isRegenerating, setIsRegenerating] = useState(false);



  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleRegenerateHrmKeys = async () => {
    if (!window.confirm("Are you sure you want to regenerate the API Token and API Key? Any smartphone connections using the old keys will need to be reconfigured.")) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await fetch('/management/api/hrm-settings/regenerate', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setHrmSettings(data);
      } else {
        alert("Failed to regenerate token and API key.");
      }
    } catch (error) {
      console.error('Error regenerating keys:', error);
    } finally {
      setIsRegenerating(false);
    }
  };



  const [isTestingDaily, setIsTestingDaily] = useState(false);
  const [isTestingMonthly, setIsTestingMonthly] = useState(false);
  const [isTestingPaid, setIsTestingPaid] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [resSlip, resTelegram, resHrm] = await Promise.all([
          fetch('/management/api/slip-settings'),
          fetch('/management/api/telegram-settings'),
          fetch('/management/api/hrm-settings')
        ]);

        if (resSlip.ok) {
          const data = await resSlip.json();
          setSlipSettings(data);
        }

        if (resTelegram.ok) {
          const data = await resTelegram.json();
          setTelegramSettings(data);
        }

        if (resHrm.ok) {
          const data = await resHrm.json();
          setHrmSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/management/api/slip-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slipSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        setSlipSettings(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving slip settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    setSaveTelegramSuccess(false);
    setTestStatus({ type: null, message: '' });

    try {
      const res = await fetch('/management/api/telegram-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        setTelegramSettings(updated);
        setSaveTelegramSuccess(true);
        setTimeout(() => setSaveTelegramSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving telegram settings:', error);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setCredentialsStatus({ type: 'error', message: 'Current password is required.' });
      return;
    }
    if (!newPassword) {
      setCredentialsStatus({ type: 'error', message: 'New password is required.' });
      return;
    }
    setIsSavingCredentials(true);
    setCredentialsStatus({ type: '', message: '' });

    try {
      const res = await fetch('/management/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: localStorage.getItem('userEmail') || '',
          currentPassword,
          newEmail: newEmail.trim() || undefined,
          newPassword: newPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCredentialsStatus({ type: 'success', message: 'Account password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setNewEmail('');
        if (data.email) {
          localStorage.setItem('userEmail', data.email);
        }
        window.dispatchEvent(new Event('auth-permissions-updated'));
      } else {
        setCredentialsStatus({ type: 'error', message: data.error || 'Failed to update credentials. Please verify your current password.' });
      }
    } catch (err) {
      setCredentialsStatus({ type: 'error', message: 'Connection issue. Could not reach server.' });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleAddUserId = () => {
    const val = newUserId.trim();
    if (val && !telegramSettings.userIds.includes(val)) {
      setTelegramSettings({
        ...telegramSettings,
        userIds: [...telegramSettings.userIds, val]
      });
      setNewUserId('');
    }
  };

  const handleRemoveUserId = (idToRemove: string) => {
    setTelegramSettings({
      ...telegramSettings,
      userIds: telegramSettings.userIds.filter(id => id !== idToRemove)
    });
  };

  const handleTestDaily = async (targetDate?: string) => {
    const activeDate = targetDate || manualDailyDate;
    setIsTestingDaily(true);
    setTestStatus({ type: null, message: '' });
    try {
      const res = await fetch('/management/api/telegram-settings/send-date-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: activeDate, module: 'all' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({ type: 'success', message: `Success! Daily summary report for ${activeDate} has been dispatched to all recipients.` });
      } else {
        const errMsg = data.errors ? data.errors.join(', ') : (data.error || 'Web request failed');
        setTestStatus({ type: 'error', message: `Telegram API error: ${errMsg}` });
      }
    } catch (error: any) {
      setTestStatus({ type: 'error', message: `Unable to connect: ${error.message || error}` });
    } finally {
      setIsTestingDaily(false);
    }
  };

  const handleTestMonthly = async (targetMonth?: string) => {
    const activeMonth = targetMonth || manualMonthlyMonth;
    setIsTestingMonthly(true);
    setTestStatus({ type: null, message: '' });
    try {
      const res = await fetch('/management/api/telegram-settings/test-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...telegramSettings, month: activeMonth })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({ type: 'success', message: `Success! Monthly composite report for ${activeMonth} has been dispatched.` });
      } else {
        const errMsg = data.errors ? data.errors.join(', ') : (data.error || 'Web request failed');
        setTestStatus({ type: 'error', message: `Telegram API error: ${errMsg}` });
      }
    } catch (error: any) {
      setTestStatus({ type: 'error', message: `Unable to connect: ${error.message || error}` });
    } finally {
      setIsTestingMonthly(false);
    }
  };

  const handleTestPaid = async (targetMonth?: string) => {
    const activeMonth = targetMonth || manualPaidMonth;
    setIsTestingPaid(true);
    setTestStatus({ type: null, message: '' });
    try {
      const res = await fetch('/management/api/telegram-settings/test-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...telegramSettings, month: activeMonth })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({ type: 'success', message: `Success! Paid monthly voucher report for ${activeMonth} has been dispatched.` });
      } else {
        const errMsg = data.errors ? data.errors.join(', ') : (data.error || 'Web request failed');
        setTestStatus({ type: 'error', message: `Telegram API error: ${errMsg}` });
      }
    } catch (error: any) {
      setTestStatus({ type: 'error', message: `Unable to connect: ${error.message || error}` });
    } finally {
      setIsTestingPaid(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const canAccessSlip = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['settings_slip'] ?? false);
  const canAccessTelegram = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['settings_telegram'] ?? false);
  const canAccessSecurity = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['settings_security'] ?? false);
  const canAccessHrm = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['settings_hrm'] ?? false);
  const canAccessPermissions = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['access'] ?? false);
  const canAccessActivities = userRole === 'admin' || (permissions?.settings ?? false) || (permissions?.['activities'] ?? false);

  const menuItems = [
    { id: 'slip', label: 'Slip Configuration', icon: FileText, sublabel: 'Update the receipt header & company profile', access: canAccessSlip },
    { id: 'telegram', label: 'Telegram Automated Bot', icon: Bot, sublabel: 'Setup automated reporting & manual triggers', access: canAccessTelegram },
    { id: 'hrm', label: 'HRM API', icon: Smartphone, sublabel: 'Smart Office fingerprint remote integration', access: canAccessHrm },
    { id: 'security', label: 'Update Password & Security', icon: Shield, sublabel: 'User credentials & account protection', access: canAccessSecurity },
    { id: 'access', label: 'Access Control', icon: UserCheck, sublabel: 'Manage employee module permissions', access: canAccessPermissions },
    { id: 'activities', label: 'User Activity', icon: Activity, sublabel: 'System audit logs & user tracking', access: canAccessActivities }
  ];

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Select an option from the left to configure your office management system.</p>
      </div>

      <div className="flex-1 flex gap-8 min-h-[600px] items-stretch">
        {/* Left Sidebar Navigation */}
        <div className="w-80 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-sm shrink-0">
          <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-widest">
            Configuration Modules
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all group flex items-start gap-4",
                  activeModule === item.id 
                    ? "bg-slate-900 text-white shadow-md ring-1 ring-slate-800" 
                    : "hover:bg-slate-50 text-slate-600",
                  !item.access && "opacity-50 grayscale-[0.5]"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors shrink-0",
                  activeModule === item.id ? "bg-slate-800 text-blue-400" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate flex items-center gap-2">
                    {item.label}
                    {!item.access && <Lock className="w-3 h-3 text-slate-400" />}
                  </div>
                  <div className={cn(
                    "text-[10px] mt-0.5 font-medium line-clamp-1",
                    activeModule === item.id ? "text-slate-400" : "text-slate-400"
                  )}>
                    {item.sublabel}
                  </div>
                </div>
                {activeModule === item.id && (
                  <ChevronRight className="w-4 h-4 ml-auto self-center shrink-0 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {menuItems.find(m => m.id === activeModule)?.label}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {menuItems.find(m => m.id === activeModule)?.sublabel}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeModule === 'slip' && (
              <form onSubmit={handleSaveSettings} className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 p-4 bg-slate-50 border rounded-xl">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800">Update Receipt Header</h3>
                </div>
                {!canAccessSlip ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 text-amber-800">
                    <Lock className="w-10 h-10 shrink-0 opacity-50" />
                    <div>
                      <h3 className="font-bold text-lg">Configuration Restricted</h3>
                      <p className="text-sm opacity-90 leading-relaxed">Under company security policies, only System Administrators or Super Administrators are permitted to modify the organization's official slip headers and contact details.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Organisation Header Line 1 (Primary)</label>
                        <input 
                          type="text" 
                          value={slipSettings.title1}
                          onChange={e => setSlipSettings({ ...slipSettings, title1: e.target.value })}
                          placeholder="e.g. College of Tourism and Hospitality (CTH)"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all" 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Organisation Header Line 2 (Secondary)</label>
                        <input 
                          type="text" 
                          value={slipSettings.title2} 
                          onChange={e => setSlipSettings({ ...slipSettings, title2: e.target.value })}
                          placeholder="e.g. Bangladesh Medical Tourism & Consultancy (BMTC)"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Address Details</label>
                        <textarea 
                          value={slipSettings.address} 
                          onChange={e => setSlipSettings({ ...slipSettings, address: e.target.value })}
                          placeholder="e.g. 3rd Floor, Chowdhury Villa, Chittagong, Bangladesh."
                          rows={3}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all resize-none" 
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Phone Contacts</label>
                          <input 
                            type="text" 
                            value={slipSettings.phone} 
                            onChange={e => setSlipSettings({ ...slipSettings, phone: e.target.value })}
                            placeholder="e.g. 01819-654083 / 01619-694949"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all" 
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Additional Info (e.g. Web/Email)</label>
                          <input 
                            type="text" 
                            value={slipSettings.additionalInfo} 
                            onChange={e => setSlipSettings({ ...slipSettings, additionalInfo: e.target.value })}
                            placeholder="e.g. Web: www.cth-bmtc.com"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t flex justify-end">
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md flex items-center transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                          </>
                        ) : saveSuccess ? (
                          <>
                            <Check className="w-4 h-4 mr-2 text-emerald-400" /> Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" /> Save Configuration
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {activeModule === 'telegram' && (
              <form onSubmit={handleSaveTelegram} className="space-y-8 animate-fadeIn">
                {!canAccessTelegram ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 text-amber-800">
                    <Lock className="w-10 h-10 shrink-0 opacity-50" />
                    <div>
                      <h3 className="font-bold text-lg">Integration Locked</h3>
                      <p className="text-sm opacity-90 leading-relaxed">External messaging integrations are restricted to system administrators to prevent sensitive financial data from being leaked to unauthorized Telegram accounts.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bot Credentials Portion */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                      <div className="flex items-center gap-2 border-b pb-4 border-slate-200">
                        <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
                        <div>
                          <h3 className="font-bold text-slate-900">Telegram Bot Configuration</h3>
                          <p className="text-xs text-slate-500">Provide the central bot access token and active destination chat profiles.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-bold text-slate-700 block">Telegram Bot API Token</label>
                          <div className="relative group">
                            <input 
                              type={showBotToken ? "text" : "password"} 
                              value={telegramSettings.botToken}
                              onChange={e => setTelegramSettings({ ...telegramSettings, botToken: e.target.value })}
                              placeholder="e.g. 1234567890:AAH_g7sBvYm2X..."
                              className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-tight transition-all" 
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowBotToken(!showBotToken)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showBotToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                          <label className="text-sm font-bold text-slate-700 block">Report Recipients (Active Chat IDs)</label>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              value={newUserId}
                              onChange={e => setNewUserId(e.target.value)}
                              placeholder="e.g. 540679302"
                              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono transition-all" 
                            />
                            <button
                              type="button"
                              onClick={handleAddUserId}
                              className="bg-slate-950 hover:bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md flex-shrink-0"
                            >
                              <Plus className="w-5 h-5" /> Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2.5 p-4 bg-white border border-slate-200 border-dashed rounded-2xl min-h-[60px] items-center">
                            {telegramSettings.userIds.map(uid => (
                              <div key={uid} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-xs font-mono font-bold text-slate-700 group/item hover:border-red-200 transition-all">
                                {uid}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUserId(uid)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                  title="Remove recipient"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {telegramSettings.userIds.length === 0 && (
                              <span className="text-slate-400 text-xs italic mx-auto">No recipients configured. Reports will not be dispatched.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schedulers & Override Operations Ledger */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-bold text-slate-950 text-lg">Automated Tasks & Manual Overrides</h3>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          Scheduling Daemon Running
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                        Review the operational status of automatic background jobs. Toggle their automatic execution schedules below or perform direct manual overrides to instantly dispatch reports for custom times.
                      </p>

                      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                        {/* Task 1: Daily Report */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className="lg:col-span-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">TASK 01</span>
                              <h4 className="font-bold text-slate-950 text-sm">Daily General & Financial Summary</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Dispatches a comprehensive audit report of daily finance, cashflows, and attendance rates to all recipients.
                            </p>
                            <div className="text-[10px] text-slate-400 font-semibold space-y-1 mt-1 font-mono">
                              <div>Schedule: Automatic - Daily at 10:30 PM Bangladesh Time</div>
                              <div>Last Ran: <span className="text-slate-700 font-bold">{telegramSettings.lastDailySent || 'Never'}</span></div>
                            </div>
                          </div>

                          <div className="lg:col-span-3 lg:justify-self-center">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={telegramSettings.sendDaily} 
                                onChange={(e) => setTelegramSettings({ ...telegramSettings, sendDaily: e.target.checked })} 
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">Automatic Scheduler</span>
                                <span className="text-[10px] text-slate-400">{telegramSettings.sendDaily ? 'Active' : 'Disabled'}</span>
                              </div>
                            </label>
                          </div>

                          <div className="lg:col-span-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700">Manual Override Options</div>
                            <div className="flex gap-2">
                              <input 
                                type="date" 
                                value={manualDailyDate}
                                onChange={(e) => setManualDailyDate(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleTestDaily(manualDailyDate)}
                                disabled={isTestingDaily}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95"
                              >
                                {isTestingDaily ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Send Report
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task 2: Monthly Summary Report */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className="lg:col-span-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">TASK 02</span>
                              <h4 className="font-bold text-slate-950 text-sm">Monthly Attendance & Finance Report</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Compiles complete statistics of high-precision finance and employee attendance rate for the month and dispatches summary.
                            </p>
                            <div className="text-[10px] text-slate-400 font-semibold space-y-1 mt-1 font-mono">
                              <div>Schedule: Automatic - Last day of month at 11:30 PM Bangladesh Time</div>
                              <div>Last Ran: <span className="text-slate-700 font-bold">{telegramSettings.lastMonthlySent || 'Never'}</span></div>
                            </div>
                          </div>

                          <div className="lg:col-span-3 lg:justify-self-center">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={telegramSettings.sendMonthly} 
                                onChange={(e) => setTelegramSettings({ ...telegramSettings, sendMonthly: e.target.checked })} 
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">Automatic Scheduler</span>
                                <span className="text-[10px] text-slate-400">{telegramSettings.sendMonthly ? 'Active' : 'Disabled'}</span>
                              </div>
                            </label>
                          </div>

                          <div className="lg:col-span-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700">Manual Override Options</div>
                            <div className="flex gap-2">
                              <input 
                                type="month" 
                                value={manualMonthlyMonth}
                                onChange={(e) => setManualMonthlyMonth(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleTestMonthly(manualMonthlyMonth)}
                                disabled={isTestingMonthly}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95"
                              >
                                {isTestingMonthly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Send Report
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task 3: Paid Vouchers Summary Report */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className="lg:col-span-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">TASK 03</span>
                              <h4 className="font-bold text-slate-950 text-sm">Monthly Paid Summary Report</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Dispatches approved voucher payment distributions (Salim Sir, Nazim Sir, Others partition) matched with available liquid cash reserves.
                            </p>
                            <div className="text-[10px] text-slate-400 font-semibold space-y-1 mt-1 font-mono">
                              <div>Schedule: Automatic - 1st of month at 01:00 AM Bangladesh Time</div>
                              <div>Last Ran: <span className="text-slate-700 font-bold">{telegramSettings.lastPaidSent || 'Never'}</span></div>
                            </div>
                          </div>

                          <div className="lg:col-span-3 lg:justify-self-center">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={telegramSettings.sendPaid} 
                                onChange={(e) => setTelegramSettings({ ...telegramSettings, sendPaid: e.target.checked })} 
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">Automatic Scheduler</span>
                                <span className="text-[10px] text-slate-400">{telegramSettings.sendPaid ? 'Active' : 'Disabled'}</span>
                              </div>
                            </label>
                          </div>

                          <div className="lg:col-span-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700">Manual Override Options</div>
                            <div className="flex gap-2">
                              <input 
                                type="month" 
                                value={manualPaidMonth}
                                onChange={(e) => setManualPaidMonth(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleTestPaid(manualPaidMonth)}
                                disabled={isTestingPaid}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95"
                              >
                                {isTestingPaid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Send Report
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task 4: Smart Office attendance sync */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className="lg:col-span-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">TASK 04</span>
                              <h4 className="font-bold text-slate-950 text-sm">Smart Office Fingerprint Attendance Sync</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Real-time synchronization of employee biometric punch logs sent via the external Android device and hardware API.
                            </p>
                            <div className="text-[10px] text-slate-400 font-semibold space-y-1 mt-1 font-mono">
                              <div>Schedule: Automatic - Immediate on Biometric punch events</div>
                              <div>Gateway Connection: <span className="text-emerald-600 font-black animate-pulse">● Connected</span></div>
                            </div>
                          </div>

                          <div className="lg:col-span-3 lg:justify-self-center">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">Biometric Gateway</span>
                                <span className="text-[10px] text-emerald-600 uppercase font-bold">Always Active</span>
                              </div>
                            </div>
                          </div>

                          <div className="lg:col-span-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700">Manual Override Options</div>
                            <button
                              type="button"
                              onClick={() => {
                                const newUrl = new URL(window.location.href);
                                newUrl.hash = '#/attendance';
                                window.location.href = newUrl.href;
                              }}
                              className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95"
                            >
                              <CheckSquare className="w-4 h-4 text-slate-500" />
                              Go to Attendance marking panel
                            </button>
                          </div>
                        </div>
                      </div>

                      {testStatus.type && (
                        <div className={cn(
                          "p-4 rounded-xl border text-xs font-bold animate-fadeIn",
                          testStatus.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                        )}>
                          {testStatus.message}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2 text-xs text-blue-700 leading-relaxed shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800">
                        <HelpCircle className="w-4 h-4" />
                        Automation Setup & Scheduling Instructions:
                      </div>
                      <ol className="list-decimal list-inside space-y-1 ml-1 font-medium opacity-80">
                        <li>Create a bot via <span className="font-bold underline">@BotFather</span> and copy the token identifier.</li>
                        <li>Automated reports are delivered directly over the Telegram chat pipeline dynamically based on active BDT chronograms.</li>
                      </ol>
                    </div>

                    <div className="pt-6 border-t flex justify-end gap-4">
                      {saveTelegramSuccess && (
                        <span className="flex items-center text-xs font-semibold text-emerald-600 animate-fadeIn">
                          <Check className="w-4 h-4 mr-2" /> Settings Persistent
                        </span>
                      )}
                      <button 
                        type="submit" 
                        disabled={isSavingTelegram}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-95"
                      >
                        {isSavingTelegram ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Integration'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {activeModule === 'hrm' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 p-4 bg-slate-50 border rounded-xl">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800">HRM API (Smart Office Integration)</h3>
                </div>
                {!canAccessHrm ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 text-amber-800">
                    <Lock className="w-10 h-10 shrink-0 opacity-50" />
                    <div>
                      <h3 className="font-bold text-lg">Configuration Restricted</h3>
                      <p className="text-sm opacity-90 leading-relaxed">You do not have permissions to modify HRM or hardware API settings.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2 text-xs text-blue-700 leading-relaxed shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800">
                        <Info className="w-4 h-4" />
                        Hardware Integration Sync
                      </div>
                      <p className="opacity-90 font-medium">Use these credentials to connect an external Android smartphone or hardware terminal for direct fingerprint scanning and attendance presentation via the Smart Office gateway system. These integration parameters are auto-generated and permanently defined.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          Smart Office ID 
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 rounded">Permanent</span>
                        </label>
                        <div className="relative">
                          <input 
                            type={showSmartOfficeId ? "text" : "password"}
                            readOnly
                            value={hrmSettings.smartOfficeId}
                            className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-mono tracking-tight shadow-sm select-all"
                          />
                          <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowSmartOfficeId(!showSmartOfficeId)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title={showSmartOfficeId ? "Hide ID" : "Show ID"}
                            >
                              {showSmartOfficeId ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(hrmSettings.smartOfficeId, 'smartOfficeId')}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy Smart Office ID"
                            >
                              {copyStatus['smartOfficeId'] ? <Check className="w-4.5 h-4.5 text-emerald-500 font-bold" /> : <Copy className="w-4.5 h-4.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-slate-700 md:col-span-2">
                        <label className="text-sm font-bold block flex items-center gap-2">
                          API Token
                          <span className="text-[10px] bg-amber-50 text-amber-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded">Secure Gateway</span>
                        </label>
                        <div className="relative">
                          <input 
                            type={showApiToken ? "text" : "password"}
                            readOnly
                            value={hrmSettings.apiToken}
                            className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-mono tracking-tight shadow-sm select-all"
                          />
                          <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowApiToken(!showApiToken)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title={showApiToken ? "Hide Token" : "Show Token"}
                            >
                              {showApiToken ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(hrmSettings.apiToken, 'apiToken')}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy API Token"
                            >
                              {copyStatus['apiToken'] ? <Check className="w-4.5 h-4.5 text-emerald-500 font-bold" /> : <Copy className="w-4.5 h-4.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-slate-700 md:col-span-2">
                        <label className="text-sm font-bold block flex items-center gap-2">
                          API Key
                          <span className="text-[10px] bg-rose-50 text-rose-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded">Hardware Sync Key</span>
                        </label>
                        <div className="relative">
                          <input 
                            type={showApiKey ? "text" : "password"}
                            readOnly
                            value={hrmSettings.apiKey}
                            className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-mono tracking-tight shadow-sm select-all"
                          />
                          <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title={showApiKey ? "Hide Key" : "Show Key"}
                            >
                              {showApiKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(hrmSettings.apiKey, 'apiKey')}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy API Key"
                            >
                              {copyStatus['apiKey'] ? <Check className="w-4.5 h-4.5 text-emerald-500 font-bold" /> : <Copy className="w-4.5 h-4.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t flex justify-end gap-4">
                      <button 
                        type="button" 
                        onClick={handleRegenerateHrmKeys}
                        disabled={isRegenerating}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2"
                      >
                        {isRegenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                        Regenerate Access Credentials
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeModule === 'security' && (
              <form onSubmit={handleUpdateCredentials} className="space-y-8 animate-fadeIn">
                {!canAccessSecurity ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 text-amber-800">
                    <Lock className="w-10 h-10 shrink-0 opacity-50" />
                    <div>
                      <h3 className="font-bold text-lg">Security Settings Restricted</h3>
                      <p className="text-sm opacity-90 leading-relaxed">Updating account credentials and global security policies is restricted by your current administrative profile. Please contact IT support for credential resets.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-600 leading-relaxed shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        Security Management:
                      </div>
                      <ul className="list-disc list-inside space-y-1 ml-1 opacity-90 font-medium">
                        <li>Passwords must be rotated periodically to maintain system integrity.</li>
                        <li>Changing your password will immediately end all other active sessions for your account.</li>
                        <li>Ensure you use a complex alphanumeric passcode at least 8 characters long.</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">Current Active Password</label>
                        <div className="relative">
                          <input 
                            type={showCurrentPassword ? "text" : "password"} 
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Required for verification"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono focus:bg-white transition-all shadow-sm" 
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">New Secure Password</label>
                        <div className="relative">
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Setup a new passcode"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono focus:bg-white transition-all shadow-sm" 
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-bold text-slate-700 block">Support/System Email</label>
                        <input 
                          type="email" 
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder={localStorage.getItem('userEmail') || 'manager@company.com'}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium focus:bg-white transition-all shadow-sm" 
                        />
                      </div>
                    </div>

                    {credentialsStatus.message && (
                      <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 animate-fadeIn ${
                        credentialsStatus.type === 'success' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {credentialsStatus.type === 'success' ? (
                          <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                        )}
                        <span className="font-medium">{credentialsStatus.message}</span>
                      </div>
                    )}

                    <div className="pt-6 border-t flex justify-end">
                      <button 
                        type="submit" 
                        disabled={isSavingCredentials || !currentPassword || !newPassword}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-10 py-3 rounded-xl text-sm font-bold shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                      >
                        {isSavingCredentials ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                        {isSavingCredentials ? 'Updating Security...' : 'Apply Security Passcode'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {activeModule === 'access' && (
              <div className="animate-fadeIn h-full">
                {canAccessPermissions ? (
                  <AccessManagement contentOnly={true} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50 border border-dashed rounded-3xl h-full">
                    <Shield className="w-16 h-16 text-slate-200 mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">Privilege Restriction</h3>
                    <p className="max-w-md mt-2 leading-relaxed font-medium">Access Management is only available to Super Administrators. Please contact the primary system administrator to modify employee permissions.</p>
                  </div>
                )}
              </div>
            )}

            {activeModule === 'activities' && (
              <div className="animate-fadeIn h-full">
                {canAccessActivities ? (
                  <UserActivities contentOnly={true} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50 border border-dashed rounded-3xl h-full">
                    <Activity className="w-16 h-16 text-slate-200 mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">System Logs Reserved</h3>
                    <p className="max-w-md mt-2 leading-relaxed font-medium">Audit logs are restricted to Administrative roles to maintain privacy and system security standards.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

