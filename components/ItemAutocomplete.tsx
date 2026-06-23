import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ArrowRight } from 'lucide-react';
import { InventoryItem } from '../types';

interface ItemAutocompleteProps {
  items: InventoryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  priceType?: 'rate' | 'costPrice';
  className?: string;
}

const ItemAutocomplete: React.FC<ItemAutocompleteProps> = ({ 
  items = [], 
  selectedId, 
  onSelect, 
  placeholder = "Search items...", 
  priceType = 'rate',
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter(i => 
    i && i.name && i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🎯 FIX: Data pipeline sync effect locked tightly during input mutations
  useEffect(() => {
    if (!isOpen) {
      const item = items.find(i => i.id === selectedId);
      setSearchTerm(item ? item.name : '');
    }
  }, [selectedId, items, isOpen]); // Controlled state parameters tracking

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
        if (e.key === 'ArrowDown') setIsOpen(true);
        return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          onSelect(filteredItems[highlightedIndex].id);
          setSearchTerm(filteredItems[highlightedIndex].name); // Force lock title visual name
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div className="relative group">
        <input
          type="text"
          className="w-full p-2.5 pl-9 border-2 border-transparent bg-gray-50/50 hover:bg-white hover:border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 ring-indigo-50 outline-none transition-all text-sm font-bold text-gray-900 shadow-sm"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => { 
            setSearchTerm(e.target.value); 
            setIsOpen(true);
            setHighlightedIndex(0);
            if (e.target.value === '') onSelect('');
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <Search size={16} className={`absolute left-3 top-3.5 transition-colors ${isOpen ? 'text-indigo-500' : 'text-gray-300'}`} />
      </div>

      {isOpen && (searchTerm || filteredItems.length > 0) && (
        <ul className="absolute z-[999] w-full mt-2 bg-white border border-indigo-50 rounded-2xl shadow-2xl max-h-72 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const price = priceType === 'rate' ? item.rate : (item.costPrice || 0);
              const isLowStock = item.currentStock <= (item.minStockLevel || 0);
              
              return (
                <li 
                  key={item.id} 
                  className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-all border-l-4
                    ${idx === highlightedIndex ? 'bg-indigo-50 border-indigo-500 text-indigo-950' : 'hover:bg-gray-50 border-transparent text-gray-700'}
                  `} 
                  onClick={() => { 
                    onSelect(item.id); 
                    setSearchTerm(item.name); // Set input field directly on pointer down click
                    setIsOpen(false); 
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div className="flex flex-col">
                    <span className="font-black text-gray-800 text-sm">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      {priceType === 'rate' ? 'M.R.P' : 'Cost'}: {price.toLocaleString()} 
                      <ArrowRight size={8} /> 
                      SKU: {item.id.slice(0, 5)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border shadow-sm
                        ${isLowStock ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                    `}>
                        {item.currentStock} {item.unit || 'pcs'}
                    </span>
                    {isLowStock && <div className="text-[8px] font-black text-rose-400 uppercase mt-1">Refill Req.</div>}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-6 py-10 text-center text-gray-400 select-none">
              <Package size={24} className="mx-auto mb-2 opacity-20 text-indigo-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest italic text-gray-400">Item not in Master</p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ItemAutocomplete;