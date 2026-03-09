
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, BookOpen, Code, Brain, TrendingUp, Settings, Box, Zap, List, Calculator, FolderOpen, Globe, Activity, UploadCloud, FileEdit, Server } from 'lucide-react';
import { AppId, WindowState, AppConfig, DynamicAppSchema, ContextMenuItem, SystemTheme, BootState, ModalState, ModalType, DesktopItem, AppContextType } from './types';
import { Desktop } from './components/os/Desktop';
import { Taskbar } from './components/os/Taskbar';
import { WindowFrame } from './components/ui/WindowFrame';
import { DynamicAppRenderer } from './components/apps/DynamicAppRenderer';
import { ContextMenu } from './components/ui/ContextMenu';
import { BootLoader } from './components/sys/BootLoader';
import { RecoveryMode } from './components/sys/RecoveryMode';
import { Modal } from './components/ui/Modal'; 
import { TopBar } from './components/os/TopBar'; // New TopBar
import { ErrorBoundary } from './components/sys/ErrorBoundary';
import { db } from './services/memoryService';
import { soundService } from './services/soundService';
import { AppContext } from './contexts/AppContext';
import { BUILTIN_APPS, IconMap } from './config/apps';

const App: React.FC = () => {
  const [bootStatus, setBootStatus] = useState<BootState>('booting');
  const [isDataLoaded, setIsDataLoaded] = useState(false); // NOWA FLAGA 
  
  // Define default windows inside component to ensure AppId is available
  const defaultWindows = useMemo<WindowState[]>(() => [
    { id: AppId.TERMINAL, appId: AppId.TERMINAL, title: 'GAI Core Terminal', isOpen: true, isMinimized: false, isMaximized: false, zIndex: 10, position: { x: 50, y: 50 }, size: { width: 800, height: 600 } },
    { id: AppId.AGENT_CONTROL, appId: AppId.AGENT_CONTROL, title: 'Agent Control Center', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 11, position: { x: 100, y: 100 }, size: { width: 900, height: 700 } },
    { id: AppId.BLOG_MANAGER, appId: AppId.BLOG_MANAGER, title: 'Technova Buzz Manager', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 9, position: { x: 100, y: 80 }, size: { width: 900, height: 700 } },
    { id: AppId.CODE_STUDIO, appId: AppId.CODE_STUDIO, title: 'Evolution Studio', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 8, position: { x: 150, y: 100 }, size: { width: 800, height: 600 } },
    { id: AppId.INCOME_STRATEGIST, appId: AppId.INCOME_STRATEGIST, title: 'Income Architect', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 7, position: { x: 200, y: 120 }, size: { width: 700, height: 800 } },
    { id: AppId.SETTINGS, appId: AppId.SETTINGS, title: 'GAI Control Panel', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 20, position: { x: 250, y: 150 }, size: { width: 800, height: 600 } },
    { id: AppId.FILE_MANAGER, appId: AppId.FILE_MANAGER, title: 'File System Explorer', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 15, position: { x: 120, y: 180 }, size: { width: 750, height: 550 } },
    { id: AppId.BROWSER, appId: AppId.BROWSER, title: 'Web Interface', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 14, position: { x: 80, y: 60 }, size: { width: 900, height: 650 } },
    { id: AppId.TASK_MANAGER, appId: AppId.TASK_MANAGER, title: 'Autonomous Task Queue', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 13, position: { x: 300, y: 100 }, size: { width: 700, height: 500 } },
  ], []);

  const [windows, setWindows] = useState<WindowState[]>(defaultWindows);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(AppId.TERMINAL);
  const [allApps, setAllApps] = useState(BUILTIN_APPS);
  const [desktopLayout, setDesktopLayoutState] = useState<DesktopItem[]>([]);
  const [wallpaper, setWallpaper] = useState('#212529');
  const [desktopWallpaperOpacity, setDesktopWallpaperOpacity] = useState(0.3);
  const [desktopDim, setDesktopDim] = useState(0.2);
  const [taskbarOpacity, setTaskbarOpacity] = useState(0.8);
  const [taskbarBlurEnabled, setTaskbarBlurEnabled] = useState(false);
  const [taskbarBlurPx, setTaskbarBlurPx] = useState(14);
  const [topbarOpacity, setTopbarOpacity] = useState(0.8);
  const [topbarBlurEnabled, setTopbarBlurEnabled] = useState(false);
  const [topbarBlurPx, setTopbarBlurPx] = useState(12);
  const [windowBlurEnabled, setWindowBlurEnabled] = useState(false);
  const [windowBlurPx, setWindowBlurPx] = useState(16);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean, x: number, y: number, items: ContextMenuItem[] }>({ isOpen: false, x: 0, y: 0, items: [] });
  const [theme, setTheme] = useState<SystemTheme>('neu');
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'info', title: '', message: '' });
  const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);
  const [iconTheme, setIconTheme] = useState<string>('default');
  const [activeAppMenu, setActiveAppMenu] = useState<{ id: string; items: any[] } | null>(null);

  const lastLayoutUpdateRef = useRef<number>(0);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // ESC - Close Modal, App Drawer, or Menu
          if (e.key === 'Escape') {
              if (modal.isOpen) {
                  closeModal();
                  return;
              }
              if (isAppDrawerOpen) {
                  closeAppDrawer();
                  return;
              }
              if (contextMenu.isOpen) {
                  closeContextMenu();
                  return;
              }
          }

          // Ctrl+W - Close Active Window
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
              if (activeWindowId) {
                  e.preventDefault(); // Prevent closing browser tab
                  closeWindow(activeWindowId);
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [modal.isOpen, isAppDrawerOpen, contextMenu.isOpen, activeWindowId]);

  useEffect(() => {
    const initializeApp = async () => {
      await db.init();
    };
    initializeApp();
  }, []);

  // Synchronizacja stanu z serwerem
  useEffect(() => {
    const handleStateUpdate = (e: any) => {
        const data = e.detail;
        if (!data) return;

        // Oznaczamy, że dane dotarły z serwera
        if (!isDataLoaded) setIsDataLoaded(true);

        if (data.settings) {
            if (data.settings.heartbeat?.enabled !== heartbeatActive) {
                setHeartbeatActive(data.settings.heartbeat?.enabled || false);
            }
            const newWall = data.settings.wallpaper || '#212529';
            if (newWall !== wallpaper) setWallpaper(newWall);
            if (data.settings.theme && data.settings.theme !== theme) setTheme(data.settings.theme);
            if (typeof data.settings.soundVolume === 'number') {
                try { soundService.setVolume(data.settings.soundVolume); } catch {}
            }
            if (typeof data.settings.soundEnabled === 'boolean') {
                try { soundService.setEnabled(data.settings.soundEnabled, true); } catch {}
            }
            if (typeof data.settings.soundStyle === 'string') {
                try { soundService.setStyle(data.settings.soundStyle); } catch {}
            }
            const nextWallpaperOpacity = Number.isFinite(Number(data.settings.desktopWallpaperOpacity)) ? Number(data.settings.desktopWallpaperOpacity) : 0.3;
            setDesktopWallpaperOpacity(Math.max(0, Math.min(1, nextWallpaperOpacity)));
            const nextDim = Number.isFinite(Number(data.settings.desktopDim)) ? Number(data.settings.desktopDim) : 0.2;
            setDesktopDim(Math.max(0, Math.min(0.85, nextDim)));
            const nextTaskbarOpacity = Number.isFinite(Number(data.settings.taskbarOpacity)) ? Number(data.settings.taskbarOpacity) : 0.8;
            setTaskbarOpacity(Math.max(0.1, Math.min(1, nextTaskbarOpacity)));
            setTaskbarBlurEnabled(data.settings.taskbarBlurEnabled === true);
            setTaskbarBlurPx(Number.isFinite(Number(data.settings.taskbarBlurPx)) ? Math.max(0, Math.min(40, Number(data.settings.taskbarBlurPx))) : 14);
            const nextTopbarOpacity = Number.isFinite(Number((data.settings as any).topbarOpacity)) ? Number((data.settings as any).topbarOpacity) : 0.8;
            setTopbarOpacity(Math.max(0.1, Math.min(1, nextTopbarOpacity)));
            setTopbarBlurEnabled((data.settings as any).topbarBlurEnabled === true);
            setTopbarBlurPx(Number.isFinite(Number((data.settings as any).topbarBlurPx)) ? Math.max(0, Math.min(40, Number((data.settings as any).topbarBlurPx))) : 12);
            setWindowBlurEnabled(data.settings.windowBlurEnabled === true);
            setWindowBlurPx(Number.isFinite(Number(data.settings.windowBlurPx)) ? Math.max(0, Math.min(40, Number(data.settings.windowBlurPx))) : 16);
            if (data.settings.iconTheme) setIconTheme(data.settings.iconTheme);
        }
        
        if (data.desktopLayout && data.desktopLayout.length >= 0) {
            const now = Date.now();
            if (now - lastLayoutUpdateRef.current > 5000) {
                if (JSON.stringify(data.desktopLayout) !== JSON.stringify(desktopLayout)) {
                    setDesktopLayoutState(data.desktopLayout);
                }
            }
        }
    };
    
    window.addEventListener('gai:state_update', handleStateUpdate);
    return () => window.removeEventListener('gai:state_update', handleStateUpdate);
  }, [heartbeatActive, wallpaper, theme, desktopLayout, isDataLoaded]);

  useEffect(() => {
      if (!isDataLoaded) return; // Czekamy na dane

      const settings = db.getSettings();
      setTheme(settings.theme || 'neu');
      setWallpaper(settings.wallpaper || '#212529');
      setHeartbeatActive(settings.heartbeat?.enabled || false);
      setDesktopWallpaperOpacity(Number.isFinite(Number((settings as any).desktopWallpaperOpacity)) ? Math.max(0, Math.min(1, Number((settings as any).desktopWallpaperOpacity))) : 0.3);
      setDesktopDim(Number.isFinite(Number((settings as any).desktopDim)) ? Math.max(0, Math.min(0.85, Number((settings as any).desktopDim))) : 0.2);
      setTaskbarOpacity(Number.isFinite(Number((settings as any).taskbarOpacity)) ? Math.max(0.1, Math.min(1, Number((settings as any).taskbarOpacity))) : 0.8);
      setTaskbarBlurEnabled((settings as any).taskbarBlurEnabled === true);
      setTaskbarBlurPx(Number.isFinite(Number((settings as any).taskbarBlurPx)) ? Math.max(0, Math.min(40, Number((settings as any).taskbarBlurPx))) : 14);
      setTopbarOpacity(Number.isFinite(Number((settings as any).topbarOpacity)) ? Math.max(0.1, Math.min(1, Number((settings as any).topbarOpacity))) : 0.8);
      setTopbarBlurEnabled((settings as any).topbarBlurEnabled === true);
      setTopbarBlurPx(Number.isFinite(Number((settings as any).topbarBlurPx)) ? Math.max(0, Math.min(40, Number((settings as any).topbarBlurPx))) : 12);
      setWindowBlurEnabled((settings as any).windowBlurEnabled === true);
      setWindowBlurPx(Number.isFinite(Number((settings as any).windowBlurPx)) ? Math.max(0, Math.min(40, Number((settings as any).windowBlurPx))) : 16);
      setIconTheme((settings as any).iconTheme || 'default');
      try { 
        soundService.setTheme(settings.theme || 'neu'); 
        if (typeof (settings as any).soundVolume === 'number') soundService.setVolume((settings as any).soundVolume);
        if (typeof (settings as any).soundEnabled === 'boolean') soundService.setEnabled((settings as any).soundEnabled, true);
        if (typeof (settings as any).soundStyle === 'string') soundService.setStyle((settings as any).soundStyle);
      } catch {}
      
      const installed = db.getInstalledApps();
      const dynamicApps = installed.map(schema => {
          const IconComp = IconMap[schema.iconName] || Box;
          return {
              id: schema.id,
              config: {
                  title: schema.name,
                  icon: <IconComp size={28} className="text-pink-400" />,
                  component: () => <DynamicAppRenderer schema={schema} />,
                  isDynamic: true,
                  multiInstance: false
              }
          };
      });
      const mergedApps = [...BUILTIN_APPS, ...dynamicApps];
      setAllApps(mergedApps);

      const layout = db.getDesktopLayout();
      setDesktopLayoutState(layout);
  }, [isDataLoaded]); 

  useEffect(() => {
      if(bootStatus === 'os') {
        const iconThemeClass = iconTheme ? `icon-theme-${iconTheme}` : 'icon-theme-default';
        document.body.className = `theme-${theme} ${iconThemeClass}`;
        try { soundService.setTheme(theme); } catch {}
      }
  }, [theme, bootStatus, iconTheme]);

  useEffect(() => {
      if (bootStatus !== 'os') return;
      const root = document.documentElement;
      const windowBg = windowBlurEnabled ? 'rgba(30, 30, 35, 0.55)' : 'var(--bg-base)';
      const windowBlur = windowBlurEnabled ? `${windowBlurPx}px` : '0px';
      const taskbarBg = taskbarBlurEnabled ? `rgba(30, 30, 35, ${taskbarOpacity})` : 'var(--bg-base)';
      const taskbarBlur = taskbarBlurEnabled ? `${taskbarBlurPx}px` : '0px';
      const topbarBg = topbarBlurEnabled ? `rgba(5, 8, 15, ${topbarOpacity})` : 'var(--bg-base)';
      const topbarBlur = topbarBlurEnabled ? `${topbarBlurPx}px` : '0px';
      root.style.setProperty('--gai-window-bg', windowBg);
      root.style.setProperty('--gai-window-blur', windowBlur);
      root.style.setProperty('--gai-taskbar-bg', taskbarBg);
      root.style.setProperty('--gai-taskbar-blur', taskbarBlur);
      root.style.setProperty('--gai-topbar-bg', topbarBg);
      root.style.setProperty('--gai-topbar-blur', topbarBlur);
  }, [bootStatus, theme, windowBlurEnabled, windowBlurPx, taskbarBlurEnabled, taskbarBlurPx, taskbarOpacity, topbarBlurEnabled, topbarBlurPx, topbarOpacity]);

    // --- WINDOW PERSISTENCE ---
  const saveWindowsState = () => {
      if (!isDataLoaded) return;
      const openWindows = windows.filter(w => w.isOpen).map(w => ({
          id: w.id,
          appId: w.appId,
          title: w.title,
          position: w.position,
          size: w.size,
          isMaximized: w.isMaximized,
          isMinimized: w.isMinimized,
          zIndex: w.zIndex
      }));
      localStorage.setItem('gai_windows_state_v2', JSON.stringify(openWindows));
  };

  // Save on window change
  useEffect(() => {
      if (bootStatus === 'os') {
          const timeout = setTimeout(saveWindowsState, 1000);
          return () => clearTimeout(timeout);
      }
  }, [windows, bootStatus]);

  // Restore on boot
  useEffect(() => {
      if (bootStatus === 'os' && isDataLoaded) {
          try {
              // Try to load v2 state, ignore v1 to fix stuck windows
              const saved = localStorage.getItem('gai_windows_state_v2');
              let restoredState: any[] = [];
              
              if (saved) {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                      restoredState = parsed;
                  }
              }

              setWindows(prev => {
                  // Create map of existing windows to preserve any non-persisted properties if any
                  // Start with defaultWindows to ensure all required apps exist
                  let next = [...defaultWindows];
                  
                  if (restoredState.length > 0) {
                      // Deduplicate restored windows
                      const uniqueRestored = restoredState.filter((w: any, index: number, self: any[]) => 
                          index === self.findIndex((t: any) => t.id === w.id)
                      );
                      
                      uniqueRestored.forEach((rw: any) => {
                          const existingIdx = next.findIndex(n => n.id === rw.id);
                          // Validate position to prevent off-screen windows
                          const viewportW = window.innerWidth || 1280;
                          const viewportH = window.innerHeight || 720;
                          let safeX = Number(rw.position?.x) || 50;
                          let safeY = Number(rw.position?.y) || 50;
                          if (safeX < -100 || safeX > viewportW - 50) safeX = 50;
                          if (safeY < -50 || safeY > viewportH - 50) safeY = 50;

                          const safeState = {
                              ...rw,
                              position: { x: safeX, y: safeY },
                              isOpen: true, // If it was in saved state, it should be open
                              // Force unminimize if it was active
                              isMinimized: rw.isMinimized
                          };

                          if (existingIdx >= 0) {
                              next[existingIdx] = { ...next[existingIdx], ...safeState };
                          } else {
                              next.push(safeState);
                          }
                      });
                  }

                  // SAFETY CHECK: Ensure Terminal is ALWAYS open and visible if nothing else is, or on first clean boot
                  const isTerminalOpen = next.some(w => w.id === AppId.TERMINAL && w.isOpen);
                  if (!isTerminalOpen || restoredState.length === 0) {
                      const termIdx = next.findIndex(w => w.id === AppId.TERMINAL);
                      if (termIdx >= 0) {
                          next[termIdx] = { 
                              ...next[termIdx], 
                              isOpen: true, 
                              isMinimized: false,
                              zIndex: 100, // Force top
                              position: { x: 50, y: 50 } 
                          };
                          setActiveWindowId(AppId.TERMINAL);
                      }
                  }
                  
                  // Final safety check for duplicates
                  return next.filter((w, index, self) => 
                      index === self.findIndex((t) => t.id === w.id)
                  );
              });

          } catch (e) {
              console.error('Failed to restore windows:', e);
          }
      }
  }, [bootStatus, isDataLoaded]);

  if (bootStatus === 'booting') {
      return <BootLoader onComplete={() => setBootStatus('os')} onRecovery={() => setBootStatus('recovery')} />;
  }
  
  if (bootStatus === 'recovery') {
      return <RecoveryMode onReboot={() => window.location.reload()} />;
  }

  const showModal = (type: ModalType, title: string, message: string | React.ReactNode, onConfirm?: (value?: string) => void, onCancel?: () => void, inputValue?: string, actions?: any[]) => {
      soundService.play('hover');
      setModal({ isOpen: true, type, title, message, onConfirm, onCancel, inputValue, actions });
  };

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const openProgressModal = (opts: { title: string; message?: any; value?: number | null; status?: string; details?: string[]; canCancel?: boolean; onCancel?: () => void }) => {
      const id = `progress_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      soundService.play('hover');
      setModal({
          isOpen: true,
          type: 'progress',
          title: String(opts.title || ''),
          message: opts.message ?? '',
          onCancel: opts.onCancel,
          progressId: id,
          progress: {
              value: typeof opts.value === 'undefined' ? null : opts.value,
              status: opts.status,
              details: Array.isArray(opts.details) ? opts.details : [],
              canCancel: opts.canCancel === true
          }
      });
      return id;
  };

  const updateProgressModal = (id: string, patch: { title?: string; message?: any; value?: number | null; status?: string; details?: string[]; canCancel?: boolean }) => {
      setModal(prev => {
          if (!prev?.isOpen) return prev;
          if (prev.type !== 'progress') return prev;
          if (prev.progressId !== id) return prev;
          const nextProgress = {
              ...(prev.progress || {}),
              ...(typeof patch.value !== 'undefined' ? { value: patch.value } : {}),
              ...(typeof patch.status !== 'undefined' ? { status: patch.status } : {}),
              ...(typeof patch.details !== 'undefined' ? { details: patch.details } : {}),
              ...(typeof patch.canCancel !== 'undefined' ? { canCancel: patch.canCancel } : {})
          };
          return {
              ...prev,
              ...(typeof patch.title !== 'undefined' ? { title: patch.title } : {}),
              ...(typeof patch.message !== 'undefined' ? { message: patch.message } : {}),
              progress: nextProgress
          };
      });
  };

  const setDesktopLayout = (layout: DesktopItem[]) => {
      lastLayoutUpdateRef.current = Date.now();
      setDesktopLayoutState(layout);
      db.saveDesktopLayout(layout).catch(() => {});
  };

  const toggleHeartbeat = () => {
      const newState = !heartbeatActive;
      db.updateSettings({
          heartbeat: { ...db.getSettings().heartbeat, enabled: newState }
      });
      soundService.play('success');
  };

  const focusWindow = (id: string) => {
    // Always ensure window is brought to front and unminimized, even if already active
    setWindows(prev => {
        const maxZ = Math.max(...prev.map(w => w.zIndex), 10);
        return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w);
    });

    if (id !== activeWindowId) {
        soundService.play('click');
        setActiveWindowId(id);
    }
  };

  const setAppMenu = (items: any[]) => {
      if (activeWindowId) {
          setActiveAppMenu({ id: activeWindowId, items });
      } else {
          setActiveAppMenu(null);
      }
  };

  const normalizeWindowForOpen = (win: WindowState) => {
    const fallbackWidth = 800;
    const fallbackHeight = 600;
    const minWidth = 360;
    const minHeight = 240;
    const width = Math.max(minWidth, Number.isFinite(Number(win.size?.width)) ? Number(win.size?.width) : fallbackWidth);
    const height = Math.max(minHeight, Number.isFinite(Number(win.size?.height)) ? Number(win.size?.height) : fallbackHeight);
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720;
    const maxX = Math.max(0, viewportW - width - 20);
    const maxY = Math.max(0, viewportH - height - 80);
    let x = Number.isFinite(Number(win.position?.x)) ? Number(win.position?.x) : Math.max(0, (viewportW - width) / 2);
    let y = Number.isFinite(Number(win.position?.y)) ? Number(win.position?.y) : Math.max(0, (viewportH - height) / 2);
    if (x < 0 || y < 0 || x > maxX || y > maxY) {
        x = Math.max(0, (viewportW - width) / 2);
        y = Math.max(0, (viewportH - height) / 2);
    }
    return { ...win, size: { width, height }, position: { x, y } };
  };

  const openApp = (appId: string, args?: any) => {
    soundService.play('click');
    setWindows(prev => {
        const appEntry = allApps.find(a => a.id === appId);
        if (!appEntry) return prev;
        const isMultiInstance = appEntry.config.multiInstance;
        if (!isMultiInstance) {
            const existing = prev.find(w => w.appId === appId);
            if (existing) {
                const maxZ = Math.max(...prev.map(w => w.zIndex), 10);
                setActiveWindowId(existing.id);
                const normalized = normalizeWindowForOpen(existing);
                return prev.map(w => w.id === existing.id ? { 
                    ...normalized, isOpen: true, isMinimized: false, zIndex: maxZ + 1, launchArgs: args 
                } : w);
            }
        }
        const maxZ = Math.max(...prev.map(w => w.zIndex), 10);
        const newId = isMultiInstance ? `${appId}_${Date.now()}` : appId;
        setActiveWindowId(newId);
        const nextWindow = normalizeWindowForOpen({
            id: newId,
            appId: appId,
            title: appEntry.config.title,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            zIndex: maxZ + 1,
            position: { x: 100 + (prev.length * 20) % 200, y: 100 + (prev.length * 20) % 200 },
            size: { width: 800, height: 600 },
            launchArgs: args
        });
        return [...prev, nextWindow];
    });
  };

  const closeWindow = (id: string) => {
    soundService.play('click');
    setWindows(prev => {
        const nextWindows = prev.map(w => w.id === id ? { ...w, isOpen: false } : w);
        if (activeWindowId === id) {
            const nextActive = [...nextWindows]
                .filter(w => w.isOpen && !w.isMinimized)
                .sort((a, b) => b.zIndex - a.zIndex)[0];
            setActiveWindowId(nextActive?.id || null);
        }
        return nextWindows;
    });
    setActiveAppMenu(prev => (prev?.id === id ? null : prev));
  };

  const minimizeWindow = (id: string) => {
    soundService.play('click');
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    setActiveWindowId(null);
  };

  const maximizeWindow = (id: string) => {
    soundService.play('click');
    setWindows(prev => {
        const maxZ = Math.max(...prev.map(w => w.zIndex), 10);
        return prev.map(w => w.id === id ? { 
            ...w, 
            isMaximized: !w.isMaximized,
            zIndex: maxZ + 1,
            isMinimized: false
        } : w);
    });
    setActiveWindowId(id);
  };

  const moveWindow = (id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x, y } } : w));
  };

  const resizeWindow = (id: string, width: number, height: number) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, size: { width, height } } : w));
  };
  
  const toggleDesktop = () => {
      soundService.play('click');
      setIsAppDrawerOpen(false);
      const anyOpen = windows.some(w => w.isOpen && !w.isMinimized);
      if (anyOpen) {
          setWindows(prev => prev.map(w => w.isOpen ? { ...w, isMinimized: true } : w));
          setActiveWindowId(null);
      } else {
           setWindows(prev => prev.map(w => w.isOpen ? { ...w, isMinimized: false } : w));
      }
  };

  const toggleAppDrawer = () => {
      soundService.play('click');
      setIsAppDrawerOpen(prev => !prev);
  };

  const closeAppDrawer = () => {
      setIsAppDrawerOpen(false);
  };

  const handleContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Dispatch event to close top bar menus
    window.dispatchEvent(new MouseEvent('click'));
    
    soundService.play('hover');
    setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, items });
  };

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, isOpen: false }));



  const safeWallpaper = wallpaper || '#212529';
  const wallpaperStyle = safeWallpaper.startsWith('#') 
      ? { backgroundColor: safeWallpaper } 
      : { backgroundImage: `url(${safeWallpaper})` };

  const appDrawerApps = [...allApps].sort((a, b) => {
      const at = String(a.config?.title || a.id).toLowerCase();
      const bt = String(b.config?.title || b.id).toLowerCase();
      return at.localeCompare(bt);
  });

  return (
    <AppContext.Provider value={{ 
        windows, activeWindowId, apps: allApps, desktopLayout, setDesktopLayout,
        openApp, closeWindow, minimizeWindow, maximizeWindow, focusWindow, moveWindow, resizeWindow,
        logout: () => {
            window.location.reload();
        },
        handleContextMenu,
        setWallpaper,
        setTheme,
        toggleDesktop,
        toggleAppDrawer,
        closeAppDrawer,
        isAppDrawerOpen,
        heartbeatActive,
        toggleHeartbeat,
        showModal,
        openProgressModal,
        updateProgressModal,
        closeModal,
        activeAppMenu: activeWindowId && activeAppMenu?.id === activeWindowId ? activeAppMenu : null,
        setAppMenu
    }}>
      <div className="relative w-screen h-screen bg-neu-base overflow-hidden font-sans selection:bg-blue-500/30" onContextMenu={(e) => e.preventDefault()} onClick={closeContextMenu}>
        <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-1000 ease-in-out"
            style={{ ...wallpaperStyle, opacity: desktopWallpaperOpacity }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-neu-base via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${desktopDim})` }}></div>
        <Desktop />
        <ErrorBoundary>
            <TopBar />
        </ErrorBoundary>
        {isAppDrawerOpen && (
            <div className="fixed inset-0 z-[12000]">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" onClick={closeAppDrawer}></div>
                <div className="absolute inset-0 flex flex-col">
                    <div className="flex items-center justify-between px-8 pt-8 pb-4">
                        <div className="text-sm font-bold tracking-widest text-neu-text uppercase">Apps</div>
                        <button onClick={closeAppDrawer} className="px-3 py-1.5 rounded-lg bg-neu-base shadow-neu-flat border border-neu-border text-xs font-bold text-neu-muted hover:text-neu-text transition-colors">
                            Zamknij
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-8 pb-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {appDrawerApps.map(app => {
                                const rawIcon = app.config?.icon;
                                const icon = rawIcon && React.isValidElement(rawIcon)
                                    ? React.cloneElement(rawIcon as any, { size: 36 })
                                    : rawIcon;
                                return (
                                    <button
                                        key={app.id}
                                        draggable
                                        onDragStart={(e) => {
                                            const target = e.currentTarget as HTMLElement | null;
                                            if (target && e.dataTransfer) {
                                                const rect = target.getBoundingClientRect();
                                                e.dataTransfer.setDragImage(target, rect.width / 2, rect.height / 2);
                                            }
                                            try {
                                                e.dataTransfer.effectAllowed = 'copy';
                                                e.dataTransfer.setData('application/x-gai-app', app.id);
                                                e.dataTransfer.setData('text/plain', app.id);
                                            } catch {}
                                            setTimeout(() => closeAppDrawer(), 0);
                                        }}
                                        onClick={() => {
                                            closeAppDrawer();
                                            openApp(app.id);
                                        }}
                                        className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-neu-base/80 border border-neu-border shadow-neu-flat hover:shadow-neu-pressed transition-all"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-neu-base flex items-center justify-center shadow-neu-pressed">
                                            {icon}
                                        </div>
                                        <span className="text-xs font-bold text-neu-text text-center truncate w-full">{app.config?.title || app.id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}
        {windows.map(win => {
            if (!win.isOpen) return null;
            const appEntry = allApps.find(a => a.id === win.appId);
            const AppComp = appEntry?.config.component;
            if (!AppComp) return null;
            return (
                <ErrorBoundary key={win.id}>
                    <WindowFrame
                        windowState={win}
                        onClose={() => closeWindow(win.id)}
                        onMinimize={() => minimizeWindow(win.id)}
                        onMaximize={() => maximizeWindow(win.id)}
                        onFocus={() => focusWindow(win.id)}
                        onMove={(x, y) => moveWindow(win.id, x, y)}
                        onResize={(w, h) => resizeWindow(win.id, w, h)}
                    >
                        <AppComp launchArgs={win.launchArgs} />
                    </WindowFrame>
                </ErrorBoundary>
            );
        })}
        <ErrorBoundary>
            <Taskbar />
        </ErrorBoundary>
        <ErrorBoundary>
            <ContextMenu state={contextMenu} onClose={closeContextMenu} />
        </ErrorBoundary>
        <ErrorBoundary>
            <Modal state={modal} onClose={closeModal} />
        </ErrorBoundary>
      </div>
    </AppContext.Provider>
  );
};

export default App;
