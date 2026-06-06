import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Check, X, CheckSquare, Edit, Trash2, Printer } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (isNaN(num)) return '';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty ','Thirty ','Forty ','Fifty ', 'Sixty ','Seventy ','Eighty ','Ninety '];

  const inWords = (n: number) => {
      let numStr = Math.floor(n).toString();
      if (numStr.length > 9) return 'Overflow';
      let nStr = ('000000000' + numStr).slice(-9);
      const match = nStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!match) return '';
      let str = '';
      str += (parseInt(match[1]) != 0) ? (a[Number(match[1])] || b[Number(match[1][0])] + a[Number(match[1][1])]) + 'Crore ' : '';
      str += (parseInt(match[2]) != 0) ? (a[Number(match[2])] || b[Number(match[2][0])] + a[Number(match[2][1])]) + 'Lakh ' : '';
      str += (parseInt(match[3]) != 0) ? (a[Number(match[3])] || b[Number(match[3][0])] + a[Number(match[3][1])]) + 'Thousand ' : '';
      str += (parseInt(match[4]) != 0) ? (a[Number(match[4])] || b[Number(match[4][0])] + a[Number(match[4][1])]) + 'Hundred ' : '';
      str += (parseInt(match[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + a[Number(match[5][1])]) : '';
      return str.trim();
  };
  return inWords(num) + ' Taka Only';
}

