
import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    Monitor, Cpu, Cloud, Shield, Save, RotateCw, AlertCircle, 
    RefreshCw, Globe, Server, Activity, Terminal, HardDrive, 
    Layers, Zap, Info, Palette, Key, Database, ChevronRight, 
    Settings as SettingsIcon, Radio, Lock, Timer, Power, 
    Send, Upload, Trash2, FileJson,
    Layout, Sliders, Smartphone, Wifi, History, CheckCircle, Brain
} from 'lucide-react';
import { db } from '../../services/memoryService';
import { AppContext } from '../../contexts/AppContext';
import { AIProvider, SystemTheme, SystemSettings } from '../../types';
import { soundService } from '../../services/soundService';

export const SettingsApp: React.FC = () => {
    const { showModal, setTheme, setWallpaper } = useContext(AppContext);
    const [settings, setSettings] = useState<SystemSettings>(db.getSettings());
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'about' | 'display' | 'ai' | 'connectivity' | 'dev'>('about');
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSystemInfo();
        handleRefreshModels();
        const interval = setInterval(fetchSystemInfo, 5000);
        let cancelled = false;
        (async () => {
            try {
                await db.fetchState();
            } catch {}
            if (!cancelled) {
                setSettings(db.getSettings());
            }
        })();
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        setSettings(prev => {
            const normalizeRoleValue = (value: unknown) => {
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if (!trimmed) return '';
                    const lower = trimmed.toLowerCase();
                    if (lower === 'true' || lower === 'false' || lower === 'enabled' || lower === 'disabled') return '';
                    return trimmed;
                }
                return '';
            };
            const ftpConfig = prev.ftpConfig || { host: '', user: '', pass: '', port: '21', rootPath: '/', enabled: false };
            const telegramConfig = prev.telegramConfig || { botToken: '', chatId: '', enabled: false };
            const apiKeys = prev.apiKeys || { ollama: '' };
            const modelRoles: Partial<SystemSettings['modelRoles']> =
                prev.modelRoles && typeof prev.modelRoles === 'object' ? (prev.modelRoles as any) : {};
            const roleKeys: RoleKey[] = [
                'chat',
                'coding',
                'writing',
                'planning',
                'functionCoding',
                'refactor',
                'debug',
                'architecture',
                'boilerplate',
                'support'
            ];
            const emptyRoles = roleKeys.reduce<SystemSettings['modelRoles']>((acc, key) => {
                acc[key] = '';
                return acc;
            }, {} as SystemSettings['modelRoles']);
            const normalizedRoles = roleKeys.reduce<SystemSettings['modelRoles']>((acc, key) => {
                const normalized = normalizeRoleValue((modelRoles as any)[key]);
                acc[key] = normalized;
                return acc;
            }, emptyRoles);
            const baseCtx = Number.isFinite(Number(prev.ollamaNumCtx)) ? Number(prev.ollamaNumCtx) : 4096;
            const autonomyWindow = prev.autonomyWindow || {
                enabled: false,
                startHour: 0,
                endHour: 0
            };
            const autonomyEnabled = typeof (prev as any).autonomyEnabled === 'boolean'
                ? (prev as any).autonomyEnabled
                : !!prev.heartbeat?.enabled;
            const autonomyScheduler = String((prev as any).autonomyScheduler || '').trim() === 'event' ? 'event' : 'heartbeat';
            const terminalLogFilters = prev.terminalLogFilters || {
                enabled: true,
                system: true,
                stdout: true,
                stderr: true,
                exec: true,
                fs: true,
                ftp: true,
                thought: true
            };
            const desktopWallpaperOpacity = Number.isFinite(Number((prev as any).desktopWallpaperOpacity))
                ? Math.max(0, Math.min(1, Number((prev as any).desktopWallpaperOpacity)))
                : 0.3;
            const desktopDim = Number.isFinite(Number((prev as any).desktopDim))
                ? Math.max(0, Math.min(0.85, Number((prev as any).desktopDim)))
                : 0.2;
            const windowBlurEnabled = typeof (prev as any).windowBlurEnabled === 'boolean' ? (prev as any).windowBlurEnabled : false;
            const windowBlurPx = Number.isFinite(Number((prev as any).windowBlurPx)) ? Math.max(0, Math.min(40, Number((prev as any).windowBlurPx))) : 16;
            const taskbarBlurEnabled = typeof (prev as any).taskbarBlurEnabled === 'boolean' ? (prev as any).taskbarBlurEnabled : false;
            const taskbarBlurPx = Number.isFinite(Number((prev as any).taskbarBlurPx)) ? Math.max(0, Math.min(40, Number((prev as any).taskbarBlurPx))) : 14;
            const topbarBlurEnabled = typeof (prev as any).topbarBlurEnabled === 'boolean' ? (prev as any).topbarBlurEnabled : false;
            const topbarBlurPx = Number.isFinite(Number((prev as any).topbarBlurPx)) ? Math.max(0, Math.min(40, Number((prev as any).topbarBlurPx))) : 12;
            const ollamaTtfbTimeoutMs = Number.isFinite(Number((prev as any).ollamaTtfbTimeoutMs))
                ? Math.max(5000, Math.min(600000, Number((prev as any).ollamaTtfbTimeoutMs)))
                : 180000;
            const warmupModels = Array.isArray((prev as any).ollamaWarmupModels) ? (prev as any).ollamaWarmupModels : [];
            const idleAutoTasksEnabled = typeof (prev as any).idleAutoTasksEnabled === 'boolean' ? (prev as any).idleAutoTasksEnabled : true;
            const idleAutoTasksTargetOpen = Number.isFinite(Number((prev as any).idleAutoTasksTargetOpen))
                ? Math.max(1, Math.min(10, Math.floor(Number((prev as any).idleAutoTasksTargetOpen))))
                : 1;
            const idleAutoTasksThrottleSec = Number.isFinite(Number((prev as any).idleAutoTasksThrottleSec))
                ? Math.max(15, Math.min(3600, Math.floor(Number((prev as any).idleAutoTasksThrottleSec))))
                : 60;
            const normalized: SystemSettings = {
                ...prev,
                activeModel: typeof prev.activeModel === 'string' ? prev.activeModel : '',
                theme: prev.theme || 'neu',
                wallpaper: prev.wallpaper || '#212529',
                soundEnabled: typeof (prev as any).soundEnabled === 'boolean' ? (prev as any).soundEnabled : true,
                soundVolume: Number.isFinite(Number((prev as any).soundVolume)) ? Math.max(0, Math.min(1, Number((prev as any).soundVolume))) : 0.6,
                soundStyle: ['balanced', 'soft', 'crisp', 'retro', 'ambient', 'cinematic', 'minimal', 'chime', 'tech', 'organic'].includes(String((prev as any).soundStyle)) ? String((prev as any).soundStyle) as any : 'soft',
                taskbarOpacity: Number.isFinite(Number(prev.taskbarOpacity)) ? Number(prev.taskbarOpacity) : 0.8,
                topbarOpacity: Number.isFinite(Number((prev as any).topbarOpacity)) ? Number((prev as any).topbarOpacity) : 0.8,
                desktopWallpaperOpacity,
                desktopDim,
                windowBlurEnabled,
                windowBlurPx,
                taskbarBlurEnabled,
                taskbarBlurPx,
                topbarBlurEnabled,
                topbarBlurPx,
                ollamaTtfbTimeoutMs,
                iconSize: prev.iconSize || 'medium',
                developerMode: typeof prev.developerMode === 'boolean' ? prev.developerMode : false,
                ollamaBaseUrl: prev.ollamaBaseUrl || 'http://localhost:11434',
                ollamaNumCtx: baseCtx,
                ollamaWarmup: typeof (prev as any).ollamaWarmup === 'boolean' ? (prev as any).ollamaWarmup : true,
                ollamaKeepAlive: typeof (prev as any).ollamaKeepAlive === 'string' && String((prev as any).ollamaKeepAlive || '').trim() ? String((prev as any).ollamaKeepAlive || '').trim() : '30m',
                ollamaWarmupMaxB: Number.isFinite(Number((prev as any).ollamaWarmupMaxB)) ? Number((prev as any).ollamaWarmupMaxB) : 14,
                ollamaWarmupModels: Array.from(new Set(warmupModels.map((m: any) => String(m || '').trim()).filter(Boolean))),
                autoThinkEnabled: typeof prev.autoThinkEnabled === 'boolean' ? prev.autoThinkEnabled : true,
                ollamaLiveKeepAfterFinish: typeof prev.ollamaLiveKeepAfterFinish === 'boolean' ? prev.ollamaLiveKeepAfterFinish : false,
                modelRoles: normalizedRoles,
                localBackupModel: typeof (prev as any).localBackupModel === 'string' ? String((prev as any).localBackupModel || '').trim() : '',
                idleAutoTasksEnabled,
                idleAutoTasksTargetOpen,
                idleAutoTasksThrottleSec,
                autonomyWindow: {
                    enabled: autonomyWindow.enabled ?? false,
                    startHour: Number.isFinite(Number(autonomyWindow.startHour)) ? Number(autonomyWindow.startHour) : 0,
                    endHour: Number.isFinite(Number(autonomyWindow.endHour)) ? Number(autonomyWindow.endHour) : 0
                },
                autonomyEnabled,
                autonomyScheduler,
                operatorMode: typeof prev.operatorMode === 'boolean' ? prev.operatorMode : true,
                apiKeys: { ollama: String((apiKeys as any).ollama || '') } as any,
                ftpConfig: {
                    host: String((ftpConfig as any).host || ''),
                    user: String((ftpConfig as any).user || ''),
                    pass: String((ftpConfig as any).pass || ''),
                    port: String((ftpConfig as any).port || '21'),
                    rootPath: String((ftpConfig as any).rootPath || '/'),
                    enabled: (ftpConfig as any).enabled === true
                },
                telegramConfig: {
                    botToken: String((telegramConfig as any).botToken || ''),
                    chatId: String((telegramConfig as any).chatId || ''),
                    enabled: (telegramConfig as any).enabled === true
                },
                realtimeSources: {
                    enabled: !!prev.realtimeSources?.enabled,
                    intervalMinutes: Number.isFinite(Number(prev.realtimeSources?.intervalMinutes)) ? Number(prev.realtimeSources?.intervalMinutes) : 60,
                    urls: Array.isArray(prev.realtimeSources?.urls) ? prev.realtimeSources?.urls.filter(Boolean) : []
                },
                terminalLogFilters: {
                    enabled: terminalLogFilters.enabled !== false,
                    system: terminalLogFilters.system !== false,
                    stdout: terminalLogFilters.stdout !== false,
                    stderr: terminalLogFilters.stderr !== false,
                    exec: terminalLogFilters.exec !== false,
                    fs: terminalLogFilters.fs !== false,
                    ftp: terminalLogFilters.ftp !== false,
                    thought: terminalLogFilters.thought !== false
                }
            };
            const unchanged =
                prev.ollamaBaseUrl === normalized.ollamaBaseUrl &&
                prev.ollamaNumCtx === normalized.ollamaNumCtx &&
                JSON.stringify(prev.modelRoles || {}) === JSON.stringify(normalized.modelRoles || {}) &&
                prev.autonomyWindow?.enabled === normalized.autonomyWindow.enabled &&
                prev.autonomyWindow?.startHour === normalized.autonomyWindow.startHour &&
                prev.autonomyWindow?.endHour === normalized.autonomyWindow.endHour &&
                prev.operatorMode === normalized.operatorMode &&
                prev.realtimeSources?.enabled === normalized.realtimeSources.enabled &&
                prev.realtimeSources?.intervalMinutes === normalized.realtimeSources.intervalMinutes &&
                JSON.stringify(prev.realtimeSources?.urls || []) === JSON.stringify(normalized.realtimeSources.urls) &&
                prev.terminalLogFilters?.enabled === normalized.terminalLogFilters?.enabled &&
                prev.terminalLogFilters?.system === normalized.terminalLogFilters?.system &&
                prev.terminalLogFilters?.stdout === normalized.terminalLogFilters?.stdout &&
                prev.terminalLogFilters?.stderr === normalized.terminalLogFilters?.stderr &&
                prev.terminalLogFilters?.exec === normalized.terminalLogFilters?.exec &&
                prev.terminalLogFilters?.fs === normalized.terminalLogFilters?.fs &&
                prev.terminalLogFilters?.ftp === normalized.terminalLogFilters?.ftp &&
                prev.terminalLogFilters?.thought === normalized.terminalLogFilters?.thought &&
                prev.autoThinkEnabled === normalized.autoThinkEnabled &&
                prev.ollamaLiveKeepAfterFinish === normalized.ollamaLiveKeepAfterFinish &&
                (prev as any).ollamaWarmup === (normalized as any).ollamaWarmup &&
                String((prev as any).ollamaKeepAlive || '') === String((normalized as any).ollamaKeepAlive || '') &&
                Number((prev as any).ollamaWarmupMaxB) === Number((normalized as any).ollamaWarmupMaxB) &&
                JSON.stringify((prev as any).ollamaWarmupModels || []) === JSON.stringify((normalized as any).ollamaWarmupModels || []) &&
                Number((prev as any).desktopWallpaperOpacity) === Number((normalized as any).desktopWallpaperOpacity) &&
                Number((prev as any).desktopDim) === Number((normalized as any).desktopDim) &&
                (prev as any).windowBlurEnabled === (normalized as any).windowBlurEnabled &&
                Number((prev as any).windowBlurPx) === Number((normalized as any).windowBlurPx) &&
                (prev as any).taskbarBlurEnabled === (normalized as any).taskbarBlurEnabled &&
                Number((prev as any).taskbarBlurPx) === Number((normalized as any).taskbarBlurPx) &&
                Number((prev as any).topbarOpacity) === Number((normalized as any).topbarOpacity) &&
                (prev as any).topbarBlurEnabled === (normalized as any).topbarBlurEnabled &&
                Number((prev as any).topbarBlurPx) === Number((normalized as any).topbarBlurPx) &&
                Number((prev as any).ollamaTtfbTimeoutMs) === Number((normalized as any).ollamaTtfbTimeoutMs) &&
                (prev as any).soundEnabled === (normalized as any).soundEnabled &&
                Number((prev as any).soundVolume) === Number((normalized as any).soundVolume) &&
                String((prev as any).soundStyle || '') === String((normalized as any).soundStyle || '') &&
                (prev as any).autonomyEnabled === (normalized as any).autonomyEnabled &&
                String((prev as any).autonomyScheduler || '') === String((normalized as any).autonomyScheduler || '') &&
                String((prev as any).localBackupModel || '') === String((normalized as any).localBackupModel || '') &&
                (prev as any).idleAutoTasksEnabled === (normalized as any).idleAutoTasksEnabled &&
                Number((prev as any).idleAutoTasksTargetOpen) === Number((normalized as any).idleAutoTasksTargetOpen) &&
                Number((prev as any).idleAutoTasksThrottleSec) === Number((normalized as any).idleAutoTasksThrottleSec);
            return unchanged ? prev : normalized;
        });
    }, []);

    const ftpConfig = settings.ftpConfig || { host: '', user: '', pass: '', port: '21', rootPath: '/', enabled: false };
    const telegramConfig = settings.telegramConfig || { botToken: '', chatId: '', enabled: false };

    // Refresh models whenever the provider changes
    useEffect(() => {
        handleRefreshModels();
    }, [settings.aiProvider]);

    const fetchSystemInfo = async () => {
        try {
            const res = await fetch('/api/system/status', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSystemInfo(data);
            }
        } catch (e) { console.error("Status fetch failed", e); }
    };

    const handleRefreshModels = async () => {
        setLoadingModels(true);
        try {
            const provider = settings.aiProvider;
            const apiKey = settings.apiKeys[provider];
            const res = await fetch(`/api/models?provider=${provider}&apiKey=${encodeURIComponent(apiKey || '')}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                const models = data[provider] || [];
                setAvailableModels(models);
            }
        } catch (e) { console.error("Model discovery failed", e); }
        setLoadingModels(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            setSettings({ ...settings, wallpaper: base64 });
            soundService.play('success');
            showModal('success', 'Tapeta załadowana', 'Obraz został wczytany do pamięci podręcznej ustawień. Kliknij "Zapisz", aby zastosować na stałe.');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await db.updateSettings(settings);
            setTheme(settings.theme);
            setWallpaper(settings.wallpaper);
            soundService.play('success');
            showModal('success', 'System State Saved', 'Wszystkie zmiany zostały zsynchronizowane z jadrzem GAI OS.');
        } catch (e: any) {
            showModal('error', 'Update Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = () => {
            handleSave();
        };
        window.addEventListener('gai:settings:apply', handler as EventListener);
        return () => window.removeEventListener('gai:settings:apply', handler as EventListener);
    }, [settings]);

    const inputClass = "w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none border border-transparent focus:border-blue-500/30 transition-all placeholder-neu-muted font-medium";
    const terminalLogFilters = settings.terminalLogFilters || {
        enabled: true,
        system: true,
        stdout: true,
        stderr: true,
        exec: true,
        fs: true,
        ftp: true,
        thought: true
    };
    const baseCtx = Number.isFinite(Number(settings.ollamaNumCtx)) ? Number(settings.ollamaNumCtx) : 4096;
    const ctxPresets = [4096, 8192, 12800, 16384, 25600, 32768, 40000, 65536, 131072];
    const getCtxSelectValue = (value: number) => ctxPresets.includes(value) ? String(value) : 'custom';
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => i);
    const buildModelOptions = (currentValue?: string) => {
        const options = availableModels.length > 0 ? [...availableModels] : [];
        if (currentValue && !options.some((m: any) => m.id === currentValue)) {
            options.unshift({ id: currentValue, displayName: currentValue });
        }
        return options;
    };

    const buildLocalModelOptions = (currentValue?: string) => {
        return buildModelOptions(currentValue)
            .filter((m: any) => !String(m?.id || '').includes(':cloud'));
    };

    const SidebarItem = ({ id, icon: Icon, label, color }: any) => (
        <button 
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab(id);
            }}
            onClick={(e) => {
                e.stopPropagation();
                setActiveTab(id);
            }}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all group
                ${activeTab === id 
                    ? 'bg-neu-base shadow-neu-pressed text-neu-text border border-neu-border/50' 
                    : 'hover:bg-white/5 text-neu-muted hover:text-neu-text'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${activeTab === id ? 'bg-neu-base shadow-neu-flat' : 'opacity-60'}`}>
                    <Icon size={18} className={activeTab === id ? color : ''} />
                </div>
                <span className="text-sm font-bold">{label}</span>
            </div>
            {activeTab === id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
        </button>
    );

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    return (
        <div className="flex h-full bg-neu-base text-neu-text font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 border-r border-neu-border flex flex-col p-6 gap-2 bg-neu-base shrink-0 overflow-y-auto no-scrollbar relative z-20 pointer-events-auto">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-neu-base shadow-neu-flat flex items-center justify-center border border-neu-border text-blue-500">
                        <SettingsIcon size={24} className="animate-[spin_10s_linear_infinite]" />
                    </div>
                    <div>
                        <div className="text-sm font-black tracking-tight">System Settings</div>
                        <div className="text-[10px] text-neu-muted uppercase tracking-[0.2em] font-bold">Kernel v6.0.4-LTS</div>
                    </div>
                </div>

                <div className="space-y-1">
                    <SidebarItem id="about" icon={Info} label="O systemie" color="text-blue-400" />
                    <SidebarItem id="display" icon={Palette} label="Personalizacja" color="text-pink-400" />
                    <SidebarItem id="ai" icon={Zap} label="Rdzeń AI" color="text-purple-400" />
                    <SidebarItem id="connectivity" icon={Wifi} label="Łączność" color="text-green-400" />
                    <SidebarItem id="dev" icon={Terminal} label="Deweloper" color="text-yellow-400" />
                </div>

                <div className="mt-auto p-5 rounded-[2rem] bg-neu-base shadow-neu-pressed border border-neu-border/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                             <Activity size={12} className="text-green-500" />
                             <span className="text-[10px] font-black text-neu-muted uppercase tracking-tighter">Resources</span>
                        </div>
                        <span className="text-[9px] font-mono text-green-500/80">ONLINE</span>
                    </div>
                    <div className="space-y-2">
                         <div className="flex justify-between text-[9px] font-bold text-neu-text/60"><span>CPU LOAD</span> <span>{Math.round((systemInfo?.load?.[0] || 0) * 100)}%</span></div>
                         <div className="h-1 bg-neu-dark rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${(systemInfo?.load?.[0] || 0) * 100}%`}}></div></div>
                         <div className="flex justify-between text-[9px] font-bold text-neu-text/60 mt-1"><span>MEMORY</span> <span>{formatBytes(systemInfo?.memory?.heapUsed)}</span></div>
                         <div className="h-1 bg-neu-dark rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: '45%'}}></div></div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-neu-base relative z-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-16">
                    
                    {/* ABOUT TAB */}
                    {activeTab === 'about' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-neu-base shadow-neu-flat flex items-center justify-center border border-neu-border p-4">
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center text-white font-black text-3xl">G</div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter">GAI Intelligence OS</h1>
                                    <p className="text-neu-muted font-medium mt-1">Autonomous Kernel Infrastructure • Build 2025.04</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-8 rounded-[2rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-4">
                                    <h4 className="font-bold flex items-center gap-2 mb-4 text-blue-400 uppercase tracking-widest text-[10px]"><Server size={14}/> System Hardware</h4>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">Kernel Version</span><span className="text-xs font-bold font-mono">6.0.4-GAI-LTS</span></div>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">Host Platform</span><span className="text-xs font-bold capitalize">{systemInfo?.platform || 'Linux Container'}</span></div>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">System Arch</span><span className="text-xs font-bold">{systemInfo?.arch || 'x64'}</span></div>
                                    <div className="flex justify-between items-center py-2"><span className="text-neu-muted text-xs">Total Uptime</span><span className="text-xs font-bold text-blue-400">{Math.floor((systemInfo?.uptime || 0) / 3600)}h {Math.floor(((systemInfo?.uptime || 0) % 3600) / 60)}m</span></div>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-4">
                                    <h4 className="font-bold flex items-center gap-2 mb-4 text-purple-400 uppercase tracking-widest text-[10px]"><HardDrive size={14}/> Virtual File System</h4>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">Persistence Path</span><code className="text-[10px] font-bold">{systemInfo?.persistence?.path || '/app/data'}</code></div>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">VFS Status</span><span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle size={12}/> {systemInfo?.persistence?.status || 'MOUNTED'}</span></div>
                                    <div className="flex justify-between items-center py-2 border-b border-neu-light/5"><span className="text-neu-muted text-xs">Storage Encryption</span><span className="text-xs font-bold">AES-256 Enabled</span></div>
                                    <div className="flex justify-between items-center py-2"><span className="text-neu-muted text-xs">Sync Frequency</span><span className="text-xs font-bold">Real-time (Memory-Mirror)</span></div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* DISPLAY TAB */}
                    {activeTab === 'display' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                             <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Palette className="text-pink-400"/> Wygląd i Środowisko</h3>
                             
                             <div className="p-10 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-10">
                                <div className="flex flex-col lg:flex-row gap-12">
                                    <div className="w-full lg:w-1/2 space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Podgląd pulpitu</label>
                                            <div 
                                                className="aspect-video w-full rounded-3xl shadow-neu-pressed border border-neu-border bg-cover bg-center transition-all duration-700 relative group overflow-hidden"
                                                style={(settings.wallpaper || '#212529').startsWith('#') ? { backgroundColor: settings.wallpaper || '#212529' } : { backgroundImage: `url(${settings.wallpaper || ''})` }}
                                            >
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 backdrop-blur-xl rounded-full text-white hover:scale-110 transition-transform shadow-xl">
                                                        <Upload size={28}/>
                                                    </button>
                                                    <span className="text-white text-xs font-bold">Wgraj własne zdjęcie</span>
                                                </div>
                                            </div>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Adres URL tapety lub HEX</label>
                                            <input value={settings.wallpaper || ''} onChange={(e) => setSettings({...settings, wallpaper: e.target.value})} className={inputClass} placeholder="e.g. #212529 or https://..." />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Motyw Systemowy</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    {id: 'neu', label: 'Neumorphism'}, 
                                                    {id: 'glass', label: 'Aero Glass'}, 
                                                    {id: 'classic', label: 'Ubuntu Yaru'}, 
                                                    {id: 'windows10', label: 'Windows 10'},
                                                    {id: 'cyberpunk', label: 'Cyberpunk Neon'},
                                                    {id: 'monochrome', label: 'Monochrome Pro'}
                                                ].map(t => (
                                                    <button key={t.id} onClick={() => setSettings({...settings, theme: t.id as any})} className={`p-5 rounded-2xl border-2 text-sm font-bold transition-all capitalize flex items-center justify-between ${settings.theme === t.id ? 'bg-neu-base shadow-neu-pressed border-pink-500/40 text-pink-400' : 'bg-neu-base shadow-neu-flat border-transparent text-neu-muted hover:text-neu-text'}`}>
                                                        {t.label} {settings.theme === t.id && <CheckCircle size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Styl dźwięków</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    {id: 'soft', label: 'Soft'}, 
                                                    {id: 'balanced', label: 'Balanced'}, 
                                                    {id: 'crisp', label: 'Crisp'}, 
                                                    {id: 'retro', label: 'Retro'},
                                                    {id: 'ambient', label: 'Ambient'},
                                                    {id: 'cinematic', label: 'Cinematic'},
                                                    {id: 'minimal', label: 'Minimal'},
                                                    {id: 'chime', label: 'Chime'},
                                                    {id: 'tech', label: 'Tech'},
                                                    {id: 'organic', label: 'Organic'},
                                                    {id: 'real', label: 'Real Sounds (WAV)'}
                                                ].map(s => (
                                                    <button key={s.id} onClick={() => setSettings({...settings, soundStyle: s.id as any})} className={`p-5 rounded-2xl border-2 text-sm font-bold transition-all capitalize flex items-center justify-between ${settings.soundStyle === s.id ? 'bg-neu-base shadow-neu-pressed border-purple-500/40 text-purple-400' : 'bg-neu-base shadow-neu-flat border-transparent text-neu-muted hover:text-neu-text'}`}>
                                                        {s.label} {settings.soundStyle === s.id && <CheckCircle size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Zestaw Ikon</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    {id: 'default', label: 'Default (Line)'},
                                                    {id: 'thin', label: 'Ultra Thin'},
                                                    {id: 'solid', label: 'Solid (Bold)'},
                                                    {id: 'neon', label: 'Neon Glow'}
                                                ].map(i => (
                                                    <button key={i.id} onClick={() => setSettings({...settings, iconTheme: i.id as any})} className={`p-5 rounded-2xl border-2 text-sm font-bold transition-all capitalize flex items-center justify-between ${settings.iconTheme === i.id ? 'bg-neu-base shadow-neu-pressed border-blue-500/40 text-blue-400' : 'bg-neu-base shadow-neu-flat border-transparent text-neu-muted hover:text-neu-text'}`}>
                                                        {i.label} {settings.iconTheme === i.id && <CheckCircle size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Rozmiar ikon pulpitu</label>
                                            <div className="flex bg-neu-dark/30 p-1.5 rounded-2xl border border-neu-border">
                                                {['small', 'medium', 'large'].map(s => (
                                                    <button key={s} onClick={() => setSettings({...settings, iconSize: s as any})} className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${settings.iconSize === s ? 'bg-neu-base shadow-neu-flat text-pink-400 border border-pink-500/20' : 'text-neu-muted hover:text-neu-text'}`}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Przezroczystość paska zadań ({Math.round(settings.taskbarOpacity * 100)}%)</label>
                                            <input type="range" min="0.1" max="1" step="0.05" value={settings.taskbarOpacity} onChange={(e) => setSettings({...settings, taskbarOpacity: parseFloat(e.target.value)})} className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Przezroczystość paska górnego ({Math.round(((settings as any).topbarOpacity ?? 0.8) * 100)}%)</label>
                                            <input type="range" min="0.1" max="1" step="0.05" value={(settings as any).topbarOpacity ?? 0.8} onChange={(e) => setSettings({...settings, topbarOpacity: parseFloat(e.target.value) as any})} className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-neu-border/30">
                                            <div className="space-y-5">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Tło pulpitu</div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                                        Widoczność tapety ({Math.round(((settings.desktopWallpaperOpacity ?? 0.3) * 100))}%)
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.02"
                                                        value={settings.desktopWallpaperOpacity ?? 0.3}
                                                        onChange={(e) => setSettings({ ...settings, desktopWallpaperOpacity: parseFloat(e.target.value) })}
                                                        className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                                        Przyciemnienie pulpitu ({Math.round(((settings.desktopDim ?? 0.2) * 100))}%)
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="0.85"
                                                        step="0.02"
                                                        value={settings.desktopDim ?? 0.2}
                                                        onChange={(e) => setSettings({ ...settings, desktopDim: parseFloat(e.target.value) })}
                                                        className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Efekt szkła</div>

                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Blur paska zadań</div>
                                                        <div className="text-[9px] text-neu-muted">Backgound blur dla taskbara (niezależnie od motywu)</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettings(prev => ({ ...prev, taskbarBlurEnabled: !prev.taskbarBlurEnabled }))}
                                                        className={`w-12 h-6 rounded-full relative transition-all ${(settings.taskbarBlurEnabled === true) ? 'bg-pink-500/30' : 'bg-neu-dark'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${(settings.taskbarBlurEnabled === true) ? 'left-7 bg-pink-500' : 'left-1 bg-neu-muted'}`} />
                                                    </button>
                                                </div>
                                                <div className={`space-y-3 ${(settings.taskbarBlurEnabled === true) ? '' : 'opacity-40 pointer-events-none'}`}>
                                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                                        Siła blur taskbara ({Math.round((settings.taskbarBlurPx ?? 14))}px)
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="40"
                                                        step="1"
                                                        value={settings.taskbarBlurPx ?? 14}
                                                        onChange={(e) => setSettings({ ...settings, taskbarBlurPx: parseInt(e.target.value, 10) })}
                                                        className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-neu-border/30">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Blur paska górnego</div>
                                                        <div className="text-[9px] text-neu-muted">Backgound blur dla topbara systemowego</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettings(prev => ({ ...prev, topbarBlurEnabled: !(prev as any).topbarBlurEnabled }))}
                                                        className={`w-12 h-6 rounded-full relative transition-all ${((settings as any).topbarBlurEnabled === true) ? 'bg-pink-500/30' : 'bg-neu-dark'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${((settings as any).topbarBlurEnabled === true) ? 'left-7 bg-pink-500' : 'left-1 bg-neu-muted'}`} />
                                                    </button>
                                                </div>
                                                <div className={`space-y-3 ${((settings as any).topbarBlurEnabled === true) ? '' : 'opacity-40 pointer-events-none'}`}>
                                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                                        Siła blur topbara ({Math.round(Number((settings as any).topbarBlurPx ?? 12))}px)
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="40"
                                                        step="1"
                                                        value={Number((settings as any).topbarBlurPx ?? 12)}
                                                        onChange={(e) => setSettings({ ...settings, topbarBlurPx: parseInt(e.target.value, 10) as any })}
                                                        className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-neu-border/30">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Blur okien</div>
                                                        <div className="text-[9px] text-neu-muted">Backgound blur dla ramek okien</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettings(prev => ({ ...prev, windowBlurEnabled: !prev.windowBlurEnabled }))}
                                                        className={`w-12 h-6 rounded-full relative transition-all ${(settings.windowBlurEnabled === true) ? 'bg-pink-500/30' : 'bg-neu-dark'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${(settings.windowBlurEnabled === true) ? 'left-7 bg-pink-500' : 'left-1 bg-neu-muted'}`} />
                                                    </button>
                                                </div>
                                                <div className={`space-y-3 ${(settings.windowBlurEnabled === true) ? '' : 'opacity-40 pointer-events-none'}`}>
                                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                                        Siła blur okien ({Math.round((settings.windowBlurPx ?? 16))}px)
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="40"
                                                        step="1"
                                                        value={settings.windowBlurPx ?? 16}
                                                        onChange={(e) => setSettings({ ...settings, windowBlurPx: parseInt(e.target.value, 10) })}
                                                        className="w-full accent-pink-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* AI CORE TAB */}
                    {activeTab === 'ai' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Zap className="text-purple-400"/> AI Kernel Matrix</h3>
                                    <p className="text-neu-muted text-sm mt-1">Zarządzaj lokalnym modelem Ollama.</p>
                                </div>
                                <button onClick={handleRefreshModels} className="px-5 py-2.5 bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-purple-400 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all">
                                    <RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''}/> Odśwież Discovery
                                </button>
                            </div>

                            <div className="p-10 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-12">
                                {/* Active Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-neu-border/30">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Aktywny Dostawca</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['ollama'] as AIProvider[]).map(p => (
                                                <button key={p} onClick={() => setSettings({...settings, aiProvider: p})} className={`py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${settings.aiProvider === p ? 'bg-neu-base shadow-neu-pressed border-purple-500/40 text-purple-400' : 'bg-neu-base shadow-neu-flat border-transparent text-neu-muted hover:text-neu-text'}`}>
                                                    {p.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Dostępne Modele ({settings.aiProvider})</label>
                                        <select 
                                            value={settings.activeModel} 
                                            onChange={(e) => setSettings(prev => ({ ...prev, activeModel: e.target.value }))} 
                                            className={`${inputClass} appearance-none cursor-pointer`}
                                            disabled={loadingModels}
                                        >
                                        {loadingModels ? (
                                            <option>Loading models...</option>
                                        ) : buildModelOptions(settings.activeModel).length > 0 ? (
                                            buildModelOptions(settings.activeModel).map((m: any) => (
                                                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                                            ))
                                        ) : (
                                            <option value={settings.activeModel}>{settings.activeModel}</option>
                                        )}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Local Backup Model (fallback)</div>
                                            <div className="text-[9px] text-neu-muted">Używany gdy wybrany model jest niedostępny na lokalnej Ollamie.</div>
                                        </div>
                                        <button
                                            onClick={() => setSettings(prev => {
                                                const enabled = !!String((prev as any).localBackupModel || '').trim();
                                                if (enabled) return { ...prev, localBackupModel: '' };
                                                const preferred = [
                                                    String(prev.activeModel || '').trim(),
                                                    String(prev.modelRoles?.chat || '').trim(),
                                                    String(prev.modelRoles?.coding || '').trim()
                                                ].find(m => m && !m.includes(':cloud'));
                                                const localOptions = buildLocalModelOptions(preferred || '');
                                                const firstLocal = String(localOptions?.[0]?.id || '').trim();
                                                const next = preferred || firstLocal || 'qwen3:latest';
                                                return { ...prev, localBackupModel: next };
                                            })}
                                            className={`w-12 h-6 rounded-full relative transition-all ${String((settings as any).localBackupModel || '').trim() ? 'bg-blue-500/30' : 'bg-neu-dark'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${String((settings as any).localBackupModel || '').trim() ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>

                                    <div className={`space-y-2 ${String((settings as any).localBackupModel || '').trim() ? '' : 'opacity-40 pointer-events-none'}`}>
                                        <label className="text-[9px] font-bold text-neu-muted uppercase">Model zapasowy</label>
                                        <select
                                            value={String((settings as any).localBackupModel || '').trim()}
                                            onChange={(e) => setSettings(prev => ({ ...prev, localBackupModel: e.target.value }))}
                                            className={`${inputClass} appearance-none cursor-pointer`}
                                            disabled={loadingModels}
                                        >
                                            {loadingModels ? (
                                                <option>Loading models...</option>
                                            ) : buildLocalModelOptions(String((settings as any).localBackupModel || '').trim()).length > 0 ? (
                                                buildLocalModelOptions(String((settings as any).localBackupModel || '').trim()).map((m: any) => (
                                                    <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                                                ))
                                            ) : (
                                                <option value={String((settings as any).localBackupModel || '').trim()}>{String((settings as any).localBackupModel || '').trim()}</option>
                                            )}
                                        </select>
                                        <div className="text-[9px] text-neu-muted px-1">
                                            Podpowiedź: ustaw tu lokalny model (bez <span className="font-bold">:cloud</span>), np. <span className="font-mono">qwen3:latest</span>.
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Zawsze generuj taski gdy idle</div>
                                            <div className="text-[9px] text-neu-muted">Jeśli nie ma żadnych tasków, kernel sam tworzy nowe (nawet bez objectives).</div>
                                        </div>
                                        <button
                                            onClick={() => setSettings(prev => ({ ...prev, idleAutoTasksEnabled: !(prev.idleAutoTasksEnabled === false) }))}
                                            className={`w-12 h-6 rounded-full relative transition-all ${(settings.idleAutoTasksEnabled !== false) ? 'bg-blue-500/30' : 'bg-neu-dark'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${(settings.idleAutoTasksEnabled !== false) ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>

                                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${(settings.idleAutoTasksEnabled !== false) ? '' : 'opacity-40 pointer-events-none'}`}>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-neu-muted uppercase">Docelowa liczba otwartych tasków</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={Number.isFinite(Number(settings.idleAutoTasksTargetOpen)) ? Number(settings.idleAutoTasksTargetOpen) : 1}
                                                onChange={(e) => setSettings(prev => ({ ...prev, idleAutoTasksTargetOpen: Number(e.target.value || 1) }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-neu-muted uppercase">Throttle (sek.)</label>
                                            <input
                                                type="number"
                                                min={15}
                                                max={3600}
                                                value={Number.isFinite(Number(settings.idleAutoTasksThrottleSec)) ? Number(settings.idleAutoTasksThrottleSec) : 60}
                                                onChange={(e) => setSettings(prev => ({ ...prev, idleAutoTasksThrottleSec: Number(e.target.value || 60) }))}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Tryb Deweloperski (God Mode)</div>
                                            <div className="text-[9px] text-neu-muted text-red-400">UWAGA: Zdejmuje blokady shella. GAI zyskuje pełny dostęp (rm, sudo, curl).</div>
                                        </div>
                                        <button
                                            onClick={() => setSettings(prev => ({ ...prev, developerMode: !prev.developerMode }))}
                                            className={`w-12 h-6 rounded-full relative transition-all ${(settings.developerMode) ? 'bg-red-500/30' : 'bg-neu-dark'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${(settings.developerMode) ? 'left-7 bg-red-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Adres Ollama</label>
                                    <input 
                                        value={settings.ollamaBaseUrl || ''}
                                        onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                                        className={inputClass}
                                        placeholder="http://localhost:11434"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Ollama API Key (opcjonalnie)</label>
                                    <input
                                        type="password"
                                        value={String(settings.apiKeys?.ollama || '')}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            apiKeys: { ...(prev.apiKeys || { ollama: '' }), ollama: e.target.value }
                                        }))}
                                        className={inputClass}
                                        placeholder="Bearer … lub token"
                                    />
                                    <div className="text-[9px] text-neu-muted px-1">
                                        Jeśli używasz zdalnego endpointu (np. Ollama Cloud / reverse proxy), backend dołączy ten klucz jako nagłówek Authorization.
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">
                                        Timeout pierwszego tokena (TTFB) ({Math.round(((settings.ollamaTtfbTimeoutMs ?? 180000) / 1000))}s)
                                    </label>
                                    <div className="text-[9px] text-neu-muted">
                                        Jeśli duże modele uruchamiają się na CPU, pierwszy token może pojawić się po 1–5 minutach. Zwiększ, jeśli modele „nie trybią”.
                                    </div>
                                    <input
                                        type="range"
                                        min="30000"
                                        max="600000"
                                        step="15000"
                                        value={settings.ollamaTtfbTimeoutMs ?? 180000}
                                        onChange={(e) => setSettings({ ...settings, ollamaTtfbTimeoutMs: parseInt(e.target.value, 10) })}
                                        className="w-full accent-purple-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Warmup Ollama (Start)</label>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Warmup włączony</div>
                                                <div className="text-[9px] text-neu-muted">Ładuje wybrane modele do RAM przy starcie GAIOS</div>
                                            </div>
                                            <button onClick={() => setSettings(prev => ({ ...prev, ollamaWarmup: !(prev.ollamaWarmup !== false) }))} className={`w-12 h-6 rounded-full relative transition-all ${(settings.ollamaWarmup !== false) ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${(settings.ollamaWarmup !== false) ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">KeepAlive</label>
                                                <input
                                                    value={settings.ollamaKeepAlive || ''}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, ollamaKeepAlive: e.target.value }))}
                                                    className={inputClass}
                                                    placeholder="np. 30m"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">Max B (limit)</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={70}
                                                    value={Number.isFinite(Number(settings.ollamaWarmupMaxB)) ? Number(settings.ollamaWarmupMaxB) : 14}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, ollamaWarmupMaxB: Number(e.target.value || 14) }))}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-neu-muted uppercase">Modele do warmup (opcjonalnie)</label>
                                            <div className="text-[9px] text-neu-muted px-1">
                                                Jeśli lista jest pusta, system użyje aktywnego modelu + ról (chat/writing/coding).
                                            </div>
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-3 space-y-2">
                                                {(availableModels.length ? availableModels : buildModelOptions()).map((m: any) => {
                                                    const id = String(m?.id || '').trim();
                                                    if (!id) return null;
                                                    const selected = Array.isArray(settings.ollamaWarmupModels) && settings.ollamaWarmupModels.includes(id);
                                                    return (
                                                        <button
                                                            key={`warmup-${id}`}
                                                            onClick={() => setSettings(prev => {
                                                                const current = Array.isArray(prev.ollamaWarmupModels) ? prev.ollamaWarmupModels : [];
                                                                const set = new Set(current);
                                                                if (set.has(id)) set.delete(id);
                                                                else set.add(id);
                                                                return { ...prev, ollamaWarmupModels: Array.from(set) };
                                                            })}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all border ${selected ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-neu-base border-transparent text-neu-muted hover:text-neu-text hover:bg-white/5'}`}
                                                        >
                                                            <span className="text-xs font-bold truncate">{m.displayName || id}</span>
                                                            <span className={`text-[10px] font-black ${selected ? 'text-blue-300' : 'text-neu-muted'}`}>{selected ? 'ON' : 'OFF'}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setSettings(prev => ({ ...prev, ollamaWarmupModels: [] }))}
                                                    className="px-4 py-2 bg-neu-base shadow-neu-flat active:shadow-neu-pressed rounded-2xl text-xs font-bold text-neu-muted hover:text-neu-text transition-all"
                                                >
                                                    Wyczyść listę
                                                </button>
                                                <button
                                                    onClick={() => setSettings(prev => ({ ...prev, ollamaWarmupModels: [prev.activeModel] }))}
                                                    className="px-4 py-2 bg-neu-base shadow-neu-flat active:shadow-neu-pressed rounded-2xl text-xs font-bold text-neu-muted hover:text-neu-text transition-all"
                                                >
                                                    Tylko aktywny
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-4 bg-neu-base shadow-neu-flat border border-neu-border rounded-xl space-y-4">
                                        <div className="flex items-center gap-3 text-neu-muted mb-2">
                                            <Brain size={18} className="text-indigo-400" />
                                            <span className="font-bold text-xs uppercase">Agentic System Configuration</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Główny Mózg (Orchestrator)</label>
                                            <select 
                                                value={settings.agenticSystem?.masterModel || ''} 
                                                onChange={(e) => setSettings({ 
                                                    ...settings, 
                                                    agenticSystem: { ...settings.agenticSystem, masterModel: e.target.value } 
                                                })}
                                                className={`${inputClass} appearance-none cursor-pointer`}
                                            >
                                                <option value="">Wybierz Mózg...</option>
                                                {((settings.agenticSystem?.allowedModels?.length > 0) 
                                                    ? settings.agenticSystem.allowedModels.map(m => ({ id: m, displayName: m })) 
                                                    : availableModels).map((m: any) => (
                                                    <option key={m.id || m} value={m.id || m}>{m.displayName || m.id || m}</option>
                                                ))}
                                            </select>
                                            <div className="text-[9px] text-neu-muted px-1">
                                                To jest główny model odpowiedzialny za planowanie, delegowanie zadań i zarządzanie autonomią.
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Dozwolone Modele (Pula)</label>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-xl border border-neu-border bg-neu-base shadow-neu-pressed p-2 space-y-1">
                                                {(availableModels.length ? availableModels : buildModelOptions()).map((m: any) => {
                                                    const id = String(m?.id || '').trim();
                                                    if (!id) return null;
                                                    const allowed = settings.agenticSystem?.allowedModels || [];
                                                    const selected = allowed.includes(id);
                                                    
                                                    return (
                                                        <button
                                                            key={`allowed-${id}`}
                                                            onClick={() => setSettings(prev => {
                                                                const current = prev.agenticSystem?.allowedModels || [];
                                                                const next = current.includes(id) 
                                                                    ? current.filter(x => x !== id) 
                                                                    : [...current, id];
                                                                return { 
                                                                    ...prev, 
                                                                    agenticSystem: { ...prev.agenticSystem, allowedModels: next } 
                                                                };
                                                            })}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all border ${selected ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-neu-base border-transparent text-neu-muted hover:text-neu-text hover:bg-white/5'}`}
                                                        >
                                                            <span className="text-xs font-bold truncate">{m.displayName || id}</span>
                                                            <div className={`w-3 h-3 rounded border flex items-center justify-center ${selected ? 'bg-indigo-500 border-indigo-500' : 'border-neu-muted'}`}>
                                                                {selected && <CheckCircle size={10} className="text-white" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="text-[9px] text-neu-muted px-1">
                                                Zaznacz modele, z których Mózg może korzystać przy tworzeniu nowych agentów.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Brain Context Window</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={getCtxSelectValue(baseCtx)}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                if (next === 'custom') {
                                                    setSettings({ ...settings, ollamaNumCtx: 8192 });
                                                    return;
                                                }
                                                const nextCtx = Number(next);
                                                if (!Number.isFinite(nextCtx) || nextCtx <= 0) return;
                                                setSettings({ ...settings, ollamaNumCtx: nextCtx });
                                            }}
                                            className={`${inputClass} appearance-none cursor-pointer`}
                                        >
                                            {ctxPresets.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                            <option value="custom">Custom</option>
                                        </select>
                                        {getCtxSelectValue(baseCtx) === 'custom' && (
                                            <input
                                                type="number"
                                                value={baseCtx}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const nextCtx = Number(raw);
                                                    if (!Number.isFinite(nextCtx) || nextCtx <= 0) return;
                                                    setSettings({ ...settings, ollamaNumCtx: nextCtx });
                                                }}
                                                className={`${inputClass} w-32`}
                                                placeholder="np. 8192"
                                            />
                                        )}
                                    </div>
                                    <div className="text-[9px] text-neu-muted px-1">
                                        Określa maksymalną długość kontekstu dla Mózgu. Moduły mogą mieć własne ustawienia dobierane dynamicznie.
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Auto /think</div>
                                            <div className="text-[9px] text-neu-muted">Dodaje /think dla planowania, architektury i debug</div>
                                        </div>
                                        <button onClick={() => setSettings(prev => ({ ...prev, autoThinkEnabled: !prev.autoThinkEnabled }))} className={`w-12 h-6 rounded-full relative transition-all ${settings.autoThinkEnabled ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.autoThinkEnabled ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Chmurka Ollama</div>
                                            <div className="text-[9px] text-neu-muted">Zostaw po zakończeniu oczekiwania</div>
                                        </div>
                                        <button onClick={() => setSettings(prev => ({ ...prev, ollamaLiveKeepAfterFinish: !prev.ollamaLiveKeepAfterFinish }))} className={`w-12 h-6 rounded-full relative transition-all ${settings.ollamaLiveKeepAfterFinish ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.ollamaLiveKeepAfterFinish ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">System Instruction (Osobowość Jądra)</label>
                                    <textarea 
                                        value={settings.systemPrompt} 
                                        onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})} 
                                        className={`${inputClass} font-mono text-[11px] h-48 leading-relaxed resize-none p-5`}
                                        placeholder="Zdefiniuj jak GAI powinno się zachowywać i jakie ma mieć cele..."
                                    />
                                    <div className="flex justify-between items-center px-1">
                                         <span className="text-[9px] text-neu-muted font-bold">TOKEN COUNT: ~{Math.round(settings.systemPrompt.length / 4)}</span>
                                         <span className="text-[9px] text-neu-muted font-bold">MODE: PERSISTENT INSTRUCTION</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Autonomiczne cele</label>
                                    <textarea 
                                        value={settings.autonomousObjectives || ''} 
                                        onChange={(e) => setSettings({...settings, autonomousObjectives: e.target.value})} 
                                        className={`${inputClass} font-mono text-[11px] h-32 leading-relaxed resize-none p-5`}
                                        placeholder="Przykład: Utrzymuj świeżość bloga, analizuj trendy, generuj 3 artykuły tygodniowo..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Źródła realtime</div>
                                            <div className="text-[9px] text-neu-muted">Jeśli lista pusta, system sam wyszukuje nowinki z internetu</div>
                                        </div>
                                        <button onClick={() => setSettings(prev => {
                                            const base = prev.realtimeSources || { enabled: false, intervalMinutes: 60, urls: [] };
                                            return { ...prev, realtimeSources: { ...base, enabled: !base.enabled } };
                                        })} className={`w-12 h-6 rounded-full relative transition-all ${settings.realtimeSources?.enabled ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.realtimeSources?.enabled ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-neu-muted uppercase">Interwał (min)</label>
                                            <input
                                                type="number"
                                                min={5}
                                                max={1440}
                                                value={settings.realtimeSources?.intervalMinutes ?? 60}
                                                onChange={(e) => setSettings(prev => {
                                                    const base = prev.realtimeSources || { enabled: false, intervalMinutes: 60, urls: [] };
                                                    return { ...prev, realtimeSources: { ...base, intervalMinutes: parseInt(e.target.value || '60') } };
                                                })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-1">
                                            <label className="text-[9px] font-bold text-neu-muted uppercase">Lista URL (1 na linię)</label>
                                            <textarea
                                                value={(settings.realtimeSources?.urls || []).join('\n')}
                                                onChange={(e) => setSettings(prev => {
                                                    const base = prev.realtimeSources || { enabled: false, intervalMinutes: 60, urls: [] };
                                                    return { ...prev, realtimeSources: { ...base, urls: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) } };
                                                })}
                                                className={`${inputClass} font-mono text-[11px] h-28 leading-relaxed resize-none`}
                                                placeholder="Pozostaw puste, aby użyć automatycznego wyszukiwania"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Informacje systemowe w terminalu</div>
                                            <div className="text-[9px] text-neu-muted">Wybierz typy logów wyświetlane w terminalu</div>
                                        </div>
                                        <button onClick={() => setSettings(prev => ({
                                            ...prev,
                                            terminalLogFilters: { ...terminalLogFilters, enabled: !terminalLogFilters.enabled }
                                        }))} className={`w-12 h-6 rounded-full relative transition-all ${terminalLogFilters.enabled ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${terminalLogFilters.enabled ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { key: 'system', label: 'System' },
                                            { key: 'stdout', label: 'Stdout' },
                                            { key: 'stderr', label: 'Stderr' },
                                            { key: 'exec', label: 'Exec' },
                                            { key: 'fs', label: 'FS' },
                                            { key: 'ftp', label: 'FTP' },
                                            { key: 'thought', label: 'Thought' }
                                        ].map(option => (
                                            <button
                                                key={option.key}
                                                onClick={() => setSettings(prev => ({
                                                    ...prev,
                                                    terminalLogFilters: {
                                                        ...terminalLogFilters,
                                                        [option.key]: !terminalLogFilters[option.key as keyof typeof terminalLogFilters]
                                                    }
                                                }))}
                                                className={`px-4 py-2 rounded-2xl text-[9px] font-black border-2 transition-all uppercase tracking-widest ${terminalLogFilters[option.key as keyof typeof terminalLogFilters] ? 'bg-neu-base shadow-neu-pressed border-blue-500/40 text-blue-400' : 'bg-neu-base shadow-neu-flat border-transparent text-neu-muted hover:text-neu-text'}`}
                                                disabled={!terminalLogFilters.enabled}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONNECTIVITY TAB */}
                    {activeTab === 'connectivity' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                             <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Wifi className="text-green-400"/> Łączność i Mosty Systemowe</h3>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="p-8 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Server size={20}/></div>
                                            <h4 className="font-bold text-sm">FTP Remote Server</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <input value={ftpConfig.host} onChange={(e) => setSettings({...settings, ftpConfig: {...ftpConfig, host: e.target.value}})} className={inputClass} placeholder="FTP Host (e.g. ftp.example.com)" />
                                        <div className="flex gap-4">
                                            <input value={ftpConfig.user} onChange={(e) => setSettings({...settings, ftpConfig: {...ftpConfig, user: e.target.value}})} className={inputClass} placeholder="Username" />
                                            <input type="password" value={ftpConfig.pass} onChange={(e) => setSettings({...settings, ftpConfig: {...ftpConfig, pass: e.target.value}})} className={inputClass} placeholder="Password" />
                                        </div>
                                        <div className="flex gap-4">
                                            <input value={ftpConfig.port} onChange={(e) => setSettings({...settings, ftpConfig: {...ftpConfig, port: e.target.value}})} className={inputClass} placeholder="Port (21)" />
                                            <input value={ftpConfig.rootPath} onChange={(e) => setSettings({...settings, ftpConfig: {...ftpConfig, rootPath: e.target.value}})} className={inputClass} placeholder="Root Path (/)" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-6 lg:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Send size={20}/></div>
                                            <h4 className="font-bold text-sm">Telegram Bot Notifications</h4>
                                        </div>
                                        <button onClick={() => setSettings({...settings, telegramConfig: {...telegramConfig, enabled: !telegramConfig.enabled}})} className={`w-12 h-6 rounded-full relative transition-all ${telegramConfig.enabled ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${telegramConfig.enabled ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="password" value={telegramConfig.botToken} onChange={(e) => setSettings({...settings, telegramConfig: {...telegramConfig, botToken: e.target.value}})} className={inputClass} placeholder="Bot API Token" />
                                        <input value={telegramConfig.chatId} onChange={(e) => setSettings({...settings, telegramConfig: {...telegramConfig, chatId: e.target.value}})} className={inputClass} placeholder="Target Chat ID" />
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* DEVELOPER TAB */}
                    {activeTab === 'dev' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                             <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Terminal className="text-yellow-400"/> Kernel & Developer Engine</h3>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-10 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm flex items-center gap-2"><Power size={14} className="text-green-400"/> Autonomous Heartbeat</h4>
                                            <p className="text-[10px] text-neu-muted font-bold uppercase tracking-widest">Aktywność Jądra Myślowego</p>
                                        </div>
                                        <button onClick={() => {
                                            const enabledNow = typeof settings.autonomyEnabled === 'boolean' ? settings.autonomyEnabled : settings.heartbeat.enabled;
                                            const nextEnabled = !enabledNow;
                                            setSettings({
                                                ...settings,
                                                autonomyEnabled: nextEnabled,
                                                heartbeat: { ...settings.heartbeat, enabled: nextEnabled }
                                            });
                                        }} className={`w-14 h-7 rounded-full relative transition-all ${(settings.autonomyEnabled ?? settings.heartbeat.enabled) ? 'bg-green-500/30' : 'bg-neu-dark'}`}>
                                            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${(settings.autonomyEnabled ?? settings.heartbeat.enabled) ? 'left-8 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'left-1 bg-neu-muted'}`} />
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black text-neu-muted uppercase tracking-widest ml-1">Częstotliwość Pulsu</label>
                                            <span className="text-sm font-black text-blue-400 font-mono">{settings.heartbeat.intervalSeconds}s</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="600"
                                            step="10"
                                            value={settings.heartbeat.intervalSeconds}
                                            onChange={(e) => setSettings({ ...settings, heartbeat: { ...settings.heartbeat, intervalSeconds: parseInt(e.target.value) } })}
                                            disabled={(settings.autonomyScheduler ?? 'heartbeat') !== 'heartbeat'}
                                            className={`w-full accent-blue-500 h-2 bg-neu-dark rounded-full ${(settings.autonomyScheduler ?? 'heartbeat') !== 'heartbeat' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                        />
                                        <p className="text-[9px] text-neu-muted italic leading-relaxed">
                                            {(settings.autonomyScheduler ?? 'heartbeat') === 'heartbeat'
                                                ? 'Puls jądra określa co ile sekund AI analizuje stan systemu i wykonuje akcje autonomiczne.'
                                                : 'Tryb event-driven: puls jest ignorowany — autonomia uruchamia się tylko po zdarzeniach (np. nowe zadanie, update taska, zakończenie komendy).'}
                                        </p>
                                    </div>
                                    <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Scheduler autonomii</div>
                                                <div className="text-[9px] text-neu-muted">Wybierz pętlę heartbeat albo tryb event-driven.</div>
                                            </div>
                                            <select
                                                value={settings.autonomyScheduler ?? 'heartbeat'}
                                                onChange={(e) => setSettings({ ...settings, autonomyScheduler: (e.target.value === 'event' ? 'event' : 'heartbeat') })}
                                                className={`${inputClass} w-44 appearance-none cursor-pointer`}
                                            >
                                                <option value="heartbeat">heartbeat</option>
                                                <option value="event">event</option>
                                            </select>
                                        </div>
                                        <div className="text-[9px] text-neu-muted leading-relaxed">
                                            <span className="font-bold">heartbeat</span>: autonomia odpala się cyklicznie.
                                            <br />
                                            <span className="font-bold">event</span>: autonomia odpala się tylko gdy jest realny powód (np. task, update).
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Okno autonomii</div>
                                                <div className="text-[9px] text-neu-muted">Ustal kiedy autonomiczne ticki mogą działać.</div>
                                            </div>
                                            <button onClick={() => setSettings({...settings, autonomyWindow: { ...settings.autonomyWindow, enabled: !settings.autonomyWindow?.enabled }})} className={`w-12 h-6 rounded-full relative transition-all ${settings.autonomyWindow?.enabled ? 'bg-blue-500/30' : 'bg-neu-dark'}`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.autonomyWindow?.enabled ? 'left-7 bg-blue-500' : 'left-1 bg-neu-muted'}`} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">Start</label>
                                                <select
                                                    value={settings.autonomyWindow?.startHour ?? 0}
                                                    onChange={(e) => setSettings({ ...settings, autonomyWindow: { ...settings.autonomyWindow, startHour: parseInt(e.target.value) } })}
                                                    className={`${inputClass} appearance-none cursor-pointer`}
                                                    disabled={!settings.autonomyWindow?.enabled}
                                                >
                                                    {hourOptions.map(h => (
                                                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">Koniec</label>
                                                <select
                                                    value={settings.autonomyWindow?.endHour ?? 0}
                                                    onChange={(e) => setSettings({ ...settings, autonomyWindow: { ...settings.autonomyWindow, endHour: parseInt(e.target.value) } })}
                                                    className={`${inputClass} appearance-none cursor-pointer`}
                                                    disabled={!settings.autonomyWindow?.enabled}
                                                >
                                                    {hourOptions.map(h => (
                                                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Nadzór operatora</div>
                                                <div className="text-[9px] text-neu-muted">Blokuje samodzielne zmiany w kodzie.</div>
                                            </div>
                                            <button onClick={() => setSettings({ ...settings, operatorMode: !settings.operatorMode })} className={`w-12 h-6 rounded-full relative transition-all ${settings.operatorMode ? 'bg-green-500/30' : 'bg-neu-dark'}`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.operatorMode ? 'left-7 bg-green-500' : 'left-1 bg-neu-muted'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-2 border-t border-neu-border/30">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Autonomia – limity i bezpieczeństwo</div>
                                            <div className="text-[9px] text-neu-muted">Dostosuj ile narzędzi i jak agresywnie kernel przerywa pętle.</div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-neu-muted uppercase">Max tools / cykl</span>
                                                <span className="text-[11px] font-mono text-blue-400">{settings.autonomyConfig?.maxToolsPerCycle ?? 3}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={10}
                                                step={1}
                                                value={settings.autonomyConfig?.maxToolsPerCycle ?? 3}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || 1;
                                                    setSettings({
                                                        ...settings,
                                                        autonomyConfig: {
                                                            maxToolsPerCycle: value,
                                                            watchdogTimeoutMs: settings.autonomyConfig?.watchdogTimeoutMs ?? 60000,
                                                            loopBreakerLimit: settings.autonomyConfig?.loopBreakerLimit ?? 5
                                                        }
                                                    });
                                                }}
                                                className="w-full accent-blue-500 h-2 bg-neu-dark rounded-full cursor-pointer"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">Watchdog [s]</label>
                                                <input
                                                    type="number"
                                                    min={30}
                                                    max={600}
                                                    step={15}
                                                    value={Math.round((settings.autonomyConfig?.watchdogTimeoutMs ?? 60000) / 1000)}
                                                    onChange={(e) => {
                                                        const seconds = Math.max(30, Math.min(600, parseInt(e.target.value) || 60));
                                                        setSettings({
                                                            ...settings,
                                                            autonomyConfig: {
                                                                maxToolsPerCycle: settings.autonomyConfig?.maxToolsPerCycle ?? 3,
                                                                watchdogTimeoutMs: seconds * 1000,
                                                                loopBreakerLimit: settings.autonomyConfig?.loopBreakerLimit ?? 5
                                                            }
                                                        });
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-neu-muted uppercase">Loop breaker [iter]</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    step={1}
                                                    value={settings.autonomyConfig?.loopBreakerLimit ?? 5}
                                                    onChange={(e) => {
                                                        const limit = Math.max(1, Math.min(10, parseInt(e.target.value) || 5));
                                                        setSettings({
                                                            ...settings,
                                                            autonomyConfig: {
                                                                maxToolsPerCycle: settings.autonomyConfig?.maxToolsPerCycle ?? 3,
                                                                watchdogTimeoutMs: settings.autonomyConfig?.watchdogTimeoutMs ?? 60000,
                                                                loopBreakerLimit: limit
                                                            }
                                                        });
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-10 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border flex flex-col justify-center items-center gap-6">
                                     <button onClick={async () => { await fetch('/api/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' } }); soundService.play('startup'); showModal('success', 'Manual Tick', 'Wymuszono natychmiastowy puls jądra świadomości.'); }} className="w-full py-5 bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-yellow-400 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all">
                                        <Zap size={20}/> Force Manual Heartbeat
                                     </button>
                                     <div className="w-full grid grid-cols-2 gap-4">
                                         <button onClick={() => {
                                             const data = JSON.stringify(db.getReasoningHistory(), null, 2);
                                             const blob = new Blob([data], { type: 'application/json' });
                                             const url = URL.createObjectURL(blob);
                                             const a = document.createElement('a'); a.href = url; a.download = 'gai_kernel_backup.json'; a.click();
                                         }} className="p-4 rounded-2xl bg-neu-base shadow-neu-flat hover:text-blue-400 font-bold text-[10px] flex items-center justify-center gap-2 transition-all uppercase">
                                             <FileJson size={16}/> Eksport Bazy
                                         </button>
                                         <button onClick={() => db.factoryReset()} className="p-4 rounded-2xl bg-neu-base shadow-neu-flat hover:text-red-400 font-bold text-[10px] flex items-center justify-center gap-2 transition-all uppercase">
                                             <Trash2 size={16}/> Wipe Kernel
                                         </button>
                                     </div>
                                </div>
                             </div>

                             <div className="p-10 rounded-[2.5rem] bg-neu-base shadow-neu-flat border border-neu-border space-y-6">
                                 <h4 className="font-bold text-sm flex items-center gap-3"><History size={18} className="text-blue-400"/> Ostatnie Logi Jądra</h4>
                                 <div className="bg-neu-dark/30 rounded-2xl p-6 font-mono text-[10px] space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-neu-border">
                                      {systemInfo?.logs?.length > 0 ? systemInfo.logs.slice(-50).map((log: any, i: number) => (
                                          <div key={i} className="flex gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                              <span className="text-blue-400 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                              <span className="text-neu-text">{log.message}</span>
                                          </div>
                                      )) : <div className="text-neu-muted opacity-30 italic">Brak aktywnych logów w buforze...</div>}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Main Footer Buttons */}
                <div className="p-10 border-t border-neu-border bg-neu-base/80 backdrop-blur-xl flex justify-between items-center shrink-0 z-10">
                    <div className="hidden md:flex flex-col">
                        <div className="text-[10px] text-neu-muted font-black uppercase tracking-widest flex items-center gap-2">
                            <Shield size={12} className="text-green-500" /> AES-256 Kernel Encryption Active
                        </div>
                        <div className="text-[9px] text-neu-muted mt-1">Wszystkie klucze są szyfrowane po stronie serwera.</div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-neu-base shadow-neu-flat hover:shadow-neu-pressed text-neu-text rounded-2xl font-bold transition-all flex items-center gap-3 active:scale-95"
                        >
                            <RotateCw size={18}/> Revert Changes
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={loading} 
                            className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-2xl shadow-blue-500/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <RotateCw className="animate-spin" size={18}/> : <Save size={18}/>} 
                            Apply Global System State
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
