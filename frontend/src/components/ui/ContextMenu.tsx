'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  items,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    let x = e.clientX;
    let y = e.clientY;

    const menuWidth = 192; // 12rem (w-48)
    const menuHeight = items.length * 38 + 10; // estimate size

    // Viewport boundaries check
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    setPosition({ x, y });
    setVisible(true);
  };

  useEffect(() => {
    const handleClick = () => {
      setVisible(false);
    };

    const handleScroll = () => setVisible(false);

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  return (
    <div onContextMenu={handleContextMenu} className="w-full h-full">
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            style={{
              position: 'fixed',
              top: position.y,
              left: position.x,
              zIndex: 1000,
            }}
            className="w-48 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-1 backdrop-blur-xl pointer-events-auto"
          >
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setVisible(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left cursor-pointer ${
                  item.variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon && <span className="w-4 h-4 opacity-70">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
