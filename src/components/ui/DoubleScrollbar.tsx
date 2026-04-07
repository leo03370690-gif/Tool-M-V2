import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface DoubleScrollbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DoubleScrollbar({ children, className }: DoubleScrollbarProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(entry.target.scrollWidth);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [children]);

  const isScrolling = useRef<'top' | 'bottom' | null>(null);

  const handleTopScroll = () => {
    if (isScrolling.current === 'bottom') return;
    isScrolling.current = 'top';
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    // Reset after a short delay
    setTimeout(() => {
      if (isScrolling.current === 'top') isScrolling.current = null;
    }, 50);
  };

  const handleBottomScroll = () => {
    if (isScrolling.current === 'top') return;
    isScrolling.current = 'bottom';
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    setTimeout(() => {
      if (isScrolling.current === 'bottom') isScrolling.current = null;
    }, 50);
  };

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div 
        ref={topScrollRef} 
        className="overflow-x-auto overscroll-x-contain custom-scrollbar"
        onScroll={handleTopScroll}
      >
        <div style={{ width: width, height: '1px' }}></div>
      </div>
      <div 
        ref={bottomScrollRef} 
        className="overflow-x-auto overscroll-x-contain custom-scrollbar"
        onScroll={handleBottomScroll}
      >
        <div ref={contentRef} className="w-max min-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
