
import React, { useEffect, useState, useContext, useRef, useMemo, useCallback } from 'react';
import { 
    Activity, Brain, Zap, Trash2, Plus, RefreshCw, 
    Timer, ChevronDown, ChevronUp, CheckCircle, Circle, 
    Terminal, AlertTriangle, ListTodo, MoreVertical,
    BarChart3, Clock, ScrollText, PlayCircle, Skull, RotateCcw
} from 'lucide-react';
import { db } from '../../services/memoryService';
import { Task, AgentState, SystemSettings } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { soundService } from '../../services/soundService';

export const TaskManager: React.FC = () => {
    const { showModal } = useContext(AppContext);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [agentState, setAgentState] = useState<AgentState | null>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [lastTickResult, setLastTickResult] = useState<any>(null);
    const [m4Performance, setM4Performance] = useState<any>(null);
    const m4FetchInFlight = useRef(false);
    const m4NextAllowedAt = useRef(0);
    const m4LastErrorAt = useRef(0);

    const [visibleCompleted, setVisibleCompleted] = useState(5);
    const [visibleFailed, setVisibleFailed] = useState(5);
    const lastActivityRef = useRef(Date.now());
    
    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resetActivity);
        window.addEventListener('keydown', resetActivity);
        window.addEventListener('click', resetActivity);
        window.addEventListener('scroll', resetActivity);
        return () => {
            window.removeEventListener('mousemove', resetActivity);
            window.removeEventListener('keydown', resetActivity);
            window.removeEventListener('click', resetActivity);
            window.removeEventListener('scroll', resetActivity);
        };
    }, [resetActivity]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastActivityRef.current > 300000) {
                if (visibleCompleted > 5) setVisibleCompleted(5);
                if (visibleFailed > 5) setVisibleFailed(5);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [visibleCompleted, visibleFailed]);
    
    // Pulse Visualization State
    const [pulseProgress, setPulseProgress] = useState(0);
    const [timeToNextPulse, setTimeToNextPulse] = useState(0);
    const [isStale, setIsStale] = useState(false);
    const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const autoFixAttempted = useRef<number>(0);
    const syncInFlight = useRef(false);

    const [kernelTelemetry, setKernelTelemetry] = useState<any>(null);
    const [kernelTelemetryError, setKernelTelemetryError] = useState<string>('');
    const [ollamaTrace, setOllamaTrace] = useState<any[]>([]);

    const apiHeaders = () => ({
        'Content-Type': 'application/json'
    });

    const fetchM4Performance = async () => {
        // M4 Performance monitoring disabled
        return;
    };

    const sync = async () => {
        setTasks([...db.getTasks()]);
        setAgentState(db.getAgentState());
        setSettings(db.getSettings());
    };

    // Main Sync Loop
    useEffect(() => {
        sync();
        fetchM4Performance();
        window.addEventListener('gai:state_update', sync);
        const int = setInterval(() => {
            sync();
            fetchM4Performance();
        }, 1000); // M4: 1s odświeżanie dla lepszej responsywności
        return () => {
            window.removeEventListener('gai:state_update', sync);
            clearInterval(int);
        };
    }, []);

    const [isTelemetryExpanded, setIsTelemetryExpanded] = useState(false);

    useEffect(() => {
        let stopped = false;
        const poll = async () => {
            try {
                const res = await fetch('/api/autonomy/telemetry?logsLimit=60&tasksLimit=8', { headers: apiHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (!stopped) {
                        setKernelTelemetry(data);
                        setKernelTelemetryError('');
                    }
                }
            } catch (e: any) {
                if (!stopped) setKernelTelemetryError(String(e?.message || e || 'telemetry_failed'));
            }
            try {
                const res = await fetch('/api/ollama/trace?limit=12', { headers: apiHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    const entries = Array.isArray(data?.entries) ? data.entries : (Array.isArray(data) ? data : []);
                    if (!stopped) setOllamaTrace(entries);
                }
            } catch {
            }
        };
        poll();
        const int = setInterval(poll, 2000);
        return () => {
            stopped = true;
            clearInterval(int);
        };
    }, []);

    // Pulse Timer Logic
    useEffect(() => {
        const updatePulse = () => {
            if (!agentState) return;
            const settings = db.getSettings();
            if (!settings.heartbeat.enabled) {
                setPulseProgress(0);
                setTimeToNextPulse(0);
                return;
            }

            const now = Date.now();
            const intervalMs = settings.heartbeat.intervalSeconds * 1000;
            const lastHeartbeatAt = agentState.lastHeartbeatAt || agentState.lastRun || now;
            const nextRun = lastHeartbeatAt + intervalMs;
            const remaining = nextRun - now;
            
            // STALE LOGIC (5 mins)
            const isNowStale = (agentState.currentAction !== 'idle') && (now - (agentState.lastRun || now) > 300000);
            
            if (isNowStale) {
                setIsStale(true);
                // AUTO-TICK (Defibrillator)
                // Try to wake the server if we haven't tried in the last 30 seconds
                if (now - autoFixAttempted.current > 30000) {
                    console.log("Stale Lock detected. Sending wake-up signal to kernel...");
                    autoFixAttempted.current = now;
                    fetch('/api/tick', { method: 'POST', headers: apiHeaders() }).catch(e => console.error("Auto-tick failed", e));
                }
            } else {
                setIsStale(false);
            }

            if (remaining <= 0) {
                 // It should be running now
                 setPulseProgress(100);
                 setTimeToNextPulse(0);
                 if (!syncInFlight.current) {
                     syncInFlight.current = true;
                     db.fetchState().catch(() => {}).finally(() => {
                         syncInFlight.current = false;
                     });
                 }
            } else {
                 const elapsed = intervalMs - remaining;
                 const pct = (elapsed / intervalMs) * 100;
                 setPulseProgress(pct);
                 setTimeToNextPulse(Math.ceil(remaining / 1000));
            }
        };

        pulseIntervalRef.current = setInterval(updatePulse, 100);
        return () => {
            if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
        };
    }, [agentState]);

    const lastHeartbeatAt = agentState?.lastHeartbeatAt || agentState?.lastRun || 0;
    const waitStarted = agentState?.ollamaWaitStartedAt || 0;
    const waitSeconds = waitStarted ? Math.max(0, Math.floor((Date.now() - waitStarted) / 1000)) : 0;
    const displayAction = isStale
        ? 'SELF-HEALING PROTOCOL ENGAGED...'
        : waitStarted
            ? `Oczekiwanie na model (${waitSeconds}s)`
            : (agentState?.currentAction || 'idle');

    const handleAddTask = () => {
        showModal('prompt', 'Nowe Zadanie', 'Podaj tytuł zadania (AI zajmie się resztą):', async (title?: string) => {
            if (!title) return;
            setIsLoading(true);
            try {
                await db.addTask({ 
                    title, 
                    priority: 'medium', 
                    status: 'pending', 
                    progress: 0,
                    description: 'Ręcznie dodane zadanie do kolejki.'
                });
                soundService.play('success');
                sync();
            } finally {
                setIsLoading(false);
            }
        });
    };

    const handleDeleteTask = (id: string) => {
        showModal('confirm', 'Usuń zadanie', 'Czy na pewno chcesz usunąć to zadanie z kolejki?', async () => {
            await db.deleteTask(id);
            soundService.play('click');
            sync();
        });
    };

    const handleChangePriority = (id: string, current: string) => {
        const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        const currentIdx = priorities.indexOf(current as any);
        const next = priorities[(currentIdx + 1) % priorities.length];
        db.updateTask(id, { priority: next });
        soundService.play('click');
        sync();
    };

    const toggleStatus = (task: Task) => {
        const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
        const nextProgress = nextStatus === 'completed' ? 100 : 0;
        db.updateTask(task.id, { status: nextStatus, progress: nextProgress });
        soundService.play('success');
        sync();
    };

    const toggleExpand = (id: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleClearAll = () => {
        showModal('confirm', 'Wyczyść wszystkie', 'Czy na pewno chcesz usunąć WSZYSTKIE zadania?', async () => {
            await db.deleteAllTasks();
            soundService.play('error');
            sync();
        });
    };

    const handleClearCompleted = () => {
        const done = tasks.filter(t => t.status === 'completed');
        if (done.length === 0) return;
        showModal('confirm', 'Usuń ukończone', 'Czy na pewno chcesz usunąć wszystkie ukończone zadania?', async () => {
            setIsLoading(true);
            try {
                await Promise.all(done.map(t => db.deleteTask(t.id)));
                soundService.play('success');
            } finally {
                setIsLoading(false);
                sync();
            }
        });
    };

    const handleManualTick = async () => {
        setIsLoading(true);
        const res = await fetch('/api/tick', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ force: true, forceUnlock: true }) });
        const data = await res.json().catch(() => null);
        setLastTickResult(data);
        setIsLoading(false);
        sync();
    };

    const handleForceRunTask = async (task: Task) => {
        setIsLoading(true);
        try {
            if (task.status !== 'in_progress') {
                await db.updateTask(task.id, { status: 'in_progress', progress: Math.max(1, Number(task.progress || 0) || 0) });
            }
            const res = await fetch('/api/tick', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ force: true, forceUnlock: true }) });
            const data = await res.json().catch(() => null);
            setLastTickResult(data);
        } finally {
            setIsLoading(false);
            sync();
        }
    };

    const handleRetryTask = async (task: Task) => {
        setIsLoading(true);
        try {
            const currentLogs = Array.isArray(task.logs) ? task.logs : [];
            const nextRetry = (task.retryCount || 0) + 1;
            await db.updateTask(task.id, {
                status: 'pending',
                progress: 0,
                retryCount: nextRetry,
                logs: [...currentLogs, `[OPERATOR] Retry #${nextRetry} triggered from UI.`]
            });
            const res = await fetch('/api/tick', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ force: true, forceUnlock: true }) });
            const data = await res.json().catch(() => null);
            setLastTickResult(data);
            soundService.play('success');
        } finally {
            setIsLoading(false);
            sync();
        }
    };

    const handleResetTask = async (task: Task) => {
        if (!window.confirm('Czy na pewno chcesz zresetować to zadanie? Postęp zostanie utracony.')) return;
        setIsLoading(true);
        try {
            const currentLogs = Array.isArray(task.logs) ? task.logs : [];
            await db.updateTask(task.id, {
                status: 'pending',
                retryCount: 0,
                progress: 0,
                logs: [...currentLogs, '[USER] Manual HARD RESET requested. Progress cleared.']
            });
            sync();
        } catch (error) {
            console.error('Failed to reset task:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleHardReset = async () => {
        showModal('confirm', 'Hard Kernel Reset', 'Czy na pewno chcesz wymusić reset stanu jądra? Użyj tego tylko jeśli system utknął.', async () => {
            setIsLoading(true);
            try {
                await fetch('/api/reset-state', { method: 'POST', headers: apiHeaders() });
                soundService.play('success');
                sync();
            } catch(e) {
                soundService.play('error');
            } finally {
                setIsLoading(false);
            }
        });
    };

    const canOverrideQualityGate = !!settings?.operatorMode && settings?.qualityGate?.allowOperatorOverride;

    const handleToggleSubtask = (task: Task, subtaskId: string) => {
        if (!task.subtasks || task.subtasks.length === 0) return;
        const updated = task.subtasks.map((s) => {
            if (s.id !== subtaskId) return s;
            const nextStatus = s.status === 'completed' ? 'pending' : 'completed';
            return { ...s, status: nextStatus as 'pending' | 'completed' };
        });
        const anyCompleted = updated.some((s) => s.status === 'completed');
        const nextStatus = task.status === 'pending' && anyCompleted ? 'in_progress' : task.status;
        db.updateTask(task.id, { subtasks: updated, status: nextStatus });
        soundService.play('click');
        sync();
    };

    const handleOverrideComplete = (task: Task) => {
        showModal('confirm', 'Override Quality Gate', 'Czy na pewno chcesz wymusić zamknięcie taska mimo blokady jakości?', async () => {
            await db.updateTask(task.id, { status: 'completed', progress: 100, overrideQualityGate: true });
            soundService.play('success');
            sync();
        });
    };

    const rawThought = agentState?.thoughtProcess || '';
    const lowerThought = rawThought.toLowerCase();
    const isTimeoutReset = lowerThought.includes('system reset due to timeout');
    const isAbortNotice = lowerThought.includes('operation was aborted');
    const shouldHideProcess = !isStale && agentState?.currentAction === 'idle' && (isTimeoutReset || isAbortNotice);
    const processText = shouldHideProcess ? '' : rawThought;

    const sortedActiveTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'pending' || t.status === 'in_progress')
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [tasks]);

    const sortedCompletedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'completed')
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [tasks]);

    const sortedFailedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'failed')
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [tasks]);

    const renderTaskCard = (task: Task) => (
        <div key={task.id} className={`group bg-[#1e1e1e] border rounded-md transition-all duration-200 overflow-hidden
            ${task.status === 'in_progress' 
                ? 'border-blue-500/50 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]' 
                : task.status === 'failed'
                    ? 'border-red-500/60 shadow-[0_0_15px_-5px_rgba(248,113,113,0.4)]'
                    : 'border-[#3f4148] hover:border-gray-500'}
            ${task.status === 'completed' ? 'opacity-60 hover:opacity-80' : ''}`}>
            
            <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button 
                        onClick={() => toggleStatus(task)}
                        className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all
                            ${task.status === 'completed' 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : 'border-gray-600 text-transparent hover:border-blue-500 hover:text-blue-500/30 bg-[#2b2d31]'}`}
                    >
                        <CheckCircle size={12} />
                    </button>
                    
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(task.id)}>
                        <div className={`font-bold text-sm truncate flex items-center gap-2 ${
                            task.status === 'completed' 
                                ? 'text-gray-500 line-through' 
                                : task.status === 'failed'
                                    ? 'text-red-400'
                                    : 'text-gray-200'
                        }`}>
                            {task.title}
                            {task.status === 'in_progress' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleChangePriority(task.id, task.priority || 'medium'); }}
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider transition-all
                                    ${task.priority === 'high' ? 'bg-red-900/20 text-red-400 border-red-900/30 hover:bg-red-900/40' : 
                                      task.priority === 'medium' ? 'bg-blue-900/20 text-blue-400 border-blue-900/30 hover:bg-blue-900/40' : 
                                      'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'}`}
                            >
                                {task.priority || 'medium'}
                            </button>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                                <Clock size={10} /> {new Date(task.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            {task.subtasks && task.subtasks.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                                    className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-[#2b2d31] rounded border border-[#3f4148] hover:bg-[#3f4148] hover:text-gray-200 transition-all"
                                    title="Pokaż subtaski"
                                >
                                    <ListTodo size={10} />
                                    {task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length}
                                </button>
                            )}
                            {(task.retryCount || 0) > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-orange-900/20 rounded border border-orange-900/30" title="Failures">
                                    <AlertTriangle size={10} /> {task.retryCount}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-end gap-1 w-24">
                        <span className="text-[9px] font-bold text-gray-500 font-mono">{task.progress}%</span>
                        <div className="w-full h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${
                                    task.status === 'in_progress'
                                        ? 'bg-blue-500'
                                        : task.status === 'completed'
                                            ? 'bg-green-500'
                                            : task.status === 'failed'
                                                ? 'bg-red-500'
                                                : 'bg-gray-600'
                                }`} 
                                style={{width: `${task.progress}%`}} 
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => toggleExpand(task.id)} className="p-1.5 rounded hover:bg-[#3f4148] text-gray-500 hover:text-white transition-all">
                            {expandedTasks.has(task.id) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 rounded hover:bg-red-900/30 text-gray-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {expandedTasks.has(task.id) && (
                <div className="border-t border-[#3f4148] p-4 bg-[#111113]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Timer size={10}/> Description
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed bg-[#1e1e1e] p-3 rounded border border-[#3f4148] font-mono">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                        <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={10}/> Logs
                            </div>
                            <div className="bg-[#0d0d0d] rounded p-3 font-mono text-[10px] max-h-40 overflow-y-auto custom-scrollbar border border-[#3f4148] space-y-1">
                                {task.logs && task.logs.length > 0 ? (
                                    task.logs.map((l, i) => (
                                        <div key={i} className="text-gray-400 flex gap-2 hover:text-gray-200 border-b border-[#1e1e1e] pb-0.5 last:border-0">
                                            <span className="text-blue-500/50 shrink-0 select-none">{'>'}</span>
                                            <span className="break-all">{l}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-700 italic">No logs available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-4">
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ListTodo size={10}/> Subtasks
                            </div>
                            <div className="space-y-1">
                                {task.subtasks.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleToggleSubtask(task, s.id)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-1.5 rounded bg-[#1e1e1e] border border-[#3f4148] hover:border-gray-500 transition-all group/sub"
                                    >
                                        {s.status === 'completed' ? <CheckCircle size={12} className="text-green-500" /> : <Circle size={12} className="text-gray-600 group-hover/sub:text-gray-400" />}
                                        <span className={`text-xs font-mono ${s.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                                            {s.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-4 flex justify-end gap-2 border-t border-[#3f4148] pt-3">
                        {task.status === 'failed' && (
                            <button
                                onClick={() => handleRetryTask(task)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded bg-[#2b2d31] border border-[#3f4148] text-[10px] font-bold uppercase text-red-400 hover:bg-[#3f4148] transition-all flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> Retry
                            </button>
                        )}
                        {(task.status === 'failed' || task.status === 'in_progress') && (
                            <button
                                onClick={() => handleResetTask(task)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded bg-[#2b2d31] border border-[#3f4148] text-[10px] font-bold uppercase text-yellow-400 hover:bg-[#3f4148] transition-all flex items-center gap-1"
                                title="Całkowity reset postępu i prób"
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        )}
                        <button 
                            onClick={() => handleForceRunTask(task)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded bg-[#2b2d31] border border-[#3f4148] text-[10px] font-bold uppercase text-blue-400 hover:bg-[#3f4148] transition-all flex items-center gap-1"
                        >
                            <PlayCircle size={12} /> Force Run
                        </button>
                        {canOverrideQualityGate && task.status !== 'completed' && (
                            <button 
                                onClick={() => handleOverrideComplete(task)}
                                className="px-3 py-1.5 rounded bg-[#2b2d31] border border-[#3f4148] text-[10px] font-bold uppercase text-orange-400 hover:bg-[#3f4148] transition-all flex items-center gap-1"
                            >
                                <AlertTriangle size={12} /> Override
                            </button>
                        )}
                        <button 
                            onClick={() => toggleStatus(task)}
                            className="px-3 py-1.5 rounded bg-[#2b2d31] border border-[#3f4148] text-[10px] font-bold uppercase text-green-500 hover:bg-[#3f4148] transition-all flex items-center gap-1"
                        >
                            <CheckCircle size={12} /> {task.status === 'completed' ? 'Reopen' : 'Complete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#18181b] text-[#e0e0e0] font-sans overflow-hidden">
            <div className="p-6 border-b border-[#3f4148] flex justify-between items-center bg-[#18181b] z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                        <ListTodo size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-white">TASK CONTROL</h2>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-bold flex items-center gap-2">
                             <Activity size={10} className="text-green-500" /> System Active
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddTask} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-2 transition-all hover:bg-blue-500 disabled:opacity-50"
                    >
                        <Plus size={14} /> New Task
                    </button>
                    <button onClick={handleManualTick} className="p-2 rounded bg-[#2b2d31] border border-[#3f4148] hover:bg-[#3f4148] text-gray-400 transition-all" title="Force AI Cycle">
                        <Zap size={16} />
                    </button>
                    <button onClick={handleHardReset} className="p-2 rounded bg-[#2b2d31] border border-[#3f4148] hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all" title="HARD RESET">
                        <Skull size={16} />
                    </button>
                    {sortedCompletedTasks.length > 0 && (
                        <button onClick={handleClearCompleted} className="px-3 py-2 rounded bg-[#2b2d31] border border-[#3f4148] hover:bg-[#3f4148] text-gray-400 hover:text-green-400 transition-all text-xs font-bold flex items-center gap-2" title="Usuń ukończone">
                            <CheckCircle size={14} /> Clear Done
                        </button>
                    )}
                    <button onClick={handleClearAll} className="p-2 rounded bg-[#2b2d31] border border-[#3f4148] hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {/* Agent State Summary - Compact Version */}
                <div className="p-4 rounded border border-[#3f4148] bg-[#1e1e1e] flex items-center gap-4 relative overflow-hidden">
                    <div 
                        className={`absolute bottom-0 left-0 h-0.5 transition-all duration-100 ease-linear ${isStale ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${pulseProgress}%` }}
                    />

                    <div className="w-12 h-12 rounded bg-[#2b2d31] flex items-center justify-center border border-[#3f4148] relative z-10">
                        <Brain size={20} className={`${isStale ? 'text-orange-500' : waitStarted ? 'text-purple-400 animate-pulse' : agentState?.currentAction?.startsWith('Executing') ? 'text-blue-400 animate-pulse' : agentState?.currentAction === 'Thinking...' ? 'text-purple-400 animate-pulse' : 'text-gray-500'}`} />
                    </div>
                    
                    <div className="flex-1 z-10">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Current Status</div>
                        <div className="text-sm font-mono text-white flex items-center gap-2 truncate">
                            {displayAction}
                        </div>
                        {processText && (
                            <div className="text-[10px] text-gray-400 mt-1 truncate max-w-xl font-mono">
                                {'>'} {processText}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-right z-10 hidden sm:block">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Cycle</div>
                        <div className="text-xs font-mono font-bold text-blue-400">
                            {isStale ? (
                                <span className="text-orange-500">RECOVERING</span>
                            ) : timeToNextPulse > 0 ? (
                                <span className="text-green-400">{timeToNextPulse}s</span>
                            ) : (
                                <span className="text-blue-400">PROCESSING</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded border border-[#3f4148] bg-[#1e1e1e]">
                    <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsTelemetryExpanded(v => !v)}>
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kernel Telemetry</div>
                            {isTelemetryExpanded ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                            {kernelTelemetry?.ai?.active?.system ? 'AI:ACTIVE' : 'AI:IDLE'}
                            {kernelTelemetry?.agent?.backoffRemainingSec ? ` | backoff=${kernelTelemetry.agent.backoffRemainingSec}s` : ''}
                        </div>
                    </div>

                    {isTelemetryExpanded && (
                        <>
                            {kernelTelemetryError ? (
                                <div className="mt-2 text-[10px] font-mono text-red-400">telemetry_error: {kernelTelemetryError}</div>
                            ) : null}

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-mono text-gray-400">
                                        provider=<span className="text-white">{String(kernelTelemetry?.model?.provider || '')}</span> model=<span className="text-white">{String(kernelTelemetry?.model?.activeModel || '')}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-400">
                                        scheduler=<span className="text-white">{String(kernelTelemetry?.autonomy?.scheduler || '')}</span> autonomy=<span className="text-white">{String(!!kernelTelemetry?.autonomy?.enabled)}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-400">
                                        heartbeat=<span className="text-white">{String(!!kernelTelemetry?.autonomy?.heartbeat?.enabled)}</span> interval=<span className="text-white">{String(kernelTelemetry?.autonomy?.heartbeat?.intervalSeconds || '')}</span>s
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-400">
                                        idleAutoTasks=<span className="text-white">{String(!!kernelTelemetry?.autonomy?.idleAutoTasksEnabled)}</span> target=<span className="text-white">{String(kernelTelemetry?.autonomy?.idleAutoTasksTargetOpen || '')}</span> throttle=<span className="text-white">{String(kernelTelemetry?.autonomy?.idleAutoTasksThrottleSec || '')}</span>s
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[10px] font-mono text-gray-400">stage=<span className="text-white">{String(kernelTelemetry?.agent?.processingStage || '')}</span></div>
                                    <div className="text-[10px] font-mono text-gray-400">action=<span className="text-white">{String(kernelTelemetry?.agent?.currentAction || '')}</span></div>
                                    <div className="text-[10px] font-mono text-gray-400 truncate">thought=<span className="text-white">{String(kernelTelemetry?.agent?.thoughtProcess || '')}</span></div>
                                    <div className="text-[10px] font-mono text-gray-400">
                                        tasks(pending/in_progress)=<span className="text-white">{String((kernelTelemetry?.tasks?.counts?.pending || 0) + (kernelTelemetry?.tasks?.counts?.in_progress || 0))}</span>
                                        {kernelTelemetry?.ai?.active?.user ? <span className="text-yellow-400"> | userAI:ACTIVE</span> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recent System Logs</div>
                                    <div className="max-h-40 overflow-y-auto rounded border border-[#2b2d31] bg-[#18181b] p-2 font-mono text-[10px] text-gray-300 space-y-1">
                                        {(kernelTelemetry?.logs?.entries || []).slice(-40).map((e: any, idx: number) => (
                                            <div key={idx} className="whitespace-pre-wrap break-words">
                                                <span className="text-gray-500">{new Date(Number(e.timestamp || 0)).toLocaleTimeString()}</span>{' '}
                                                <span className={String(e.level).toLowerCase() === 'error' ? 'text-red-400' : String(e.level).toLowerCase() === 'warn' ? 'text-yellow-400' : 'text-gray-400'}>
                                                    {String(e.level || 'info').toUpperCase()}
                                                </span>{' '}
                                                <span>{String(e.message || '').slice(0, 500)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recent Ollama Trace</div>
                                    <div className="max-h-40 overflow-y-auto rounded border border-[#2b2d31] bg-[#18181b] p-2 font-mono text-[10px] text-gray-300 space-y-1">
                                        {(ollamaTrace || []).slice(-40).map((t: any, idx: number) => (
                                            <div key={idx} className="whitespace-pre-wrap break-words">
                                                <span className="text-gray-500">{new Date(Number(t.timestamp || 0)).toLocaleTimeString()}</span>{' '}
                                                <span className={t.ok === false ? 'text-red-400' : 'text-green-400'}>{t.ok === false ? 'FAIL' : 'OK'}</span>{' '}
                                                <span className="text-gray-400">{String(t.model || '')}</span>{' '}
                                                <span className="text-gray-500">ms={String(t.totalMs ?? t.ms ?? '')}</span>{' '}
                                                <span className="text-gray-500">ttfb={String(t.ttfbMs ?? '')}</span>{' '}
                                                {t.stream === false ? <span className="text-blue-400">non-stream</span> : <span className="text-purple-400">stream</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {lastTickResult ? (
                    <div className="px-4 py-3 rounded border border-[#3f4148] bg-[#1e1e1e] text-[10px] font-mono text-gray-400">
                        Last tick: {String(lastTickResult.status || '')}
                        {lastTickResult.reason ? ` (${String(lastTickResult.reason)})` : ''}
                        {typeof lastTickResult.created !== 'undefined' ? ` | created=${String(lastTickResult.created)}` : ''}
                    </div>
                ) : null}

                {m4Performance && (
                    <div className="px-4 py-3 rounded border border-[#3f4148] bg-[#1e1e1e]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">M4 Performance</div>
                            <div className={`text-xs font-mono ${m4Performance.stats.successRate > 80 ? 'text-green-400' : m4Performance.stats.successRate > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {m4Performance.stats.successRate}% success
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-[10px] font-mono text-gray-400">
                            <div>
                                <div className="text-gray-500">Total</div>
                                <div className="text-white">{m4Performance.stats.totalRequests}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Avg Time</div>
                                <div className="text-white">{Math.round(m4Performance.stats.averageResponseTime / 1000)}s</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Timeouts</div>
                                <div className="text-red-400">{m4Performance.stats.timeoutRequests}</div>
                            </div>
                        </div>
                        {m4Performance.recommendations.fastModels.length > 0 && (
                            <div className="mt-2 text-[10px] text-green-400 font-mono">
                                Fast models: {m4Performance.recommendations.fastModels.join(', ')}
                            </div>
                        )}
                        {m4Performance.recommendations.slowModels.length > 0 && (
                            <div className="mt-1 text-[10px] text-orange-400 font-mono">
                                Slow models: {m4Performance.recommendations.slowModels.join(', ')}
                            </div>
                        )}
                    </div>
                )}

                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-700 select-none">
                        <ListTodo size={48} strokeWidth={1} />
                        <span className="text-xs font-bold uppercase tracking-widest mt-4">Queue Empty</span>
                    </div>
                ) : (
                    <>
                        {sortedActiveTasks.map(task => renderTaskCard(task))}
                        {sortedCompletedTasks.length > 0 && (
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 uppercase tracking-widest px-2">
                                <div className="flex-1 h-px bg-[#2b2d31]" />
                                <span>Completed ({sortedCompletedTasks.length})</span>
                                <div className="flex-1 h-px bg-[#2b2d31]" />
                            </div>
                        )}
                        {sortedCompletedTasks.slice(0, visibleCompleted).map(task => renderTaskCard(task))}
                        {sortedCompletedTasks.length > visibleCompleted && (
                            <button onClick={() => setVisibleCompleted(p => p + 5)} className="w-full py-1 text-[10px] text-gray-600 hover:text-gray-400 border border-transparent hover:border-[#3f4148] rounded transition-colors uppercase font-bold tracking-widest">
                                Show more completed ({sortedCompletedTasks.length - visibleCompleted})
                            </button>
                        )}
                        {sortedFailedTasks.length > 0 && (
                            <div className="flex items-center gap-3 text-[10px] text-red-400 uppercase tracking-widest px-2 mt-4">
                                <div className="flex-1 h-px bg-red-900/60" />
                                <span>Failed ({sortedFailedTasks.length})</span>
                                <div className="flex-1 h-px bg-red-900/60" />
                            </div>
                        )}
                        {sortedFailedTasks.slice(0, visibleFailed).map(task => renderTaskCard(task))}
                        {sortedFailedTasks.length > visibleFailed && (
                            <button onClick={() => setVisibleFailed(p => p + 5)} className="w-full py-1 text-[10px] text-red-500/60 hover:text-red-400 border border-transparent hover:border-red-900/30 rounded transition-colors uppercase font-bold tracking-widest">
                                Show more failed ({sortedFailedTasks.length - visibleFailed})
                            </button>
                        )}
                    </>
                )}
            </div>
            
            <div className="p-3 bg-[#18181b] border-t border-[#3f4148] flex items-center justify-center">
                 <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest opacity-50">
                      <Zap size={10}/> Kernel Sync Active
                 </div>
            </div>
        </div>
    );
};
