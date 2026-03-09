import React, { useState, useEffect, useContext } from 'react';
import { Wifi, Battery, Search, Volume2, Command, Calendar, Power, RefreshCw, X, Maximize2, Minimize2, Minus, Copy, Clipboard, Info } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { AppId } from '../../types';

export const TopBar: React.FC = () => {
    const { openApp, activeWindowId, windows, apps, closeWindow, minimizeWindow, maximizeWindow, toggleAppDrawer, toggleDesktop, showModal, activeAppMenu } = useContext(AppContext);
    const [time, setTime] = useState(new Date());
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isCharging, setIsCharging] = useState(false);
    
    // Dropdown states
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown) {
                setActiveDropdown(null);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeDropdown]);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        
        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
                setBatteryLevel(battery.level * 100);
                setIsCharging(battery.charging);
                battery.addEventListener('levelchange', () => setBatteryLevel(battery.level * 100));
                battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
            });
        }

        return () => clearInterval(timer);
    }, []);

    const activeApp = windows.find(w => w.id === activeWindowId);
    const appConfig = activeApp ? apps.find(a => a.id === activeApp.appId)?.config : null;
    const appTitle = appConfig?.title || 'GAI OS';

    const relaunchActiveApp = () => {
        if (!activeApp) return;
        const appId = activeApp.appId;
        const windowId = activeApp.id;
        closeWindow(windowId);
        setTimeout(() => openApp(appId), 50);
    };

    // Helper to render menu items recursively
    const renderMenuItem = (item: any, index: number) => {
        return (
            <button 
                key={index}
                onClick={(e) => {
                    if (item.action) {
                        item.action();
                        setActiveDropdown(null);
                    }
                    e.stopPropagation();
                }}
                className={`px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between gap-2 text-white/90 font-medium ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={item.disabled}
            >
                <span>{item.label}</span>
                {item.shortcut && <span className="text-xs opacity-50 ml-4">{item.shortcut}</span>}
            </button>
        );
    };

    const renderWindowMenu = () => (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'window' ? null : 'window'); }}
                className={`px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${activeDropdown === 'window' ? 'bg-white/10' : ''}`}
            >
                Window
            </button>
            {activeDropdown === 'window' && (
                <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-black/90 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl py-1 flex flex-col z-[10001] animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={() => { if(activeWindowId) minimizeWindow(activeWindowId); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                        <Minus size={12} /> Minimize
                    </button>
                    <button onClick={() => { if(activeWindowId) maximizeWindow(activeWindowId); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                        {activeApp?.isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        {activeApp?.isMaximized ? 'Restore Down' : 'Zoom'}
                    </button>
                    <button onClick={() => { if(activeWindowId) closeWindow(activeWindowId); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                        <X size={12} /> Close Window
                    </button>
                </div>
            )}
        </div>
    );

    const getContextualMenus = () => {
        const appId = String(activeApp?.appId || '');
        if (!appId) return [];
        if (appId === AppId.SETTINGS) {
            return [{ label: 'Control', items: [
                { label: 'Apply System State', action: () => window.dispatchEvent(new CustomEvent('gai:settings:apply')) },
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) }
            ] }];
        }
        if (appId === AppId.FILE_MANAGER) {
            return [{ label: 'Explorer', items: [
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Open Editor', action: () => openApp(AppId.TEXT_EDITOR) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.BROWSER) {
            return [{ label: 'Browser', items: [
                { label: 'New Browser Window', action: () => openApp(AppId.BROWSER) },
                { label: 'Open SEO Analytics', action: () => openApp(AppId.SEO_ANALYTICS) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.TEXT_EDITOR) {
            return [{ label: 'Editor', items: [
                { label: 'Open File Manager', action: () => openApp(AppId.FILE_MANAGER) },
                { label: 'Open Code Studio', action: () => openApp(AppId.CODE_STUDIO) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.FTP_CLIENT) {
            return [{ label: 'FTP', items: [
                { label: 'Open File Manager', action: () => openApp(AppId.FILE_MANAGER) },
                { label: 'Open Settings', action: () => openApp(AppId.SETTINGS) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.TASK_MANAGER) {
            return [{ label: 'Tasks', items: [
                { label: 'Open Agent Control', action: () => openApp(AppId.AGENT_CONTROL) },
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.SEO_ANALYTICS) {
            return [{ label: 'SEO', items: [
                { label: 'Open Browser', action: () => openApp(AppId.BROWSER) },
                { label: 'Open Blog Manager', action: () => openApp(AppId.BLOG_MANAGER) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.GAI_MEMORY) {
            return [{ label: 'Memory', items: [
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Open Agent Control', action: () => openApp(AppId.AGENT_CONTROL) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.MODEL_STATS) {
            return [{ label: 'Models', items: [
                { label: 'Open Ollama Center', action: () => openApp(AppId.OLLAMA_CENTER) },
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.OLLAMA_CENTER) {
            return [{ label: 'Ollama', items: [
                { label: 'Open Model Stats', action: () => openApp(AppId.MODEL_STATS) },
                { label: 'Open Settings', action: () => openApp(AppId.SETTINGS) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.SITE_MANAGER) {
            return [{ label: 'Sites', items: [
                { label: 'Open Browser', action: () => openApp(AppId.BROWSER) },
                { label: 'Open SEO Analytics', action: () => openApp(AppId.SEO_ANALYTICS) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.CODE_STUDIO) {
            return [{ label: 'Studio', items: [
                { label: 'Open Text Editor', action: () => openApp(AppId.TEXT_EDITOR) },
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.INCOME_STRATEGIST) {
            return [{ label: 'Income', items: [
                { label: 'Open Browser', action: () => openApp(AppId.BROWSER) },
                { label: 'Open Blog Manager', action: () => openApp(AppId.BLOG_MANAGER) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.AGENT_CONTROL) {
            return [{ label: 'Agent', items: [
                { label: 'Open Task Manager', action: () => openApp(AppId.TASK_MANAGER) },
                { label: 'Open Terminal', action: () => openApp(AppId.TERMINAL) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        if (appId === AppId.BLOG_MANAGER) {
            return [{ label: 'Blog', items: [
                { label: 'Open Browser', action: () => openApp(AppId.BROWSER) },
                { label: 'Open SEO Analytics', action: () => openApp(AppId.SEO_ANALYTICS) },
                { label: 'Refresh Window', action: relaunchActiveApp }
            ] }];
        }
        return [{ label: 'App', items: [
            { label: 'Open Settings', action: () => openApp(AppId.SETTINGS) },
            { label: 'Refresh Window', action: relaunchActiveApp }
        ] }];
    };

    const renderDefaultMenus = () => (
        <>
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'file' ? null : 'file'); }}
                    className={`px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${activeDropdown === 'file' ? 'bg-white/10' : ''}`}
                >
                    File
                </button>
                {activeDropdown === 'file' && (
                    <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-black/90 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl py-1 flex flex-col z-[10001] animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={() => { if(activeWindowId) closeWindow(activeWindowId); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                            <X size={12} /> Close Window
                        </button>
                    </div>
                )}
            </div>

            {renderWindowMenu()}
        </>
    );

    const handleRestartSystem = () => {
        window.location.reload();
    };

    const handleAbout = () => {
        showModal('info', 'About GAI OS', 
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-2xl border border-white/10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-green-400">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" />
                        <path d="M16 12v.01" />
                        <path d="M12 16v.01" />
                    </svg>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">GAI OS</h2>
                    <p className="text-neu-muted text-sm mt-1">Version 5.0.2 (Captain's Edition)</p>
                    <p className="text-neu-muted text-xs mt-4 max-w-[250px]">
                        Generative Artificial Intelligence Operating System powered by Gemini & Ollama.
                    </p>
                </div>
                <div className="text-[10px] text-neu-muted/50 mt-4">
                    © 2024-2026 Technova Inc.
                </div>
            </div>
        );
    };

    return (
        <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-4 z-[10000] text-xs font-medium text-white select-none shadow-sm border-b border-white/10" style={{ background: 'var(--gai-topbar-bg, rgba(5, 8, 15, 0.8))', backdropFilter: 'blur(var(--gai-topbar-blur, 0px))', WebkitBackdropFilter: 'blur(var(--gai-topbar-blur, 0px))' }}>
            
            {/* LEFT: GAI Logo + App Menu */}
            <div className="flex items-center gap-4 h-full">
                <div 
                    className="hover:bg-white/10 p-1 rounded transition-colors cursor-pointer relative"
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'system' ? null : 'system'); }}
                >
                    {/* GAI OS Logo (Brain/Network) */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-400">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" />
                        <path d="M16 12v.01" />
                        <path d="M12 16v.01" />
                    </svg>
                    
                    {activeDropdown === 'system' && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-black/90 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl py-1 flex flex-col z-[10001] animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={() => { handleAbout(); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors text-white/90 font-medium">About GAI OS</button>
                            <button onClick={() => { openApp(AppId.SETTINGS); setActiveDropdown(null); }} className="px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors text-white/90 font-medium">System Settings</button>
                            <div className="h-px bg-white/10 my-1"></div>
                            <button onClick={handleRestartSystem} className="px-4 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                                <RefreshCw size={12} /> Restart System
                            </button>
                            <button onClick={() => window.close()} className="px-4 py-1.5 text-left hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-white/90 font-medium">
                                <Power size={12} /> Shutdown
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="font-bold tracking-wide cursor-default flex items-center gap-2 mr-2">
                    {appTitle}
                </div>
                
                {/* DYNAMIC APP MENU */}
                {activeApp && (
                    <div className="hidden md:flex items-center gap-1 text-white/90 h-full">
                        {activeAppMenu && activeAppMenu.id === activeWindowId ? (
                            // Render Custom Menu
                            [...activeAppMenu.items, ...(activeAppMenu.items.some((group: any) => String(group?.label || '').toLowerCase() === 'window') ? [] : [{ label: 'Window', items: [
                                { label: 'Minimize', action: () => { if(activeWindowId) minimizeWindow(activeWindowId); }, shortcut: '⌘M' },
                                { label: activeApp?.isMaximized ? 'Restore Down' : 'Zoom', action: () => { if(activeWindowId) maximizeWindow(activeWindowId); }, shortcut: '⌘⌃F' },
                                { label: 'Close Window', action: () => { if(activeWindowId) closeWindow(activeWindowId); }, shortcut: '⌘W' }
                            ] }])].map((menuGroup: any, idx: number) => (
                                <div key={idx} className="relative h-full flex items-center">
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setActiveDropdown(activeDropdown === `menu-${idx}` ? null : `menu-${idx}`); 
                                        }}
                                        className={`px-3 h-6 rounded hover:bg-white/10 transition-colors flex items-center ${activeDropdown === `menu-${idx}` ? 'bg-white/10' : ''}`}
                                    >
                                        {menuGroup.label}
                                    </button>
                                    {activeDropdown === `menu-${idx}` && (
                                        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-black/90 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl py-1 flex flex-col z-[10001] animate-in fade-in zoom-in-95 duration-100">
                                            {menuGroup.items.map((item: any, i: number) => renderMenuItem(item, i))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            // Fallback to default menus if no custom menu provided
                            <>
                                {getContextualMenus().map((menuGroup: any, idx: number) => (
                                    <div key={`ctx-${idx}`} className="relative h-full flex items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdown(activeDropdown === `ctx-${idx}` ? null : `ctx-${idx}`);
                                            }}
                                            className={`px-3 h-6 rounded hover:bg-white/10 transition-colors flex items-center ${activeDropdown === `ctx-${idx}` ? 'bg-white/10' : ''}`}
                                        >
                                            {menuGroup.label}
                                        </button>
                                        {activeDropdown === `ctx-${idx}` && (
                                            <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-black/90 backdrop-blur-2xl border border-white/20 rounded-lg shadow-2xl py-1 flex flex-col z-[10001] animate-in fade-in zoom-in-95 duration-100">
                                                {menuGroup.items.map((item: any, i: number) => renderMenuItem(item, i))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {renderDefaultMenus()}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT: Status Icons & Time */}
            <div className="flex items-center gap-4">
                {/* Search - Functional */}
                {/* <button onClick={() => openApp(AppId.BROWSER)} className="hover:text-blue-400 transition-colors" title="Web Search">
                    <Search size={14} />
                </button> */}

                {/* System Status */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity cursor-default" title="GAI Agent Status: Online">
                        <span className="text-[10px] font-bold text-green-400">GAI</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    
                    {batteryLevel !== null && (
                        <div className="flex items-center gap-1 opacity-90" title={`Battery: ${Math.round(batteryLevel)}%`}>
                            <span className="text-[10px] font-bold">{Math.round(batteryLevel)}%</span>
                            <Battery size={14} className={isCharging ? 'text-green-400' : ''} />
                        </div>
                    )}
                    
                    {/* Wifi is usually always on in web app context, so we show it static */}
                    <Wifi size={14} title="Connected" />
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2 font-semibold cursor-default">
                    <span className="hidden sm:inline opacity-80">
                        {time.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span>
                        {time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
};
