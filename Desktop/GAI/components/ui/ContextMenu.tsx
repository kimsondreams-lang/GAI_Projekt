
import React, { useEffect, useRef } from 'react';
import { ContextMenuState } from '../../types';

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ state, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!state.isOpen) return null;

  return (
    <div 
        ref={menuRef}
        className="fixed z-[20000] min-w-[180px] bg-black/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        style={{ top: state.y, left: state.x }}
    >
        <div className="p-1">
            {state.items.map((item, idx) => (
                <button
                    key={idx}
                    onClick={() => {
                        item.action();
                        onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left
                        ${item.danger 
                            ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' 
                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {item.icon && <span className="opacity-70">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    </div>
  );
};
