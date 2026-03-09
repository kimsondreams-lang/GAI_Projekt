
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { Volume2, VolumeX, LayoutGrid, Power, X, Activity, AppWindow, Minimize2, ExternalLink } from 'lucide-react';
import { soundService } from '../../services/soundService';
import { AppId, WindowState } from '../../types';
import { db } from '../../services/memoryService';
import { getIconScale } from './iconScale';

export const Taskbar: React.FC = () => {
  const { windows, openApp, minimizeWindow, closeWindow, activeWindowId, logout, toggleDesktop, toggleAppDrawer, isAppDrawerOpen, heartbeatActive, toggleHeartbeat, apps, focusWindow, showModal, handleContextMenu } = useContext(AppContext);
  const [time, setTime] = useState(new Date());
  
  // Store appId and X position for the menu
  const [peekMenu, setPeekMenu] = useState<{ appId: string, x: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
      const s = (db.getSettings() as any)?.soundEnabled;
      return typeof s === 'boolean' ? s : true;
  });
  const [volume, setVolume] = useState<number>(() => {
      const v = (db.getSettings() as any)?.soundVolume;
      return Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : 0.6;
  });
  const [showVolume, setShowVolume] = useState(false);
  const [iconSize, setIconSize] = useState<'small' | 'medium' | 'large'>(() => {
      const s = String((db.getSettings() as any)?.iconSize || 'medium');
      return (s === 'small' || s === 'large' || s === 'medium') ? (s as any) : 'medium';
  });
  const taskbarIconScale = getIconScale(iconSize as any);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const next = String(e?.detail?.settings?.iconSize || '');
      if (next === 'small' || next === 'medium' || next === 'large') setIconSize(next);
      if (typeof e?.detail?.settings?.soundEnabled === 'boolean') {
        setSoundEnabled(!!e.detail.settings.soundEnabled);
      }
      if (typeof e?.detail?.settings?.soundVolume === 'number') {
        const v = Math.max(0, Math.min(1, Number(e.detail.settings.soundVolume)));
        setVolume(v);
        try { soundService.setVolume(v); } catch {}
      }
    };
    window.addEventListener('gai:state_update', handler);
    return () => window.removeEventListener('gai:state_update', handler);
  }, []);

  // Group open windows by App ID
  const openGroups = windows
    .filter(w => w.isOpen)
    .reduce<Record<string, WindowState[]>>((groups, window) => {
        const appId = window.appId; 
        if (!groups[appId]) groups[appId] = [];
        groups[appId].push(window);
        return groups;
    }, {});

  const handleIconClick = (e: React.MouseEvent, appId: string, groupWindows: WindowState[]) => {
      e.preventDefault();
      e.stopPropagation();
      
      // If single window, toggle behavior
      if (groupWindows.length === 1) {
          const win = groupWindows[0];
          if (activeWindowId === win.id && !win.isMinimized) {
              minimizeWindow(win.id);
          } else {
              focusWindow(win.id); // Restores if minimized, focuses if background
          }
          setPeekMenu(null);
      } else {
          // If multiple, toggle peek menu
          if (peekMenu?.appId === appId) {
              setPeekMenu(null);
          } else {
              // Calculate center of the icon for menu positioning
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const centerX = rect.left + (rect.width / 2);
              setPeekMenu({ appId, x: centerX });
          }
      }
  };

  const handleCloseGroup = (groupWindows: WindowState[]) => {
      groupWindows.forEach(w => closeWindow(w.id));
      setPeekMenu(null);
  };

  const handleAppContextMenu = (e: React.MouseEvent, appId: string, groupWindows: WindowState[]) => {
      if (appId !== AppId.TASK_MANAGER) return;
      setPeekMenu(null);
      handleContextMenu(e, [
          {
              label: 'Zamknij',
              icon: <X size={14} />,
              danger: true,
              action: () => handleCloseGroup(groupWindows)
          }
      ]);
  };

  const toggleMute = () => {
      const enabled = !soundEnabled;
      setSoundEnabled(enabled);
      try { soundService.setEnabled(enabled); } catch {}
      db.updateSettings({ soundEnabled: enabled } as any).catch(() => {});
  };

  const handleVolumeChange = (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setVolume(clamped);
      try { soundService.setVolume(clamped); } catch {}
      db.updateSettings({ soundVolume: clamped } as any).catch(() => {});
  };

  const openPowerModal = () => {
      showModal(
          'choice',
          'GAI OS',
          'Wybierz akcję systemową:',
          undefined,
          undefined,
          undefined,
          [
              {
                  label: 'Wyłącz system',
                  variant: 'danger',
                  action: () => {
                      fetch('/api/system/power', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'stop' })
                      }).catch(() => {});
                      setTimeout(() => window.location.reload(), 800);
                  }
              },
              {
                  label: 'Zresetuj system',
                  variant: 'primary',
                  action: () => {
                      fetch('/api/system/power', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'restart' })
                      }).catch(() => {});
                      setTimeout(() => window.location.reload(), 1200);
                  }
              },
              {
                  label: 'Anuluj',
                  variant: 'secondary',
                  action: () => {}
              }
          ]
      );
  };

  return (
    <>
    {/* MAIN TASKBAR CONTAINER - MOVED TO BOTTOM CENTER AND DETACHED */}
    <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 h-14 bg-neu-base/80 backdrop-blur-xl rounded-full shadow-2xl flex items-center px-4 z-[10000] justify-center select-none border border-white/10 transition-all duration-300 hover:scale-[1.01]"
        style={{
            maxWidth: '90vw',
            width: 'auto'
        }}
    >
        
        {/* START BUTTON */}
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/10">
             <button 
                onClick={toggleAppDrawer}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 group hover:bg-white/10 ${isAppDrawerOpen ? 'text-blue-400' : 'text-white/90'}`}
                title="App Drawer"
             >
                <div style={{ transform: `scale(${taskbarIconScale})` }}>
                    <LayoutGrid size={22} className="group-hover:scale-110 transition-transform" />
                </div>
             </button>
        </div>

        {/* WINDOW GROUPS (SCROLLABLE) */}
        <div className="flex items-center gap-2 px-3 no-scrollbar">
            {Object.entries(openGroups).map(([appId, groupWindowsUncast]) => {
                const groupWindows = groupWindowsUncast as WindowState[];
                const appConfig = apps.find(a => a.id === appId)?.config;
                const isActive = groupWindows.some(w => w.id === activeWindowId && !w.isMinimized);
                
                return (
                    <button
                        key={appId}
                        onClick={(e) => handleIconClick(e, appId, groupWindows)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Simple custom context menu logic or trigger existing
                            // For now, let's use the native handleAppContextMenu but ensure it has Close option
                            handleAppContextMenu(e, appId, groupWindows);
                        }}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shrink-0 relative group hover:bg-white/10
                            ${isActive
                                ? 'bg-white/10 shadow-inner' 
                                : ''
                            }
                        `}
                    >
                        {/* Status Dot */}
                        {isActive && <div className="w-1 h-1 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/80"></div>}
                        
                        <div className="transition-transform group-hover:-translate-y-1">
                            {appConfig?.icon || <AppWindow size={24}/>}
                        </div>
                        
                        {/* Count Badge if > 1 */}
                        {groupWindows.length > 1 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                                {groupWindows.length}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>

        {/* TRAY REMOVED (Now in TopBar) */}
        {/* <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-white/10"> ... </div> */}
    </div>

    {/* PEEK MENU - Fixed Z-Index and removed animation classes that might hide it */}
    {peekMenu && (
        <>
            <div className="fixed inset-0 z-[10998]" onClick={() => setPeekMenu(null)}></div>
            <div 
                className="fixed bottom-20 z-[10999] bg-neu-base/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neu-border p-3 flex flex-col gap-2 min-w-[240px]"
                style={{ left: peekMenu.x, transform: 'translateX(-50%)' }}
            >
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-neu-base/90 rotate-45 border-b border-r border-neu-border"></div>
                
                {(() => {
                    const groupWindows = openGroups[peekMenu.appId] || [];
                    const appConfig = apps.find(a => a.id === peekMenu.appId)?.config;
                    return (
                        <>
                            <div className="flex justify-between items-center px-2 pb-2 border-b border-neu-light/10">
                                <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">{appConfig?.title || peekMenu.appId}</span>
                                <button 
                                    onClick={() => handleCloseGroup(groupWindows)}
                                    className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                                >
                                    Close All
                                </button>
                            </div>

                            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {groupWindows.map(win => (
                                    <div 
                                        key={win.id} 
                                        className="flex items-center justify-between p-2 hover:bg-neu-light/10 rounded-xl group/item transition-all cursor-pointer" 
                                        onClick={(e) => { 
                                            e.stopPropagation();
                                            focusWindow(win.id); 
                                            setPeekMenu(null); 
                                        }}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-6 rounded bg-neu-base shadow-neu-pressed flex items-center justify-center shrink-0 border ${win.id === activeWindowId ? 'border-blue-500/50' : 'border-transparent'}`}>
                                                <div className="scale-50 opacity-70">{appConfig?.icon}</div>
                                            </div>
                                            
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-medium truncate ${win.id === activeWindowId ? 'text-blue-400' : 'text-neu-text'}`}>
                                                    {win.title}
                                                </span>
                                                <span className="text-[9px] text-neu-muted truncate">
                                                    {win.id === activeWindowId ? 'Active' : win.isMinimized ? 'Minimized' : 'Background'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                closeWindow(win.id); 
                                                if (groupWindows.length <= 1) setPeekMenu(null); 
                                            }}
                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-neu-muted hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                                        >
                                            <div style={{ transform: `scale(${taskbarIconScale})` }}>
                                                <X size={12}/>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    );
                })()}
            </div>
        </>
    )}
    </>
  );
};
