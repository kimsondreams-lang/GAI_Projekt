import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, Cloud, HardDrive, CheckCircle, XCircle, Clock } from 'lucide-react';
import { db } from '../../services/memoryService';

type ModelStat = {
    model: string;
    attempts: number;
    successes: number;
    failures: number;
    ttfbAvgMs: number;
    successRate: number;
    lastError: string;
    lastAt: number;
};

type SeriesPoint = {
    model: string;
    ts: number;
    ok: boolean;
    ttfbMs: number;
};

const formatMs = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 'n/a';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
    return `${Math.round(value)}ms`;
};

const formatDate = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 'n/a';
    return new Date(value).toLocaleString();
};

export const ModelStats: React.FC = () => {
    const [stats, setStats] = useState<ModelStat[]>([]);
    const [series, setSeries] = useState<SeriesPoint[]>([]);
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState<'success' | 'ttfb' | 'attempts' | 'recent'>('success');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>('');

    const sync = () => {
        const state = db.getAgentState();
        const raw = state?.modelStats || {};
        const rawSeries = Array.isArray(state?.modelStatsSeries) ? state?.modelStatsSeries : [];
        const list = Object.entries(raw).map(([model, entry]) => {
            const attempts = Number(entry?.attempts || 0);
            const successes = Number(entry?.successes || 0);
            const failures = Number(entry?.failures || 0);
            const ttfbCount = Number(entry?.ttfbCount || 0);
            const ttfbTotalMs = Number(entry?.ttfbTotalMs || 0);
            const ttfbAvgMs = ttfbCount ? ttfbTotalMs / ttfbCount : 0;
            const successRate = attempts ? successes / attempts : 0;
            return {
                model,
                attempts,
                successes,
                failures,
                ttfbAvgMs,
                successRate,
                lastError: String(entry?.lastError || ''),
                lastAt: Number(entry?.lastAt || 0)
            } as ModelStat;
        });
        setStats(list);
        setSeries(rawSeries.map((s: any) => ({
            model: String(s?.model || ''),
            ts: Number(s?.ts || 0),
            ok: !!s?.ok,
            ttfbMs: Number(s?.ttfbMs || 0)
        })));
    };

    const refreshFromServer = async () => {
        setIsRefreshing(true);
        try {
            await db.fetchState();
        } finally {
            setIsRefreshing(false);
            sync();
        }
    };

    useEffect(() => {
        sync();
        const handler = () => sync();
        window.addEventListener('gai:state_update', handler);
        return () => window.removeEventListener('gai:state_update', handler);
    }, []);

    useEffect(() => {
        if (!selectedModel && stats.length > 0) {
            setSelectedModel(stats[0].model);
        }
        if (selectedModel && !stats.find(s => s.model === selectedModel)) {
            setSelectedModel(stats[0]?.model || '');
        }
    }, [stats, selectedModel]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q ? stats.filter(s => s.model.toLowerCase().includes(q)) : stats;
        const sorted = [...list].sort((a, b) => {
            if (sortKey === 'ttfb') return (a.ttfbAvgMs || 0) - (b.ttfbAvgMs || 0);
            if (sortKey === 'attempts') return b.attempts - a.attempts;
            if (sortKey === 'recent') return (b.lastAt || 0) - (a.lastAt || 0);
            return b.successRate - a.successRate;
        });
        return sorted;
    }, [stats, query, sortKey]);

    const summary = useMemo(() => {
        const totalAttempts = stats.reduce((sum, s) => sum + s.attempts, 0);
        const totalSuccesses = stats.reduce((sum, s) => sum + s.successes, 0);
        const totalFailures = stats.reduce((sum, s) => sum + s.failures, 0);
        const successRate = totalAttempts ? (totalSuccesses / totalAttempts) : 0;
        return { totalAttempts, totalSuccesses, totalFailures, successRate };
    }, [stats]);

    const seriesForModel = useMemo(() => {
        const list = series.filter(s => s.model === selectedModel).sort((a, b) => a.ts - b.ts);
        return list.slice(-120);
    }, [series, selectedModel]);

    const chart = useMemo(() => {
        if (seriesForModel.length === 0) return { path: '', points: [] as { x: number; y: number; ok: boolean }[] };
        const width = 600;
        const height = 140;
        const values = seriesForModel.map(s => Math.max(0, Number(s.ttfbMs || 0)));
        const max = Math.max(1, ...values);
        const min = Math.min(...values);
        const range = Math.max(1, max - min);
        const step = seriesForModel.length > 1 ? width / (seriesForModel.length - 1) : width;
        const points = seriesForModel.map((s, idx) => {
            const v = Math.max(0, Number(s.ttfbMs || 0));
            const x = idx * step;
            const y = height - ((v - min) / range) * (height - 20) - 10;
            return { x, y, ok: !!s.ok };
        });
        const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
        return { path, points };
    }, [seriesForModel]);

    return (
        <div className="w-full h-full flex flex-col bg-[#111113] text-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-600/30 flex items-center justify-center">
                        <BarChart3 size={18} className="text-cyan-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold tracking-wide">Model Stats</div>
                        <div className="text-[11px] text-gray-500">Skuteczność i TTFB dla modeli Ollama Cloud</div>
                    </div>
                </div>
                <button
                    onClick={refreshFromServer}
                    disabled={isRefreshing}
                    className="px-3 py-2 rounded bg-[#1e1e1e] border border-[#2b2d31] text-xs font-bold text-gray-300 hover:bg-[#2b2d31] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                    <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Próby</div>
                    <div className="text-xl font-bold text-gray-100">{summary.totalAttempts}</div>
                </div>
                <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                    <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Skuteczność</div>
                    <div className="text-xl font-bold text-emerald-300">{(summary.successRate * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                    <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Błędy</div>
                    <div className="text-xl font-bold text-red-300">{summary.totalFailures}</div>
                </div>
            </div>

            <div className="px-6 pb-4 flex flex-col md:flex-row gap-3 md:items-center">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtruj po nazwie modelu"
                    className="flex-1 bg-[#151518] border border-[#2b2d31] rounded px-3 py-2 text-xs text-gray-200 focus:outline-none"
                />
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-[#151518] border border-[#2b2d31] rounded px-3 py-2 text-xs text-gray-200"
                >
                    {stats.map((item) => (
                        <option key={item.model} value={item.model}>{item.model}</option>
                    ))}
                </select>
                <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as any)}
                    className="bg-[#151518] border border-[#2b2d31] rounded px-3 py-2 text-xs text-gray-200"
                >
                    <option value="success">Sort: skuteczność</option>
                    <option value="ttfb">Sort: TTFB</option>
                    <option value="attempts">Sort: próby</option>
                    <option value="recent">Sort: ostatnia aktywność</option>
                </select>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
                <div className="grid grid-cols-1 gap-3">
                    <div className="bg-[#141417] border border-[#2b2d31] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-200">TTFB w czasie</div>
                            <div className="text-[11px] text-gray-500">{selectedModel || 'brak modelu'}</div>
                        </div>
                        <div className="mt-3 h-[160px] w-full bg-[#101013] border border-[#202225] rounded">
                            {chart.path ? (
                                <svg viewBox="0 0 600 140" className="w-full h-full">
                                    <path d={chart.path} fill="none" stroke="#22d3ee" strokeWidth="2" />
                                    {chart.points.map((p, idx) => (
                                        <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill={p.ok ? '#34d399' : '#f87171'} />
                                    ))}
                                </svg>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Brak danych serii</div>
                            )}
                        </div>
                    </div>
                    {filtered.map((item) => {
                        const isCloud = item.model.includes(':cloud');
                        return (
                            <div key={item.model} className="bg-[#141417] border border-[#2b2d31] rounded-lg p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg border ${isCloud ? 'border-cyan-600/30 bg-cyan-600/10' : 'border-gray-600/30 bg-gray-600/10'} flex items-center justify-center`}>
                                            {isCloud ? <Cloud size={14} className="text-cyan-300" /> : <HardDrive size={14} className="text-gray-300" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-100">{item.model}</div>
                                            <div className="text-[11px] text-gray-500">{isCloud ? 'Cloud' : 'Local'}</div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                        <Clock size={12} /> {formatDate(item.lastAt)}
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={12} className="text-emerald-300" />
                                        <span className="text-gray-400">Success</span>
                                        <span className="text-gray-100 font-semibold">{item.successes}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle size={12} className="text-red-300" />
                                        <span className="text-gray-400">Fail</span>
                                        <span className="text-gray-100 font-semibold">{item.failures}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BarChart3 size={12} className="text-cyan-300" />
                                        <span className="text-gray-400">SR</span>
                                        <span className="text-gray-100 font-semibold">{(item.successRate * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-yellow-300" />
                                        <span className="text-gray-400">TTFB</span>
                                        <span className="text-gray-100 font-semibold">{formatMs(item.ttfbAvgMs)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">Próby</span>
                                        <span className="text-gray-100 font-semibold">{item.attempts}</span>
                                    </div>
                                </div>

                                {item.lastError ? (
                                    <div className="mt-3 text-[11px] text-red-300 bg-[#1c1313] border border-[#3a1f1f] rounded px-3 py-2">
                                        {item.lastError}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}

                    {filtered.length === 0 ? (
                        <div className="text-center text-xs text-gray-500 py-10">Brak danych statystyk modeli.</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
