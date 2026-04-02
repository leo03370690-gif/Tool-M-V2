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

  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
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
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
