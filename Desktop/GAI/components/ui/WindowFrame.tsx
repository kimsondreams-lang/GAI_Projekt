import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';
import { WindowState } from '../../types';

interface WindowFrameProps {
  windowState: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  windowState,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | null>(null);
  const snapPreviewRef = useRef<'left' | 'right' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - windowState.position.x,
            y: e.clientY - windowState.position.y
        });
        onFocus();
    }
  };
  
  const handleResizeStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      onFocus();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && !windowState.isMaximized) {
            onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
            const edgeThreshold = 28;
            const atLeft = e.clientX <= edgeThreshold;
            const atRight = e.clientX >= window.innerWidth - edgeThreshold;
            const nextSnap = atLeft ? 'left' : atRight ? 'right' : null;
            if (snapPreviewRef.current !== nextSnap) {
                snapPreviewRef.current = nextSnap;
                setSnapPreview(nextSnap);
            }
        } else if (snapPreviewRef.current) {
            snapPreviewRef.current = null;
            setSnapPreview(null);
        }
        if (isResizing && !windowState.isMaximized) {
            const newWidth = Math.max(300, e.clientX - windowState.position.x);
            const newHeight = Math.max(200, e.clientY - windowState.position.y);
            onResize(newWidth, newHeight);
        }
    };

    const handleMouseUp = () => {
        if (isDragging && snapPreviewRef.current) {
            const targetWidth = Math.floor(window.innerWidth / 2);
            const targetHeight = Math.max(200, window.innerHeight - 80);
            const snapLeft = snapPreviewRef.current === 'left';
            onResize(targetWidth, targetHeight);
            onMove(snapLeft ? 0 : targetWidth, 0);
        }
        setIsDragging(false);
        setIsResizing(false);
        snapPreviewRef.current = null;
        setSnapPreview(null);
    };

    if (isDragging || isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, onMove, onResize, windowState]);

  if (!windowState.isOpen) return null;

  const frameStyle: React.CSSProperties = windowState.isMaximized
    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 80px)', borderRadius: 0 } // 80px buffer for taskbar
    : {
        top: windowState.position.y,
        left: windowState.position.x,
        width: windowState.size.width,
        height: windowState.size.height,
      };

  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onMaximize(); 
  };

  return (
    <>
      {snapPreview && isDragging && !windowState.isMaximized && (
        <div
          className="fixed top-0 bottom-[80px] z-[11000] border-2 border-blue-400/40 bg-blue-400/10 rounded-2xl pointer-events-none transition-all duration-75"
          style={{
            left: snapPreview === 'left' ? 0 : '50%',
            width: '50%'
          }}
        />
      )}
      <div
        className={`absolute flex flex-col bg-neu-base text-neu-text transition-all duration-100 ease-out overflow-hidden ${
          windowState.isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
        } ${!windowState.isMaximized && 'rounded-theme shadow-neu-flat border border-neu-border'}`}
        style={{
          ...frameStyle,
          zIndex: windowState.zIndex,
          background: 'var(--gai-window-bg, var(--bg-base))',
          backdropFilter: 'blur(var(--gai-window-blur, 0px))',
          WebkitBackdropFilter: 'blur(var(--gai-window-blur, 0px))'
        }}
        onMouseDown={onFocus}
      >
        <div
          ref={headerRef}
          onDoubleClick={handleDoubleClick}
          className="window-frame-header h-12 bg-neu-base flex items-center justify-between px-4 select-none cursor-default relative z-10 border-b border-neu-border"
          style={{
            background: 'var(--gai-window-bg, var(--bg-base))',
            backdropFilter: 'blur(var(--gai-window-blur, 0px))',
            WebkitBackdropFilter: 'blur(var(--gai-window-blur, 0px))',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-3 text-sm font-bold tracking-wide text-neu-text neu-text-shadow">
            <div className={`w-3 h-3 rounded-full shadow-neu-pressed ${windowState.title.includes("Terminal") ? "bg-green-500" : "bg-neu-accent"}`}></div>
            <span>{windowState.title}</span>
          </div>
          
          <div className="flex items-center space-x-3 z-50">
              <button 
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
                  className="win-btn-min w-8 h-8 flex items-center justify-center rounded-full bg-neu-base shadow-neu-icon active:shadow-neu-icon-pressed text-neu-muted hover:text-yellow-400 transition-all border border-transparent hover:border-neu-border"
              >
                  <Minus size={14} strokeWidth={3} />
              </button>
              <button 
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); onMaximize(); }} 
                  className="win-btn-max w-8 h-8 flex items-center justify-center rounded-full bg-neu-base shadow-neu-icon active:shadow-neu-icon-pressed text-neu-muted hover:text-blue-400 transition-all border border-transparent hover:border-neu-border"
                  title={windowState.isMaximized ? "Restore Down" : "Maximize"}
              >
                  {windowState.isMaximized ? <Minimize2 size={14} strokeWidth={3}/> : <Maximize2 size={14} strokeWidth={3}/>}
              </button>
              <button 
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); onClose(); }} 
                  className="win-btn-close w-8 h-8 flex items-center justify-center rounded-full bg-neu-base shadow-neu-icon active:shadow-neu-icon-pressed text-neu-muted hover:text-red-500 transition-all border border-transparent hover:border-neu-border"
              >
                  <X size={14} strokeWidth={3}/>
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-neu-base">
            <div className="absolute inset-2 rounded-theme bg-neu-base shadow-neu-pressed overflow-hidden border border-neu-border">
              {children}
            </div>
        </div>

        {!windowState.isMaximized && (
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20 flex items-end justify-end p-1 text-neu-muted opacity-50 hover:opacity-100"
              onMouseDown={handleResizeStart}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M10 0L10 10L0 10Z" />
                </svg>
            </div>
        )}
      </div>
    </>
  );
};
