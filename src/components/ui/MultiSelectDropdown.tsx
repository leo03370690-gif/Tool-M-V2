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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between px-3 py-1.5 text-sm bg-transparent border-none cursor-pointer outline-none hover:bg-zinc-50 rounded-md transition-colors",
          values.length > 0 ? "text-brand-primary font-medium" : "text-zinc-700"
        )}
      >
        <span className="truncate max-w-[120px]">{displayValue}</span>
        <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-80 flex flex-col">
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
              <input
                type="text"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            <button
              className={cn(
                "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100",
                values.length === 0 && "bg-zinc-100 font-medium"
              )}
              onClick={() => { onChange([]); setIsOpen(false); setSearch(''); }}
            >
              All (Clear Selection)
            </button>
            {filteredOptions.map(opt => {
              const isSelected = values.includes(opt);
              return (
                <button
                  key={opt}
                  className={cn(
                    "w-full flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100",
                    isSelected && "bg-brand-primary/10 text-brand-primary font-medium"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(opt);
                  }}
                  title={opt}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border mr-2 flex items-center justify-center flex-shrink-0",
                    isSelected ? "border-brand-primary bg-brand-primary text-white" : "border-zinc-300"
                  )}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className="truncate flex-1 text-left">{opt}</span>
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="px-2 py-3 text-sm text-center text-zinc-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
