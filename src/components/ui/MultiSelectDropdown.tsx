import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MultiSelectDropdown({ values, onChange, options, placeholder }: { values: string[], onChange: (vals: string[]) => void, options: string[], placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    const optStr = String(opt);
    if (values.includes(optStr)) {
      onChange(values.filter(v => v !== optStr));
    } else {
      onChange([...values, optStr]);
    }
  };

  const displayValue = values.length === 0 
    ? placeholder 
    : values.length === 1 
      ? String(values[0]) 
      : `${String(values[0])} (+${values.length - 1})`;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between px-2 py-1.5 text-sm transition-colors min-w-[120px] max-w-[200px]",
          values.length > 0 ? "text-brand-primary font-medium" : "text-zinc-600 hover:text-zinc-900"
        )}
      >
        <span className="truncate flex-1 text-left">{displayValue}</span>
        <ChevronDown className="w-4 h-4 ml-1 opacity-50 shrink-0" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg overflow-hidden flex flex-col text-sm">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 border border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto px-2 pb-2 max-h-64 flex-1 custom-scrollbar">
            <button
              className="w-full text-left px-2 py-1.5 rounded-md bg-zinc-100 text-zinc-900 font-medium mb-1"
              onClick={() => { onChange([]); setIsOpen(false); setSearch(''); }}
            >
              All (Clear Selection)
            </button>
            <button
              className="w-full text-left px-2 py-1.5 rounded-md text-zinc-700 hover:bg-zinc-50 mb-2"
              onClick={() => { onChange([...options]); setIsOpen(false); setSearch(''); }}
            >
              Select All
            </button>
            <div className="space-y-0.5">
              {filteredOptions.map(opt => {
                const isSelected = values.includes(opt);
                return (
                  <button
                    key={opt}
                    className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-zinc-50 transition-colors text-zinc-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt);
                    }}
                    title={opt}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-[3px] border mr-3 flex items-center justify-center flex-shrink-0 transition-colors",
                      isSelected ? "border-brand-primary bg-brand-primary text-white" : "border-zinc-300 bg-white"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate flex-1 text-left">{opt}</span>
                  </button>
                );
              })}
            </div>
            {filteredOptions.length === 0 && (
              <div className="px-4 py-6 text-center text-zinc-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
