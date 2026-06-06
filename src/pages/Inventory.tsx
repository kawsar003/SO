import React from 'react';
import { Search, Plus, Package } from 'lucide-react';

const autoInventory = [
  { id: 'PRD-001', name: 'Office Chairs', category: 'Furniture', stock: 45, max: 50, status: 'In Stock' },
  { id: 'PRD-002', name: 'Printer Paper (A4)', category: 'Supplies', stock: 5, max: 100, status: 'Low Stock' },
  { id: 'PRD-003', name: 'MacBook Pro 16"', category: 'Electronics', stock: 12, max: 15, status: 'In Stock' },
  { id: 'PRD-004', name: 'Wireless Mouse', category: 'Electronics', stock: 0, max: 20, status: 'Out of Stock' },
];

export function Inventory() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage office stock, supplies, and low stock alerts.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden flex-1">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search inventory..." className="w-full pl-9 pr-4 py-1.5 text-xs border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <th className="p-4">Item ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {autoInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-medium text-slate-500">{item.id}</td>
                  <td className="p-4 font-semibold text-slate-900 flex items-center">
                    <Package className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    {item.name}
                  </td>
                  <td className="p-4 text-slate-600">{item.category}</td>
                  <td className="p-4 text-right">
                    <div className="font-bold text-slate-900">{item.stock}</div>
                    <div className="text-[10px] text-slate-400">/ {item.max}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${item.stock === 0 ? 'bg-red-100 text-red-700' : item.stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 font-semibold hover:underline">Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
