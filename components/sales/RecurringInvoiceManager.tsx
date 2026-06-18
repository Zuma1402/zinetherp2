import React from 'react';
import { RotateCw, Plus, Calendar, Clock } from 'lucide-react';
import { Ledger, InventoryItem } from '../../types';

interface Props {
  ledgers: Ledger[];
  items: InventoryItem[];
}

const RecurringInvoiceManager: React.FC<Props> = ({ ledgers, items }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Recurring Invoices</h2>
           <p className="text-gray-500 text-sm">Automate your monthly subscriptions or contracts</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm font-bold text-sm">
            <Plus size={18} /> New Schedule
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <RotateCw size={40} className="text-indigo-400" />
           </div>
           <h3 className="text-lg font-bold text-gray-800 mb-2">No Recurring Schedules Found</h3>
           <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm">Create a recurring template to automatically generate invoices every week, month, or year for your repeat customers.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                   <Calendar size={20} className="text-indigo-500" />
                   <div className="text-left"><p className="text-[10px] font-bold text-gray-400 uppercase">Step 1</p><p className="text-xs font-bold text-gray-700">Set Interval</p></div>
               </div>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                   <Clock size={20} className="text-indigo-500" />
                   <div className="text-left"><p className="text-[10px] font-bold text-gray-400 uppercase">Step 2</p><p className="text-xs font-bold text-gray-700">Pick Start Date</p></div>
               </div>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                   <RotateCw size={20} className="text-indigo-500" />
                   <div className="text-left"><p className="text-[10px] font-bold text-gray-400 uppercase">Step 3</p><p className="text-xs font-bold text-gray-700">Auto-Generate</p></div>
               </div>
           </div>
      </div>
    </div>
  );
};

export default RecurringInvoiceManager;