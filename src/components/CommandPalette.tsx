import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CornerDownLeft, Hash } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Command {
  id: string;
  label: string;
  description?: string;
  group?: 'page' | 'data';
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  page: '頁面',
  data: '資料',
};

export default function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Group and filter
  const { groups, flat } = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matched = q
      ? commands.filter(c =>
          c.label.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
        )
      : commands.filter(c => c.group === 'page'); // show only pages when empty

    // group by group key
    const grouped = matched.reduce((acc, cmd) => {
      const g = cmd.group ?? 'page';
      if (!acc[g]) acc[g] = [];
      acc[g].push(cmd);
      return acc;
    }, {} as Record<string, Command[]>);

    // flatten preserving group order: pages first, data second
    const flat: Command[] = [];
    if (grouped.page) flat.push(...grouped.page);
    if (grouped.data) flat.push(...grouped.data.slice(0, 20)); // cap data results

    return { groups: grouped, flat };
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const run = (cmd: Command) => { cmd.action(); onClose(); };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flat.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (flat[activeIndex]) run(flat[activeIndex]); }
      else if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, flat, activeIndex]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // track position in flat array per rendered item
  let renderIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-100"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="搜尋頁面或資料（Device、Tools ID…）"
                  className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 bg-transparent outline-none"
                />
                <kbd className="text-[10px] font-bold text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5">ESC</kbd>
              </div>

              <ul ref={listRef} className="max-h-80 overflow-y-auto py-2">
                {flat.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-zinc-400">找不到相關頁面或資料</li>
                ) : (
                  Object.entries({ page: groups.page, data: groups.data }).map(([groupKey, items]) => {
                    if (!items?.length) return null;
                    return (
                      <React.Fragment key={groupKey}>
                        <li className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            {GROUP_LABELS[groupKey] ?? groupKey}
                          </span>
                        </li>
                        {items.slice(0, groupKey === 'data' ? 20 : undefined).map((cmd) => {
                          const i = renderIndex++;
                          return (
                            <li key={cmd.id}>
                              <button
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                  i === activeIndex ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                                )}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => run(cmd)}
                              >
                                <span className="shrink-0 text-zinc-400">
                                  {cmd.icon ?? <Hash className="h-4 w-4" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{cmd.label}</div>
                                  {cmd.description && (
                                    <div className="text-xs text-zinc-400 truncate">{cmd.description}</div>
                                  )}
                                </div>
                                {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                              </button>
                            </li>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </ul>

              <div className="border-t border-zinc-100 px-4 py-2 flex items-center gap-3 text-[11px] text-zinc-400">
                <span><kbd className="border border-zinc-200 rounded px-1">↑↓</kbd> 導覽</span>
                <span><kbd className="border border-zinc-200 rounded px-1">↵</kbd> 前往</span>
                <span><kbd className="border border-zinc-200 rounded px-1">Esc</kbd> 關閉</span>
                {query.trim() && groups.data && <span className="ml-auto">{groups.data.length} 筆資料結果</span>}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
