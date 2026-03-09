
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppId, DesktopItem } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { RefreshCw, Image, Settings, X, Folder as FolderIcon, Trash2 } from 'lucide-react';
import { soundService } from '../../services/soundService';
import { db } from '../../services/memoryService';
import { IconSizeKey, getIconScale } from './iconScale';

const MARGIN_X = 64; 
const MARGIN_Y = 80; 

const getDesktopMetrics = (size: IconSizeKey) => {
  const scale = getIconScale(size);
  const iconPx = Math.round(64 * scale);
  const tileW = iconPx + 32;
  const tileH = iconPx + 58;
  return {
    iconPx,
    tileW,
    tileH,
    labelPx: Math.max(10, Math.min(13, Math.round(11 * scale))),
    appIconPx: Math.max(18, Math.round(iconPx * 0.44)),
    folderMiniIconPx: Math.max(10, Math.round(iconPx * 0.18))
  };
};

export const Desktop: React.FC = () => {
  const { apps, openApp, handleContextMenu, setWallpaper, desktopLayout, setDesktopLayout } = useContext(AppContext);
  const [tapCount, setTapCount] = useState(0);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [colsPerPage, setColsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{x: number, y: number} | null>(null);
  const draggedItemRef = useRef<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const [iconSize, setIconSize] = useState<IconSizeKey>(() => {
      const s = String((db.getSettings() as any)?.iconSize || 'medium') as IconSizeKey;
      return (s === 'small' || s === 'medium' || s === 'large') ? s : 'medium';
  });

  const metrics = getDesktopMetrics(iconSize);

  useEffect(() => {
      const handleResize = () => {
          const availableWidth = window.innerWidth - (MARGIN_X * 2);
          const cols = Math.floor(availableWidth / metrics.tileW);
          setColsPerPage(Math.max(4, cols)); 
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [metrics.tileW]);

  useEffect(() => {
      const handler = (e: any) => {
          const next = String(e?.detail?.settings?.iconSize || '') as IconSizeKey;
          if (next === 'small' || next === 'medium' || next === 'large') setIconSize(next);
      };
      window.addEventListener('gai:state_update', handler);
      return () => window.removeEventListener('gai:state_update', handler);
  }, []);

  useEffect(() => {
      let maxX = 0;
      desktopLayout.forEach(item => {
          if (item.x > maxX) maxX = item.x;
      });
      const pages = Math.floor(maxX / colsPerPage) + 1;
      setTotalPages(Math.max(pages, 1));
  }, [desktopLayout, colsPerPage]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
      draggedItemRef.current = id;
      setDragItem(id);
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      
      if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '0.3';
      }
  };

  const handleDragEnd = (e: React.DragEvent) => {
      setDragItem(null);
      setDropIndicator(null);
      draggedItemRef.current = null;
      if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '1';
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - MARGIN_X;
      const y = e.clientY - rect.top - MARGIN_Y;

      let gx = Math.floor(x / metrics.tileW);
      let gy = Math.floor(y / metrics.tileH);

      if (gx < 0) gx = 0;
      if (gy < 0) gy = 0;
      if (gx >= colsPerPage) gx = colsPerPage - 1;

      setDropIndicator({ x: gx, y: gy });
  };

  const findNextFreeSlot = (startX: number, startY: number) => {
      let x = startX;
      let y = startY;
      let occupied = true;
      while (occupied) {
          occupied = desktopLayout.some(i => i.x === x && i.y === y);
          if (occupied) {
              x++;
              if (x >= colsPerPage) { x = 0; y++; }
          }
      }
      return { x, y };
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = draggedItemRef.current;
      
      setDropIndicator(null);
      setDragItem(null);
      draggedItemRef.current = null;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - MARGIN_X;
      const y = e.clientY - rect.top - MARGIN_Y;

      let localGx = Math.floor(x / metrics.tileW);
      let localGy = Math.floor(y / metrics.tileH);

      if (localGx < 0) localGx = 0;
      if (localGy < 0) localGy = 0;
      if (localGx >= colsPerPage) localGx = colsPerPage - 1;

      const globalGx = localGx + (currentPage * colsPerPage);
      const globalGy = localGy;

      const drawerAppId = (() => {
          try {
              return e.dataTransfer.getData('application/x-gai-app');
          } catch {
              return '';
          }
      })();

      if (!itemId && drawerAppId) {
          const appEntry = apps.find(a => a.id === drawerAppId);
          if (!appEntry) return;
          const existingShortcutIdx = desktopLayout.findIndex(i => i.type === 'app' && i.appId === drawerAppId);
          if (existingShortcutIdx !== -1) {
              const target = findNextFreeSlot(globalGx, globalGy);
              const updatedLayout = [...desktopLayout];
              updatedLayout[existingShortcutIdx] = {
                  ...updatedLayout[existingShortcutIdx],
                  x: target.x,
                  y: target.y
              };
              setDesktopLayout(updatedLayout);
              soundService.play('click');
              return;
          }
          const target = findNextFreeSlot(globalGx, globalGy);
          const newLayout = [
              ...desktopLayout,
              {
                  id: `shortcut_${drawerAppId}_${Date.now()}_${Math.random()}`,
                  type: 'app' as const,
                  title: String(appEntry.config.title || ''),
                  appId: drawerAppId,
                  x: target.x,
                  y: target.y
              }
          ];
          setDesktopLayout(newLayout);
          soundService.play('click');
          return;
      }

      if (!itemId) return;

      const sourceIdx = desktopLayout.findIndex(i => i.id === itemId);
      if (sourceIdx === -1) return;

      const sourceItem = desktopLayout[sourceIdx];
      const targetItemIdx = desktopLayout.findIndex(i => i.x === globalGx && i.y === globalGy);

      if (targetItemIdx === sourceIdx) return;

      const newLayout = [...desktopLayout];

      if (targetItemIdx === -1) {
          newLayout[sourceIdx] = { ...sourceItem, x: globalGx, y: globalGy };
          setDesktopLayout(newLayout);
          soundService.play('click');
      } else {
          const targetItem = desktopLayout[targetItemIdx];
          if (targetItem.type === 'folder' && sourceItem.type === 'app') {
              const filtered = newLayout.filter(i => i.id !== sourceItem.id);
              const targetInFiltered = filtered.findIndex(i => i.id === targetItem.id);
              filtered[targetInFiltered] = { 
                  ...targetItem, 
                  children: [...(targetItem.children || []), sourceItem] 
              };
              setDesktopLayout(filtered);
              soundService.play('success');
          } else {
              newLayout[sourceIdx] = { ...sourceItem, x: globalGx, y: globalGy };
              newLayout[targetItemIdx] = { ...targetItem, x: sourceItem.x, y: sourceItem.y };
              setDesktopLayout(newLayout);
              soundService.play('click');
          }
      }
  };

  const renderIcon = (item: DesktopItem, insideFolder = false) => {
      const appConf = item.appId ? apps.find(a => a.id === item.appId)?.config : null;
      if (item.type === 'app' && !appConf) return null;

      const isDragging = dragItem === item.id;
      
      const style: React.CSSProperties = insideFolder ? {} : {
          position: 'absolute',
          left: ((item.x % colsPerPage) * metrics.tileW) + MARGIN_X,
          top: (item.y * metrics.tileH) + MARGIN_Y,
          transform: `translateX(${Math.floor(item.x / colsPerPage) * 100}vw)`,
          transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.2, 1, 0.2, 1)',
          zIndex: isDragging ? 1000 : 1
      };

      const rawIcon = item.type === 'app' ? appConf?.icon : null;
      const scaledIcon = rawIcon && React.isValidElement(rawIcon)
          ? React.cloneElement(rawIcon as any, { size: metrics.appIconPx })
          : rawIcon;

      const outerStyle = !insideFolder ? { ...style, width: metrics.tileW } : style;

      return (
          <div 
            key={item.id}
            style={outerStyle}
            draggable={!insideFolder}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => {
                if (insideFolder || item.type !== 'app') return;
                handleContextMenu(e, [
                    { label: 'Usuń skrót', icon: <Trash2 size={14} />, danger: true, action: () => {
                        const next = desktopLayout.filter(i => i.id !== item.id);
                        setDesktopLayout(next);
                        soundService.play('click');
                    }}
                ]);
            }}
            onClick={(e) => { 
                e.stopPropagation(); 
                if (item.type === 'folder') setOpenFolderId(item.id);
                else if (item.appId) {
                    openApp(item.appId);
                    if (insideFolder) setOpenFolderId(null);
                }
            }}
            className={`group flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-0' : 'opacity-100'}`}
          >
            <div
                className={`rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden shadow-neu-flat group-hover:shadow-neu-pressed ${item.type === 'folder' ? 'bg-neu-base/40 backdrop-blur-md border border-white/5' : 'bg-neu-base'}`}
                style={{ width: metrics.iconPx, height: metrics.iconPx }}
            >
                {item.type === 'app' ? (
                    <div className="transform group-hover:scale-110 transition-transform">{scaledIcon}</div>
                ) : (
                    <div className="flex flex-wrap content-start p-1.5 gap-0.5 opacity-70">
                        {item.children?.slice(0, 4).map(child => {
                            const childConf = apps.find(a => a.id === child.appId)?.config;
                            return (
                                <div key={child.id} className="w-5 h-5 flex items-center justify-center">
                                    {childConf ? React.cloneElement(childConf.icon as any, { size: metrics.folderMiniIconPx }) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <span className="font-bold text-neu-text tracking-wide neu-text-shadow text-center leading-tight truncate w-full px-1 select-none pointer-events-none" style={{ fontSize: metrics.labelPx }}>
                {item.title}
            </span>
          </div>
      );
  };

  return (
    <>
        <div 
            ref={containerRef}
            className="absolute inset-0 z-0 overflow-hidden" 
            onContextMenu={(e) => handleContextMenu(e, [
                { label: 'Odśwież', icon: <RefreshCw size={14}/>, action: () => window.location.reload() },
                { label: 'Ustawienia', icon: <Settings size={14}/>, action: () => openApp(AppId.SETTINGS) }
            ])}
            onClick={() => setOpenFolderId(null)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {dropIndicator && (
                <div 
                    className="absolute border-2 border-blue-500/40 bg-blue-500/10 rounded-2xl pointer-events-none transition-all duration-75 z-0"
                    style={{
                        left: (dropIndicator.x * metrics.tileW) + MARGIN_X + Math.round((metrics.tileW - metrics.iconPx) / 2), 
                        top: (dropIndicator.y * metrics.tileH) + MARGIN_Y,
                        width: metrics.iconPx,
                        height: metrics.iconPx,
                        transform: `translateX(${currentPage * 100}vw)`
                    }}
                />
            )}

            <div 
                className="absolute inset-0 transition-transform duration-700 cubic-bezier(0.2, 1, 0.2, 1)"
                style={{ transform: `translateX(-${currentPage * 100}vw)` }}
            >
                 {desktopLayout.map(item => renderIcon(item))}
            </div>

            <div className="absolute bottom-[110px] left-0 right-0 flex justify-center gap-3 z-10 pointer-events-none">
                {Array.from({ length: totalPages }).map((_, i) => (
                    <div 
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${
                            i === currentPage ? 'bg-white w-6 shadow-[0_0_12px_rgba(255,255,255,0.7)]' : 'bg-white/20 hover:bg-white/40'
                        }`}
                        onClick={(e) => { e.stopPropagation(); setCurrentPage(i); }}
                    />
                ))}
            </div>
        </div>

        {openFolderId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in" onClick={() => setOpenFolderId(null)}>
                <div className="bg-neu-base/90 border border-white/10 rounded-[2.5rem] p-10 w-[90vw] max-w-2xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    {(() => {
                        const folder = desktopLayout.find(i => i.id === openFolderId);
                        if (!folder) return null;
                        return (
                            <div className="flex flex-wrap justify-center gap-10">
                                {folder.children?.map(child => renderIcon(child, true))}
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}
    </>
  );
};
