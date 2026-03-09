import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Search, Filter, RefreshCw, Clock, Tag, User, BookOpen, Star, Sparkles } from 'lucide-react';
import { db } from '../../services/memoryService';

type MemoryItem = any;

const formatDate = (value: any) => {
    if (!value) return 'Unknown';
    const ts = typeof value === 'number' ? value : Date.parse(String(value));
    if (!Number.isFinite(ts)) return 'Unknown';
    return new Date(ts).toLocaleString();
};

const getMemoryContent = (m: MemoryItem) => {
    const text = m?.content || m?.text || m?.summary || m?.value || '';
    return String(text || '').trim();
};

const getMemoryTitle = (m: MemoryItem) => {
    const content = getMemoryContent(m);
    if (m?.title) return String(m.title);
    if (!content) return 'Untitled memory';
    return content.length > 80 ? `${content.slice(0, 80)}…` : content;
};

const getMemoryTags = (m: MemoryItem) => {
    const tags = m?.tags || m?.metadata?.tags || [];
    if (Array.isArray(tags)) return tags.map(t => String(t)).filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
    return [];
};

const getMemoryType = (m: MemoryItem) => {
    return String(m?.type || m?.category || m?.metadata?.type || 'general');
};

const getMemoryTimestamp = (m: MemoryItem) => {
    return m?.timestamp || m?.createdAt || m?.metadata?.timestamp || m?.metadata?.createdAt || null;
};

