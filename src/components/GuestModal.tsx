import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, MessageSquare, Users, HelpCircle, FileText } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuestModal({ isOpen, onClose }: GuestModalProps) {
  const [formData, setFormData] = useState({
    visitingPerson: '', // 1. Who is wanted? (Optional)
    reason: '', // 2. Why did you come? (Optional)
    name: '', // 3. Guest Name (Mandatory)
    phone: '', // 4. Guest Phone (Mandatory)
    wantsToKnowSomething: '', // 5. Want to know something? (Optional)
    pax: 1 // 6. How many people came? (Optional)
  });
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/management/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data))
        .catch(err => console.error("Error fetching employees:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate only mandatory fields
    if (!formData.visitingPerson) {
      alert("Please select who is wanted (the employee/host). It is a mandatory field.");
      return;
    }
    if (!formData.name.trim()) {
      alert("Please provide the Guest's Name. It is a mandatory field.");
      return;
    }
    if (!formData.phone.trim()) {
      alert("Please provide the Guest's Phone Number. It is a mandatory field.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save record in the database
      const response = await fetch('/management/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        // Find the selected employee's whatsapp number if one was specified
        const selectedEmployee = formData.visitingPerson 
          ? employees.find(emp => emp.name === formData.visitingPerson)
          : null;
        
        // Target number is the employee's registered whatsapp number. Fallback to guest's phone if no host is specified.
        const targetNumber = selectedEmployee?.whatsappNumber || formData.phone || '';
        const cleanNum = targetNumber.replace(/\D/g, '');
        
        // Exact styled structure as requested
        const alertMsg = `🔔 *New Guest Arrival Notification*\n\n` +
                         `*Guest Name: ${formData.name}\n` +
                         `*Guest Phone: ${formData.phone}\n` +
                         `*Why did they come: ${formData.reason || 'Not specified'}\n` +
                         `*How many people came: ${formData.pax} person(s)\n` +
                         `*Want to know something: ${formData.wantsToKnowSomething || 'Not specified'}\n\n` +
                         `If you give me permission, I will send them inside.`;

        const encodedMsg = encodeURIComponent(alertMsg);
        const waUrl = cleanNum ? `https://wa.me/${cleanNum}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
        
        // Open WhatsApp Web/App in a new tab
        window.open(waUrl, '_blank');

        alert('Guest record saved successfully! Opening WhatsApp notification...');
        
        // Reset form values and close modal
        setFormData({
          visitingPerson: '',
          reason: '',
          name: '',
          phone: '',
          wantsToKnowSomething: '',
          pax: 1
        });
        onClose();
      } else {
        alert('Failed to save guest record.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the guest profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Guest Entry Form
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form with requested options in ordering & status validation */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* 1. Who is wanted? (Mandatory field) */}
            <div className="space-y-1 bg-blue-50/50 p-3 rounded-lg border border-blue-105">
              <label className="text-xs font-black text-slate-705 text-slate-800 uppercase tracking-wider block mb-1">
                1. Who is wanted? <span className="text-red-500">*</span>
              </label>
              <select 
                required
                value={formData.visitingPerson}
                onChange={(e) => setFormData({...formData, visitingPerson: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-900"
              >
                <option value="" disabled>-- Select Employee / Host --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                If specified, the guest's notification route will hit this employee's registered number.
              </p>
            </div>

            {/* 2. Why did you come? (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                2. Why did you come? <span className="text-xs text-slate-400 lowercase font-normal">(Optional)</span>
              </label>
              <textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 resize-none min-h-[60px]"
                placeholder="e.g. Admission inquiry, interview, meeting"
              />
            </div>

            {/* 3. Guest name (Mandatory) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-705 text-slate-800 uppercase tracking-wider block">
                3. Guest Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-404 font-semibold text-slate-900"
                placeholder="Enter guest's full name"
              />
            </div>
            
            {/* 4. Guest phone number (Mandatory) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-705 text-slate-800 uppercase tracking-wider block">
                4. Guest Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  placeholder="e.g. +8801819654083"
                />
              </div>
            </div>

            {/* 5. Want to know something? (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                5. Want to know something? <span className="text-xs text-slate-400 lowercase font-normal">(Optional)</span>
              </label>
              <input 
                type="text"
                value={formData.wantsToKnowSomething}
                onChange={(e) => setFormData({...formData, wantsToKnowSomething: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                placeholder="e.g. Tuition fee, discount structure, host availability"
              />
            </div>

            {/* 6. How many people came? (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                6. How many people came? <span className="text-xs text-slate-400 lowercase font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="number" 
                  min={1}
                  value={formData.pax}
                  onChange={(e) => setFormData({...formData, pax: parseInt(e.target.value) || 1})}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>

          </div>

          {/* Footer with only the English Action Button & Cancel */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col gap-2">
            
            {/* ONLY the WhatsApp button translated into clean English, which saves the record as well */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-lg hover:scale-[1.01]"
            >
              <MessageSquare className="w-4.5 h-4.5 text-emerald-100" />
              Save & Notify via WhatsApp
            </button>

            <button 
              type="button" 
              onClick={onClose}
              className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
}