export function Requisitions() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('received');
  
  const printRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    if (!selectedSlip) return;
    
    const handleResize = () => {
      // Calculate based on modal screen bounds
      // Viewport space available: height minus modal header, footer, padding (~180px)
      // and width space available: window.innerWidth minus paddings (~48px)
      const availableHeight = window.innerHeight - 200;
      const availableWidth = window.innerWidth - 64;
      
      // Target dimensions for full A4 landscape slip (297mm x 210mm = 1122px x 794px at 96dpi)
      const targetWidth = 1122;
      const targetHeight = 794;
      
      const scaleH = availableHeight / targetHeight;
      const scaleW = availableWidth / targetWidth;
      
      let scale = Math.min(scaleH, scaleW);
      scale = Math.max(0.35, Math.min(1, scale)); // clamp zoom between 0.35 and 1
      setZoomScale(scale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedSlip]);

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const [slipSettings, setSlipSettings] = useState({
    title1: 'College of Tourism and Hospitality (CTH)',
    title2: 'Bangladesh Medical Tourism & Consultancy (BMTC)',
    address: '3rd Floor, Chowdhury Villa, Golpahar Moor, Chittagong, Bangladesh.',
    phone: '01819-654083 / 01619-694949',
    additionalInfo: ''
  });
  
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paidTo: '',
    paidToOther: '',
    note: '',
    receiptAttached: true,
    purpose: 'General',
    employeeId: '',
    salaryMonth: format(new Date(), 'yyyy-MM')
  });
  
  const [contributions, setContributions] = useState<Record<string, number>>({});

  const getEntitiesFromPaidTo = (paidTo: string, paidToOther: string) => {
    if (!paidTo) return [];
    if (paidTo === 'Others') {
      return [paidToOther || 'Others'];
    }
    return paidTo.split('+').map(s => s.trim().replace(/\s+/g, ' '));
  };

  const renderSingleSlipCopy = (copyType: 'Client Copy' | 'Office Copy' | null, record: any) => {
    const isPreset = !!record;
    const name = isPreset ? (record.name || 'N/A') : formData.name;
    const date = isPreset ? record.date : formData.date;
    const slipType = isPreset ? record.type : formData.type;
    const voucherMode = copyType === 'Client Copy' ? 'Client' : 'Office';
    
    let slipItems: any[] = [];
    if (isPreset) {
      if (record.items && Array.isArray(record.items) && record.items.length > 0) {
        slipItems = record.items;
      } else {
        slipItems = [{
          description: record.description || 'Various Items',
          quantity: record.quantity || 0,
          amount: record.amount || 0
        }];
      }
    } else {
      slipItems = items;
    }

    const totalVal = isPreset ? (Number(record.amount) || 0) : calculateTotal();
    const receiptAttached = isPreset ? record.receiptAttached : formData.receiptAttached;
    const paidTo = isPreset ? record.paidTo : (formData.paidTo === 'Others' ? formData.paidToOther : formData.paidTo);
    const note = isPreset ? record.note : formData.note;
    const activeContributions = isPreset ? (record.contributions || {}) : contributions;

    const isCredit = slipType === 'Credit';
    
    // Match exactly the red and green colors from the user's image
    const labelBg = isCredit ? 'bg-[#00873e]' : 'bg-[#e20613]';
    const labelText = `${voucherMode} ${slipType} Voucher`.toUpperCase();

    const displayItems = [...slipItems];
    while (displayItems.length < 16) {
      displayItems.push({ description: '', quantity: '', amount: '' });
    }

    return (
      <div 
        key={copyType || 'preview'} 
        className="w-full h-full bg-white flex flex-col font-sans box-border text-black slip-copy overflow-hidden relative border border-black p-[5px]"
      >
        {/* Header Section */}
        <div className="text-center mb-[10px]">
          <h1 className="font-bold text-[24px] leading-tight">{slipSettings.title1}</h1>
          <h2 className="font-bold text-[18px] leading-tight mt-0.5">{slipSettings.title2}</h2>
          <p className="text-[14px] leading-tight mt-1">{slipSettings.address}</p>
          <p className="text-[14px] leading-tight">{slipSettings.phone}</p>
        </div>

        {/* Top Row: Serial & Voucher Type */}
        <div className="flex w-full">
          <div className="w-[55%] border border-black h-[24px] leading-[22px] pl-[5px] text-[15px] font-bold flex items-center box-border border-b-0 border-r-0">
            {getSlipNumber(record)}
          </div>
          <div className={cn(
            "w-[45%] text-white border border-black text-center h-[24px] leading-[22px] text-[14px] font-bold flex flex-col justify-center box-border border-b-0 whitespace-nowrap",
            labelBg
          )}>
            {labelText}
          </div>
        </div>

        {/* Info Row: Name & Date */}
        <div className="flex w-full">
          <div className="w-[55%] border border-black h-[24px] leading-[22px] pl-[5px] text-[15px] font-bold flex items-center box-border border-b-0 border-r-0">
            Name : {name}
          </div>
          <div className="w-[45%] border border-black h-[24px] leading-[22px] pl-[5px] text-[15px] font-bold flex items-center box-border border-b-0">
            Date : {date}
          </div>
        </div>

        {/* Voucher Table */}
        <div className="w-full border-t border-black border-l border-r flex flex-col">
          {/* Head Row */}
          <div className="flex w-full text-center text-[16px] font-bold h-[30px] box-border border-b border-black">
            <div className="w-[10%] border-r border-black flex items-center justify-center">SL No</div>
            <div className="w-[58%] border-r border-black flex items-center justify-center">Description</div>
            <div className="w-[15%] border-r border-black flex items-center justify-center">QYT</div>
            <div className="w-[17%] flex items-center justify-center">AMOUNT</div>
          </div>

          {/* Body Area */}
          <div className="flex w-full h-[400px] relative text-[16px] font-bold border-b border-black">
             {/* Content Overlay */}
             <div className="absolute inset-0 z-10 flex flex-col pt-1">
               {displayItems.slice(0, 16).map((item: any, i: number) => (
                 <div key={i} className="flex w-full min-h-[25px] items-start pt-[2px]">
                   <div className="w-[10%] text-center px-1 break-words leading-tight">{item.description ? i + 1 : ''}</div>
                   <div className="w-[58%] px-2 break-words whitespace-pre-wrap leading-tight">{item.description}</div>
                   <div className="w-[15%] text-center px-1 break-words leading-tight">{item.quantity || ''}</div>
                   <div className="w-[17%] text-center px-1 break-words leading-tight">{item.amount ? Number(item.amount).toLocaleString() : ''}</div>
                 </div>
               ))}
             </div>
             
             {/* Column Dividers */}
             <div className="absolute inset-0 flex z-0 pointer-events-none">
                <div className="w-[10%] h-full border-r border-black shrink-0" />
                <div className="w-[58%] h-full border-r border-black shrink-0" />
                <div className="w-[15%] h-full border-r border-black shrink-0" />
                <div className="w-[17%] h-full shrink-0" />
             </div>
             
             {/* Stamp Overlay */}
             {(receiptAttached || paidTo || note || (activeContributions && Object.keys(activeContributions).length > 0)) && (
               <div className="absolute left-[12%] bottom-[20px] w-[54%] border-[2px] border-dashed border-[#1d4d9c] text-[#1d4d9c] p-[8px] text-[12px] bg-transparent -rotate-[10deg] z-20">
                 {receiptAttached && (
                   <span className="font-bold block mb-1">Receipt / Voucher Attached</span>
                 )}
                 {paidTo && (
                   <span className="block font-bold">{isCredit ? 'Received From :' : 'Paid to :'} {paidTo}</span>
                 )}
                 {activeContributions && Object.keys(activeContributions).length > 0 && (
                   <div className="block font-bold">
                     {Object.entries(activeContributions).map(([entity, amt]: any) => (
                       <div key={entity}>{entity} : {Number(amt || 0).toLocaleString()}৳</div>
                     ))}
                   </div>
                 )}
                 {note && (
                   <span className="block mt-1 font-bold">Note: {note}</span>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Word Row */}
        <div className="flex w-full">
          <div className="w-[83%] border border-black h-[24px] leading-[22px] pl-[5px] font-bold text-[14px] flex items-center box-border border-t-0 border-r-0 truncate whitespace-nowrap">
            In Word : {numberToWords(totalVal || 0)}
          </div>
          <div className="w-[17%] border border-black h-[24px] leading-[22px] text-center font-bold text-[15px] flex items-center justify-center box-border border-t-0">
            {totalVal > 0 ? Number(totalVal || 0).toLocaleString() : '0'}
          </div>
        </div>

        {/* Signature Area */}
        <div className="absolute bottom-[5px] left-[30px] right-[30px] flex justify-between text-[16px]">
          <div className="w-[180px] text-center font-bold">
            <div className="border-t-[2px] border-black mb-[5px] w-full" />
            Raised By
          </div>
          <div className="w-[180px] text-center font-bold">
            <div className="border-t-[2px] border-black mb-[5px] w-full" />
            Approved By
          </div>
        </div>
      </div>
    );
  };
  
  const [items, setItems] = useState([
    { description: '', quantity: 0, amount: 0 }
  ]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hrmSettings, setHrmSettings] = useState<any>(null);

  const calculateEmployeeNetSalary = (empId: number, monthStr: string): number => {
    if (!monthStr) return 0;
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return 0;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const totalDays = endDate.getDate(); // Exact number of days in the month

    const empAttendances = attendances.filter(a => {
      const aDate = new Date(a.date);
      return a.employeeId === empId && aDate >= startDate && aDate <= endDate;
    });

    const empLeaves = leaves.filter(l => {
      const lDate = new Date(l.createdAt || l.startDate);
      return l.employeeId === empId && l.status === 'Approved' && lDate >= startDate && lDate <= endDate;
    });

    const present = empAttendances.filter(a => a.status === 'Present').length;
    const late = empAttendances.filter(a => a.status === 'Late').length;
    const absent = empAttendances.filter(a => a.status === 'Absent').length;
    
    const leaveFromAttendance = empAttendances.filter(a => a.status === 'Leave').length;
    const leaveCount = empLeaves.length + leaveFromAttendance;

    const empRecord = employees.find(e => e.id === empId);
    let basicSalary = 15000;
    let advanceSalary = 0;
    let customBonus = -1;

    if (empRecord) {
      basicSalary = empRecord.basicSalary !== undefined ? Number(empRecord.basicSalary) : 15000;
      advanceSalary = empRecord.advanceSalary !== undefined ? Number(empRecord.advanceSalary) : 0;
      customBonus = empRecord.customBonus !== undefined ? Number(empRecord.customBonus) : -1;
    }

    const medicalPercent = hrmSettings?.medicalPercentage !== undefined ? Number(hrmSettings.medicalPercentage) : 8;
    const housingPercent = hrmSettings?.housingPercentage !== undefined ? Number(hrmSettings.housingPercentage) : 25;
    const festivalPercent = hrmSettings?.festivalPercentage !== undefined ? Number(hrmSettings.festivalPercentage) : 65;
    const eidFitrMonth = hrmSettings?.eidFitrMonth !== undefined ? hrmSettings.eidFitrMonth : '2026-03';
    const eidAdhaMonth = hrmSettings?.eidAdhaMonth !== undefined ? hrmSettings.eidAdhaMonth : '2026-05';

    // Dynamic percentages configured by system
    const medical = basicSalary * (medicalPercent / 100);
    const housing = basicSalary * (housingPercent / 100);
    
    let festival = 0;
    if (customBonus >= 0) {
      festival = customBonus;
    } else if (monthStr === eidFitrMonth || monthStr === eidAdhaMonth) {
      festival = basicSalary * (festivalPercent / 100);
    }

    // Fine grain deductions (Absent penalty = basicSalary/days, Late penalty = 0.25 * basicSalary/days)
    const dailyRate = basicSalary / totalDays;
    const deductions = (absent * dailyRate) + (late * (dailyRate * 0.25));
    
    // Sum of approved Advance Vouchers from receipts
    const voucherAdvances = receipts
      .filter(r => r.employeeId === empId && r.purpose === 'Advance' && r.status === 'approved' && r.salaryMonth === monthStr)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totalAdvances = advanceSalary + voucherAdvances;
    const netSalary = basicSalary + medical + housing + festival - totalAdvances - deductions;

    return Math.max(0, Math.round(netSalary));
  };

  const fetchReceipts = () => {
    fetch('/management/api/receipts')
      .then(res => res.json())
      .then(data => setReceipts(data));
  };

  const fetchSlipSettings = () => {
    fetch('/management/api/slip-settings')
      .then(res => res.json())
      .then(data => setSlipSettings(data))
      .catch(err => console.error("Error fetching slip settings", err));
  };

  useEffect(() => {
    fetchReceipts();
    fetchSlipSettings();
    
    fetch('/management/api/employees').then(res => res.json()).then(data => setEmployees(data || [])).catch(() => {});
    fetch('/management/api/attendances').then(res => res.json()).then(data => setAttendances(data || [])).catch(() => {});
    fetch('/management/api/leave-requests').then(res => res.json()).then(data => setLeaves(data || [])).catch(() => {});
    fetch('/management/api/hrm-settings').then(res => res.json()).then(data => setHrmSettings(data || null)).catch(() => {});
  }, []);

  // Autofill items & name when purpose, employeeId, or salaryMonth shifts inside Debit mode
  useEffect(() => {
    if (formData.type === 'Debit' && formData.purpose === 'Salary' && formData.employeeId) {
      const empId = Number(formData.employeeId);
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        const calculatedSalary = calculateEmployeeNetSalary(empId, formData.salaryMonth);
        const alreadyPaidSalary = receipts
          .filter(r => r.employeeId === empId && r.purpose === 'Salary' && r.status === 'approved' && r.salaryMonth === formData.salaryMonth && r.id !== editingReceiptId)
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        
        const suggestedPay = Math.max(0, calculatedSalary - alreadyPaidSalary);

        setFormData(prev => {
          if (prev.name !== emp.name) {
            return { ...prev, name: emp.name };
          }
          return prev;
        });

        setItems([{
          description: `Base Salary & Allowances payout for ${formData.salaryMonth} for ${emp.name}`,
          quantity: 1,
          amount: suggestedPay
        }]);
      }
    } else if (formData.type === 'Debit' && formData.purpose === 'Advance' && formData.employeeId) {
      const empId = Number(formData.employeeId);
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        setFormData(prev => {
          if (prev.name !== emp.name) {
            return { ...prev, name: emp.name };
          }
          return prev;
        });

        setItems([{
          description: `Advance Salary Payment for ${formData.salaryMonth} for ${emp.name}`,
          quantity: 1,
          amount: 0 // user enters their custom advance taken amount
        }]);
      }
    }
  }, [formData.purpose, formData.employeeId, formData.salaryMonth, formData.type, editingReceiptId, employees, receipts]);

  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (previewContainerRef.current) {
      const { width, height } = previewContainerRef.current.getBoundingClientRect();
      // A4 landscape is roughly 1122px x 794px at 96dpi
      const a4Width = 1122;
      const a4Height = 794;
      
      // Calculate padding (2rem = 32px on each side)
      const availableWidth = width - 64; 
      const availableHeight = height - 64;
      
      const scaleX = availableWidth / a4Width;
      const scaleY = availableHeight / a4Height;
      
      // Take the smaller scale to ensure it fits both horizontally and vertically, cap at 1
      let finalScale = Math.min(scaleX, scaleY);
      setPreviewScale(finalScale);
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Recalculate scale when modal states change to catch the mounted ref
  useEffect(() => {
    if (isModalOpen || selectedSlip) {
      // Use setTimeout to ensure the DOM has updated and layout is calculated
      setTimeout(updateScale, 50);
    }
  }, [isModalOpen, selectedSlip, updateScale]);

  const getSlipNumber = (record: any) => {
    if (record && record.id) {
      return `${record.id}`.padStart(4, '0');
    }
    const nextId = receipts.length + 1;
    return `${nextId}`.padStart(4, '0');
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const GlobalPrintStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page {
          size: A4 landscape;
          margin: 0;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * {
          visibility: hidden;
        }
        #printable-slip, #printable-slip * {
          visibility: visible;
        }
        #printable-slip {
          position: fixed !important;
          left: 5mm !important;
          top: 8mm !important;
          transform: scale(0.9) !important;
          transform-origin: top left !important;
          box-shadow: none !important;
          margin: 0 !important;
          width: 1200px !important;
          height: 800px !important;
          background-color: transparent !important;
          padding: 20px !important;
        }
      }
    `}} />
  );

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      setItems([{ description: '', quantity: 0, amount: 0 }]);
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleEditRecord = (record: any) => {
    setEditingReceiptId(record.id);
    setFormData({
      type: record.type || 'Requisition',
      name: record.name || '',
      date: record.date ? format(new Date(record.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paidTo: record.paidTo === 'Others' ? 'Others' : record.paidTo || '',
      paidToOther: record.paidToOther || '', // If we were to infer, but let's just use what's returned
      note: record.note || '',
      receiptAttached: record.receiptAttached ?? true,
      purpose: record.purpose || 'General',
      employeeId: record.employeeId !== undefined && record.employeeId !== null ? String(record.employeeId) : '',
      salaryMonth: record.salaryMonth || format(new Date(), 'yyyy-MM')
    });
    setContributions(record.contributions || {});
    setItems(record.items && record.items.length > 0 ? record.items : [{ description: '', quantity: 0, amount: 0 }]);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id: number) => {
    const pass = prompt('Enter Super Admin Password to confirm deletion:');
    if (pass !== 'Welcome@123') {
      if (pass !== null) alert('Incorrect password. Deletion cancelled.');
      return;
    }
    try {
      const res = await fetch(`/management/api/receipts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleNewReceipt = () => {
    setEditingReceiptId(null);
    setFormData({
      type: '',
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paidTo: '',
      paidToOther: '',
      note: '',
      receiptAttached: true,
      purpose: 'General',
      employeeId: '',
      salaryMonth: format(new Date(), 'yyyy-MM')
    });
    setContributions({});
    setItems([{ description: '', quantity: 0, amount: 0 }]);
    setIsModalOpen(true);
  };

  const handleSaveRequisition = async () => {
    try {
      if (!formData.type || (formData.type !== 'Debit' && formData.type !== 'Credit')) {
        alert('Please choose whether this transaction is Debit or Credit first.');
        return;
      }
      const hasPaidTo = !!formData.paidTo;
      const entities = hasPaidTo ? getEntitiesFromPaidTo(formData.paidTo, formData.paidToOther) : [];
      
      if (hasPaidTo) {
        for (const ent of entities) {
          const val = contributions[ent];
          if (val === undefined || val === '' || Number(val) <= 0) {
            alert(`Please clarify the contribution amount for ${ent}. An amount is required.`);
            return;
          }
        }
      }

      // Filter contributions to only active entities
      const activeContributions: Record<string, number> = {};
      entities.forEach(ent => {
        activeContributions[ent] = Number(contributions[ent]) || 0;
      });

      const payload = {
        type: formData.type,
        name: formData.name,
        date: formData.date,
        description: items.map(i => i.description).join(', ') || 'Various Items',
        quantity: items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0,
        amount: calculateTotal(),
        items: items,
        paidTo: formData.paidTo === 'Others' ? formData.paidToOther : formData.paidTo,
        note: formData.note,
        receiptAttached: formData.receiptAttached,
        contributions: activeContributions,
        employeeId: formData.type === 'Debit' && formData.employeeId ? Number(formData.employeeId) : null,
        purpose: formData.type === 'Debit' ? formData.purpose : 'General',
        salaryMonth: formData.type === 'Debit' && formData.purpose !== 'General' ? formData.salaryMonth : null,
        ...(editingReceiptId ? {} : { status: formData.type === 'Credit' ? 'approved' : 'pending' })
      };

      const url = editingReceiptId ? `/management/api/receipts/${editingReceiptId}` : '/management/api/receipts';
      const method = editingReceiptId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const savedRecord = await res.json();
        fetchReceipts();

        setIsModalOpen(false);
        setEditingReceiptId(null);
        setFormData({
          type: '',
          name: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          paidTo: '',
          paidToOther: '',
          note: '',
          receiptAttached: true,
          purpose: 'General',
          employeeId: '',
          salaryMonth: format(new Date(), 'yyyy-MM')
        });
        setContributions({});
        setItems([{ description: '', quantity: 0, amount: 0 }]);

        // Open the generated slip and trigger print
        setSelectedSlip(savedRecord);
        setTimeout(() => {
          handlePrint();
        }, 500);
      }
    } catch (error) {
      console.error('Error saving requisition:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/management/api/receipts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error approving requisition:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`/management/api/receipts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error rejecting requisition:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Receipts & Vouchers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage office receipts and voucher generation.</p>
        </div>
        <button 
          onClick={handleNewReceipt}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> New Receipt
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 lg:space-x-12 overflow-x-auto">
          <button 
            type="button"
            onClick={() => setActiveTab('received')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === 'received' ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Received voucher
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('pending')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === 'pending' ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Pending Requisition
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('approved')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === 'approved' ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Approved Requisition
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === 'rejected' ? "border-red-500 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Rejected Requisition
          </button>
        </nav>
      </div>

      {activeTab === 'received' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-800 hidden sm:block">Recent Receipts</h2>
            <div className="relative max-w-sm w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search records..." className="w-full sm:w-64 pl-9 pr-4 py-1.5 text-xs border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="p-4">ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4 flex-1 text-right">Amount</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.filter(r => r.status === 'received' || !r.status).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-medium">#{getSlipNumber(req)}</td>
                    <td className="p-4 text-slate-500">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{req.description || req.title}</div>
                    </td>
                    <td className="p-4 text-slate-900">{req.quantity || 0}</td>
                    <td className="p-4 font-bold text-slate-900 text-right">৳{(Number(req.amount) || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedSlip(req); setTimeout(() => handlePrint(), 500); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Print"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <button 
                          onClick={() => handleEditRecord(req)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(req.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedSlip(req)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.filter(r => r.status === 'received' || !r.status).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No received vouchers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Pending Requisitions</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="p-4">ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Raised By</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.filter(r => r.status === 'pending').map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-medium">#{getSlipNumber(req)}</td>
                    <td className="p-4 text-slate-500">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="p-4 font-medium">{req.name || 'Unknown'}</td>
                    <td className="p-4">{req.description}</td>
                    <td className="p-4 font-bold text-blue-600">৳{(Number(req.amount) || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedSlip(req); setTimeout(() => handlePrint(), 500); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Print"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <button 
                          onClick={() => handleEditRecord(req)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(req.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedSlip(req)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.filter(r => r.status === 'pending').length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <CheckSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p>No pending requisitions.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Approved Requisitions</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="p-4">ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-right">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.filter(r => r.status === 'approved').map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-medium">#{getSlipNumber(req)}</td>
                    <td className="p-4 text-slate-500">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        req.type === 'Credit' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {req.type || 'Debit'}
                      </span>
                    </td>
                    <td className="p-4">{req.description}</td>
                    <td className="p-4 font-bold text-slate-900">৳{(Number(req.amount) || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-green-600 font-bold">
                        <button 
                          onClick={() => { setSelectedSlip(req); setTimeout(() => handlePrint(), 500); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Print"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <button 
                          onClick={() => handleEditRecord(req)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(req.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedSlip(req)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          View
                        </button>
                        <span className="flex items-center ml-2 border-l px-2 border-green-200">
                          <Check className="w-4 h-4 mr-1 text-emerald-500" />
                          APPROVED
                        </span>
                        <button 
                          onClick={() => handleReject(req.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.filter(r => r.status === 'approved').length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <Check className="w-8 h-8 text-green-200 mb-2" />
                        <p>No approved requisitions.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rejected' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Rejected Requisitions</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="p-4">ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-right">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.filter(r => r.status === 'rejected').map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-medium">#{getSlipNumber(req)}</td>
                    <td className="p-4 text-slate-500">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase truncate max-w-[80px]",
                        req.type === 'Credit' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {req.type || 'Debit'}
                      </span>
                    </td>
                    <td className="p-4">{req.description}</td>
                    <td className="p-4 font-bold text-slate-900">৳{(Number(req.amount) || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-red-600 font-bold">
                        <button 
                          onClick={() => { setSelectedSlip(req); setTimeout(() => handlePrint(), 500); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Print"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(req.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedSlip(req)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          View
                        </button>
                        <span className="flex items-center ml-2 border-l pl-2 border-red-200">
                          <X className="w-4 h-4 mr-1 text-red-500" />
                          REJECTED
                        </span>
                        <button 
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ml-1"
                        >
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.filter(r => r.status === 'rejected').length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <X className="w-8 h-8 text-red-200 mb-2" />
                        <p>No rejected requisitions.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-white z-50 flex overflow-hidden">
          <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-black hover:text-red-500 z-50">
            <X className="w-10 h-10" />
          </button>
          
          <div className="flex flex-1 w-full h-full overflow-hidden">
            {/* Left Form */}
            <div className="w-[35%] min-w-[400px] max-w-[550px] p-6 lg:p-8 overflow-y-auto flex flex-col bg-white border-r z-10 shadow-[4px_0_24px_rgba(0,0,0,0.05)] relative shrink-0">
              <h1 className="text-3xl font-bold mb-6 text-center text-black">Requisition</h1>

              <div className="mb-6 flex flex-col items-center gap-3">
                <label className="text-lg font-bold text-black uppercase tracking-wider">Select Requisition Type</label>
                <div className="flex gap-4 w-full max-w-sm">

                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'Debit'})}
                    className={cn(
                      "flex-1 py-4 px-6 rounded-xl border-3 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm select-none",
                      formData.type === 'Debit' 
                        ? "border-red-600 bg-red-50 text-red-700 font-extrabold scale-102 ring-2 ring-red-300"
                        : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="text-2xl font-black">DEBIT</span>
                    <span className="text-[11px] font-semibold opacity-80 uppercase tracking-widest">(EXPENSE / OUTFLOW)</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'Credit'})}
                    className={cn(
                      "flex-1 py-4 px-6 rounded-xl border-3 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm select-none",
                      formData.type === 'Credit' 
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-extrabold scale-102 ring-2 ring-emerald-300"
                        : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="text-2xl font-black">CREDIT</span>
                    <span className="text-[11px] font-semibold opacity-80 uppercase tracking-widest">(DEPOSIT / INFLOW)</span>
                  </button>
                </div>
              </div>

              {formData.type && (
                <>
                  {formData.type === 'Debit' && (
                    <div className="mb-6 p-4 border border-dashed border-red-300 rounded-xl bg-red-50/20">
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-black uppercase tracking-wider">Debit Voucher Purpose</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['General', 'Salary', 'Advance'].map(purp => {
                              const labels: Record<string, string> = {
                                'General': 'General Expense',
                                'Salary': 'Employee Salary',
                                'Advance': 'Employee Advance'
                              };
                              return (
                                <button
                                  key={purp}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, purpose: purp, employeeId: purp === 'General' ? '' : formData.employeeId })}
                                  className={cn(
                                    "py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center truncate",
                                    formData.purpose === purp
                                      ? "bg-red-600 text-white border-red-600 shadow-sm font-black"
                                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  {labels[purp]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {formData.purpose !== 'General' && (
                          <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                            <div>
                              <label className="block text-[11px] font-bold mb-1 text-slate-900 uppercase">Employee</label>
                              <select
                                value={formData.employeeId}
                                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                className="w-full bg-white border border-gray-400 h-10 px-2 text-xs font-bold text-black focus:ring-0 focus:outline-none focus:border-black rounded"
                              >
                                <option value="">Select Employee...</option>
                                {employees.map(e => (
                                  <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold mb-1 text-slate-900 uppercase">Salary Month</label>
                              <input
                                type="month"
                                value={formData.salaryMonth}
                                onChange={e => setFormData({ ...formData, salaryMonth: e.target.value })}
                                className="w-full bg-white border border-gray-400 h-10 px-2 text-xs font-semibold text-black focus:ring-0 focus:outline-none focus:border-black rounded"
                              />
                            </div>
                          </div>
                        )}

                        {formData.purpose !== 'General' && formData.employeeId && (
                          <div className="text-[11px] border-t border-red-100 pt-2 text-slate-700 font-medium space-y-1 bg-white p-2 rounded shadow-sm">
                            <div className="flex justify-between items-center text-rose-700 font-extrabold pb-0.5">
                              <span>Automatic Payroll Engine Lookup:</span>
                              <span className="bg-rose-100 px-1 rounded text-[9px] uppercase font-bold text-rose-800">Linked</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Target Month:</span>
                              <span className="font-bold font-mono">{formData.salaryMonth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Computed Base + Net Salary:</span>
                              <span className="font-black text-rose-600">
                                ৳{calculateEmployeeNetSalary(Number(formData.employeeId), formData.salaryMonth).toLocaleString()}
                              </span>
                            </div>
                            {formData.purpose === 'Salary' && (
                              <>
                                <div className="flex justify-between text-yellow-600">
                                  <span>Previously Paid Salary for Month:</span>
                                  <span>
                                    ৳{receipts
                                      .filter(r => r.employeeId === Number(formData.employeeId) && r.purpose === 'Salary' && r.status === 'approved' && r.salaryMonth === formData.salaryMonth && r.id !== editingReceiptId)
                                      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
                                      .toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-bold text-blue-700">
                                  <span>Recommended Pending Payout:</span>
                                  <span className="font-sans font-black">
                                    ৳{Math.max(0, calculateEmployeeNetSalary(Number(formData.employeeId), formData.salaryMonth) - 
                                      receipts
                                        .filter(r => r.employeeId === Number(formData.employeeId) && r.purpose === 'Salary' && r.status === 'approved' && r.salaryMonth === formData.salaryMonth && r.id !== editingReceiptId)
                                        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-8 mb-6">
                    <div className="flex-1">
                      <label className="block text-xl font-bold mb-2 text-black">Name</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[#dfdfdf] border border-gray-400 h-10 px-2 text-black focus:ring-0 focus:outline-none focus:border-black" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xl font-bold mb-2 text-black">Date</label>
                      <input 
                        type="text" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-[#dfdfdf] border border-gray-400 h-10 px-2 text-black focus:ring-0 focus:outline-none focus:border-black" 
                      />
                    </div>
                  </div>

                  <div className="mb-8 relative">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xl font-bold text-black">Description</label>
                  <button 
                    type="button" 
                    onClick={handleAddItem} 
                    className="text-[#00ff00] font-bold text-[16px] hover:text-green-600 transition-colors"
                  >
                    Add Another
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 mb-2 relative">
                    <div className="flex-1 relative flex items-center">
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        className="w-full bg-[#dfdfdf] border border-gray-400 h-10 px-2 pr-8 text-black focus:ring-0 focus:outline-none focus:border-black" 
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="absolute right-2 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove description"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Qty"
                      title="Quantity"
                      value={item.quantity === '' || item.quantity === undefined ? '' : item.quantity}
                      onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-28 bg-[#dfdfdf] border border-gray-400 h-10 px-2 text-black text-center focus:ring-0 focus:outline-none focus:border-black" 
                    />
                    <input 
                      type="number" 
                      placeholder="Amount"
                      title="Amount"
                      value={item.amount === '' || item.amount === undefined ? '' : item.amount}
                      onChange={e => handleItemChange(index, 'amount', e.target.value)}
                      className="w-36 bg-[#dfdfdf] border border-gray-400 h-10 px-2 text-black text-right focus:ring-0 focus:outline-none focus:border-black" 
                    />
                  </div>
                ))}
              </div>

              {/* Paid To, Note, Receipt Attached sections moved back to bottom of form */}
              {formData.type && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex gap-8 mb-6 animate-fadeIn">
                    <div className="flex-1">
                      <label className="block text-xl font-bold mb-2 text-black">{formData.type === 'Credit' ? 'Received From / Received By' : 'Paid To'}</label>
                      <select 
                        value={formData.paidTo}
                        onChange={e => setFormData({...formData, paidTo: e.target.value})}
                        className="w-full bg-[#dfdfdf] border border-gray-400 h-10 px-2 text-black focus:ring-0 focus:outline-none focus:border-black font-bold" 
                      >
                        <option value="">Select option...</option>
                        <option value="Fund">Fund</option>
                        <option value="Salim Sir">Salim Sir</option>
                        <option value="Nazim Sir">Nazim Sir</option>
                        <option value="Salim Sir + Nazim Sir">Salim Sir + Nazim Sir</option>
                        <option value="Salim Sir + Fund">Salim Sir + Fund</option>
                        <option value="Nazim Sir + Fund">Nazim Sir + Fund</option>
                        <option value="Salim Sir + Nazim Sir + Fund">Salim Sir + Nazim Sir + Fund</option>
                        <option value="Others">Others</option>
                      </select>
                      {formData.paidTo === 'Others' && (
                        <input
                          type="text"
                          placeholder={formData.type === 'Credit' ? 'Received From...' : 'Beneficiary name'}
                          value={formData.paidToOther}
                          onChange={e => setFormData({...formData, paidToOther: e.target.value})}
                          className="w-full bg-[#dfdfdf] border border-gray-400 h-10 px-2 mt-4 text-black focus:ring-0 focus:outline-none focus:border-black font-bold" 
                        />
                      )}
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-xl font-bold mb-2 text-black">Note / Particulars</label>
                    <textarea 
                      value={formData.note}
                      onChange={e => setFormData({...formData, note: e.target.value})}
                      placeholder="Add any extra information or remarks here..."
                      className="w-full bg-[#dfdfdf] border border-gray-400 min-h-[80px] p-2 text-black focus:ring-0 focus:outline-none focus:border-black resize-none font-medium"
                    ></textarea>
                  </div>

                  <div className="flex items-center gap-4 mb-4 animate-fadeIn">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.receiptAttached}
                        onChange={e => setFormData({...formData, receiptAttached: e.target.checked})}
                        className="w-8 h-8 rounded border-gray-400 text-black focus:ring-0"
                      />
                      <span className="text-2xl font-bold text-black group-hover:text-red-500 transition-colors uppercase select-none">Receipt Attached</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Redundant Paid To and Note sections moved to top */}

              {formData.paidTo && (
                <div className="bg-slate-100 border border-slate-350 p-5 rounded-lg mb-8 animate-fadeIn text-black">
                  <h4 className="text-lg font-bold mb-2">Contribution Breakdown / Amounts</h4>
                  <p className="text-xs text-stone-600 mb-4">
                    Specify the exact amount contributed/distributed for each person. *All fields are required.
                  </p>
                  <div className="space-y-3">
                    {getEntitiesFromPaidTo(formData.paidTo, formData.paidToOther).map((entity) => (
                      <div key={entity} className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-800">{entity}</span>
                        <div className="relative w-48 font-sans">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">৳</span>
                          <input 
                            type="number"
                            placeholder="Amount"
                            required
                            value={contributions[entity] === undefined ? '' : contributions[entity]}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setContributions({ ...contributions, [entity]: val as number });
                            }}
                            className="w-full bg-white border border-gray-400 h-10 pl-7 pr-2 font-mono text-right text-black focus:ring-0 focus:outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {getEntitiesFromPaidTo(formData.paidTo, formData.paidToOther).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Total Contribution Value:</span>
                      <span className="font-mono font-black text-slate-900 bg-slate-200/50 px-2 py-0.5 rounded">
                        ৳{Object.values(contributions).reduce<number>((sum, val) => sum + (Number(val) || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Redundant Receipt Attached section moved to top */}

              <div className="flex justify-start">
                <button onClick={handleSaveRequisition} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-lg shadow-sm">
                  {formData.type === 'Credit' ? 'Add Money' : 'Send Requisition'}
                </button>
              </div>
                </>
              )}
            </div>

            {/* Right Slip Preview */}
            <div 
              ref={previewContainerRef}
              className="flex-1 overflow-hidden bg-slate-200 flex justify-center items-center relative"
            >
               <div 
                  className="shadow-2xl bg-white flex flex-row items-center justify-center box-border pointer-events-none origin-center transition-transform duration-200"
                  style={{
                    width: '297mm',
                    height: '210mm',
                    transform: `scale(${previewScale})`,
                    padding: '8mm',
                    gap: '5mm',
                  }}
                >
                  <div style={{ width: '135mm', height: '190mm', display: 'flex' }}>
                    {renderSingleSlipCopy('Office Copy', null)}
                  </div>
                  <div style={{ width: '135mm', height: '190mm', display: 'flex' }}>
                    {renderSingleSlipCopy('Client Copy', null)}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected slip display modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-[95vw] w-full flex flex-col items-center max-h-[95vh] overflow-hidden">
            <div className="flex justify-between items-center w-full border-b pb-3 mb-2 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Receipt / Requisition Slip</h3>
              <button 
                onClick={() => setSelectedSlip(null)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Non-scrolling Scale Container for the A4 Slip */}
            <div ref={previewContainerRef} className="w-full flex-1 flex items-center justify-center min-h-[60vh] py-4 bg-slate-200 border border-slate-300 rounded-xl relative overflow-hidden">
                {/* Slip Core */}
                <div 
                  ref={printRef} 
                  id="printable-slip" 
                  className="printable-slip text-black font-sans box-border flex flex-row relative origin-center max-w-none transition-transform pointer-events-none justify-center"
                  style={{
                    transform: `scale(${previewScale || 0.8})`,
                    width: '1200px',
                    height: '800px', // 760 + 40 padding
                    margin: 'auto',
                    gap: '30px',
                    display: 'flex',
                    background: '#dcdcdc',
                    padding: '20px'
                  }}
                >
                  <GlobalPrintStyles />
                  <div style={{ width: '565px', height: '760px', display: 'flex' }}>
                    {renderSingleSlipCopy('Office Copy', selectedSlip)}
                  </div>
                  <div style={{ width: '565px', height: '760px', display: 'flex' }}>
                    {renderSingleSlipCopy('Client Copy', selectedSlip)}
                  </div>
                </div>
            </div>

            {/* Print / Action Buttons */}
            <div className="flex flex-col gap-2 mt-2 w-full shrink-0 border-t pt-2">
              <div className="flex gap-3 w-full justify-end">
                <button 
                  onClick={() => setSelectedSlip(null)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-semibold transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handlePrint} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Slip
                </button>
              </div>
              <p className="text-[11px] text-amber-700 text-center w-full bg-amber-50 py-1.5 px-2 rounded-lg border border-amber-200">
                নোট: প্রিন্ট অপশন না আসবে, অনুগ্রহ করে ওপরের ডানদিকের <strong>"Open in a new tab"</strong> বাটনে ক্লিক করে নতুন ট্যাবে ট্রাই করুন।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