const getMemoryImportance = (m: MemoryItem) => {
    const v = m?.importance ?? m?.metadata?.importance ?? m?.score ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const getMemoryRelevance = (m: MemoryItem) => {
    const v = m?.metadata?.relevance ?? m?.metadata?.relevanceScore ?? m?.relevance ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const getMemoryAccess = (m: MemoryItem) => {
    const v = m?.accessCount ?? m?.metadata?.accessCount ?? m?.access?.count ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const GAIMemory: React.FC = () => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [learnings, setLearnings] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortKey, setSortKey] = useState<'recent' | 'importance' | 'relevance'>('recent');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const sync = () => {
        setMemories(db.getMemories() || []);
        setProfile(db.getGaiProfile());
        setLearnings(db.getGaiLearnings() || []);
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

    const typeOptions = useMemo(() => {
        const types = new Set<string>();
        memories.forEach(m => types.add(getMemoryType(m)));
        return ['all', ...Array.from(types).sort()];
    }, [memories]);

    const filteredMemories = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matchesQuery = (m: MemoryItem) => {
            if (!q) return true;
            const text = getMemoryContent(m).toLowerCase();
            const title = getMemoryTitle(m).toLowerCase();
            const tags = getMemoryTags(m).join(' ').toLowerCase();
            const type = getMemoryType(m).toLowerCase();
            return text.includes(q) || title.includes(q) || tags.includes(q) || type.includes(q);
        };
        return memories.filter(m => {
            if (typeFilter !== 'all' && getMemoryType(m) !== typeFilter) return false;
            return matchesQuery(m);
        });
    }, [memories, query, typeFilter]);

    const sortedMemories = useMemo(() => {
        const list = [...filteredMemories];
        if (sortKey === 'importance') {
            return list.sort((a, b) => getMemoryImportance(b) - getMemoryImportance(a));
        }
        if (sortKey === 'relevance') {
            return list.sort((a, b) => getMemoryRelevance(b) - getMemoryRelevance(a));
        }
        return list.sort((a, b) => {
            const at = getMemoryTimestamp(a) ? Date.parse(String(getMemoryTimestamp(a))) : 0;
            const bt = getMemoryTimestamp(b) ? Date.parse(String(getMemoryTimestamp(b))) : 0;
            return bt - at;
        });
    }, [filteredMemories, sortKey]);

    const selectedMemory = useMemo(() => {
        return sortedMemories.find(m => String(m?.id || '') === String(selectedId || '')) || sortedMemories[0] || null;
    }, [sortedMemories, selectedId]);

    useEffect(() => {
        if (!selectedMemory) {
            setSelectedId(null);
        } else {
            setSelectedId(String(selectedMemory?.id || ''));
        }
    }, [selectedMemory?.id]);

    const stats = useMemo(() => {
        const counts: Record<string, number> = {};
        const tags: Record<string, number> = {};
        memories.forEach(m => {
            const type = getMemoryType(m);
            counts[type] = (counts[type] || 0) + 1;
            getMemoryTags(m).forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1;
            });
        });
        const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
        return { counts, topTags };
    }, [memories]);

    return (
        <div className="w-full h-full flex flex-col bg-[#111113] text-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                        <Brain size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold tracking-wide">GAI Memory Vault</div>
                        <div className="text-[11px] text-gray-500">Łatwe przeglądanie pamięci, profilu i uczenia GAI</div>
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

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 px-6 py-4">
                    <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                            <User size={12} /> Profile Snapshot
                        </div>
                        {profile ? (
                            <div className="space-y-2 text-xs text-gray-300">
                                {Object.entries(profile).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-2">
                                        <span className="text-gray-500 uppercase text-[10px] w-24 shrink-0">{key}</span>
                                        <span className="text-gray-200 break-words">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600">Brak profilu.</div>
                        )}
                    </div>

                    <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                            <BookOpen size={12} /> Learnings
                        </div>
                        {learnings.length > 0 ? (
                            <div className="space-y-2 text-xs text-gray-300 max-h-44 overflow-y-auto custom-scrollbar pr-2">
                                {learnings.map((l, idx) => (
                                    <div key={l?.id || idx} className="flex items-start gap-2">
                                        <Sparkles size={12} className="text-blue-400 mt-0.5" />
                                        <span className="text-gray-200 break-words">{String(l?.content || l?.text || l?.summary || l)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600">Brak zapisanych learningów.</div>
                        )}
                    </div>

                    <div className="bg-[#1a1a1d] border border-[#2b2d31] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                            <Star size={12} /> Memory Stats
                        </div>
                        <div className="text-xs text-gray-300 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Total</span>
                                <span className="font-bold">{memories.length}</span>
                            </div>
                            <div className="space-y-1">
                                {Object.entries(stats.counts).slice(0, 5).map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <span className="text-gray-500">{type}</span>
                                        <span className="text-gray-300">{count}</span>
                                    </div>
                                ))}
                            </div>
                            {stats.topTags.length > 0 && (
                                <div className="pt-2 border-t border-[#2b2d31]">
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Top tags</div>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.topTags.map(([tag, count]) => (
                                            <span key={tag} className="px-2 py-0.5 rounded bg-[#222228] border border-[#2b2d31] text-[10px] text-gray-300">
                                                {tag} · {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 px-6 pb-6 min-h-0">
                    <div className="xl:w-[42%] w-full max-h-[600px] bg-[#141416] border border-[#2b2d31] rounded-lg flex flex-col min-h-0">
                        <div className="p-4 border-b border-[#2b2d31] space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                                <Search size={12} /> Find Memory
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Szukaj po treści, tagu lub typie..."
                                        className="w-full bg-[#1e1e1e] border border-[#2b2d31] rounded pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    <Filter size={10} /> Type
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {typeOptions.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={`px-2 py-1 rounded border text-[10px] uppercase tracking-widest ${typeFilter === type ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-[#1e1e1e] border-[#2b2d31] text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Sort
                                <button onClick={() => setSortKey('recent')} className={`px-2 py-1 rounded border ${sortKey === 'recent' ? 'bg-[#2b2d31] border-[#3f4148] text-gray-200' : 'bg-[#1e1e1e] border-[#2b2d31] text-gray-500 hover:text-gray-300'}`}>Recent</button>
                                <button onClick={() => setSortKey('importance')} className={`px-2 py-1 rounded border ${sortKey === 'importance' ? 'bg-[#2b2d31] border-[#3f4148] text-gray-200' : 'bg-[#1e1e1e] border-[#2b2d31] text-gray-500 hover:text-gray-300'}`}>Importance</button>
                                <button onClick={() => setSortKey('relevance')} className={`px-2 py-1 rounded border ${sortKey === 'relevance' ? 'bg-[#2b2d31] border-[#3f4148] text-gray-200' : 'bg-[#1e1e1e] border-[#2b2d31] text-gray-500 hover:text-gray-300'}`}>Relevance</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {sortedMemories.length === 0 && (
                                <div className="text-xs text-gray-600 text-center py-10">Brak wpisów dla wybranych filtrów.</div>
                            )}
                            {sortedMemories.map(m => {
                                const id = String(m?.id || '');
                                const isActive = selectedMemory && String(selectedMemory?.id || '') === id;
                                const tags = getMemoryTags(m);
                                const type = getMemoryType(m);
                                const title = getMemoryTitle(m);
                                const content = getMemoryContent(m);
                                return (
                                    <button
                                        key={id || title}
                                        onClick={() => setSelectedId(id)}
                                        className={`w-full text-left p-3 rounded border transition-all ${isActive ? 'bg-blue-600/10 border-blue-500/40' : 'bg-[#1e1e1e] border-[#2b2d31] hover:border-[#3f4148]'}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs font-bold text-gray-200 truncate">{title}</div>
                                            <span className="text-[9px] uppercase tracking-widest text-gray-500">{type}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{content || 'Brak treści.'}</div>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                                            <Clock size={10} /> {formatDate(getMemoryTimestamp(m))}
                                        </div>
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {tags.slice(0, 4).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-[#2b2d31] text-[9px] text-gray-300">{tag}</span>
                                                ))}
                                                {tags.length > 4 && (
                                                    <span className="px-1.5 py-0.5 rounded bg-[#2b2d31] text-[9px] text-gray-400">+{tags.length - 4}</span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="xl:flex-1 w-full max-h-[600px] bg-[#141416] border border-[#2b2d31] rounded-lg flex flex-col min-h-0">
                        <div className="p-4 border-b border-[#2b2d31] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                                <Brain size={12} /> Memory Detail
                            </div>
                            {selectedMemory && (
                                <div className="text-[10px] text-gray-500">Access {getMemoryAccess(selectedMemory)}</div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {selectedMemory ? (
                                <>
                                    <div className="bg-[#1e1e1e] border border-[#2b2d31] rounded p-4">
                                        <div className="text-xs font-bold text-gray-200 mb-2">{getMemoryTitle(selectedMemory)}</div>
                                        <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{getMemoryContent(selectedMemory) || 'Brak treści.'}</div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-[#1e1e1e] border border-[#2b2d31] rounded p-4 space-y-2">
                                            <div className="text-[10px] uppercase tracking-widest text-gray-500">Metadata</div>
                                            <div className="text-xs text-gray-300 space-y-1">
                                                <div className="flex items-center justify-between"><span className="text-gray-500">Type</span><span>{getMemoryType(selectedMemory)}</span></div>
                                                <div className="flex items-center justify-between"><span className="text-gray-500">Created</span><span>{formatDate(getMemoryTimestamp(selectedMemory))}</span></div>
                                                <div className="flex items-center justify-between"><span className="text-gray-500">Importance</span><span>{getMemoryImportance(selectedMemory)}</span></div>
                                                <div className="flex items-center justify-between"><span className="text-gray-500">Relevance</span><span>{getMemoryRelevance(selectedMemory)}</span></div>
                                            </div>
                                        </div>
                                        <div className="bg-[#1e1e1e] border border-[#2b2d31] rounded p-4 space-y-2">
                                            <div className="text-[10px] uppercase tracking-widest text-gray-500">Tags</div>
                                            <div className="flex flex-wrap gap-1">
                                                {getMemoryTags(selectedMemory).length > 0 ? (
                                                    getMemoryTags(selectedMemory).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded bg-[#2b2d31] text-[10px] text-gray-300 flex items-center gap-1">
                                                            <Tag size={10} /> {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-600">Brak tagów.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-gray-600 text-center py-10">Wybierz wpis pamięci z listy.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
