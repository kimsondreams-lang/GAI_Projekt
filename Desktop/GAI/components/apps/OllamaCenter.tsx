import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Trash2, Download, Server, Search, X, Square } from 'lucide-react';

type OllamaVersion = { ok: boolean; baseUrl: string; version?: string; error?: string };
type OllamaPsModel = {
  name: string;
  model?: string;
  size?: number;
  size_vram?: number;
  context_length?: number;
  expires_at?: string;
  details?: { family?: string; parameter_size?: string; quantization_level?: string };
};
type OllamaTagsModel = {
  name: string;
  model?: string;
  size?: number;
  modified_at?: string;
  details?: { family?: string; parameter_size?: string; quantization_level?: string };
};

const formatBytes = (bytes?: number) => {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return '—';
  const gb = b / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = b / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const OllamaCenter: React.FC = () => {
  const [version, setVersion] = useState<OllamaVersion | null>(null);
  const [psModels, setPsModels] = useState<OllamaPsModel[]>([]);
  const [tagsModels, setTagsModels] = useState<OllamaTagsModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [pullName, setPullName] = useState('');
  const [pullEvents, setPullEvents] = useState<any[]>([]);
  const [pulling, setPulling] = useState(false);
  const pullAbortRef = useRef<AbortController | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [v, ps, tags] = await Promise.all([
        fetch('/api/ollama/version').then(r => r.json()).catch(() => null),
        fetch('/api/ollama/ps').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/ollama/tags').then(r => r.json()).catch(() => ({ models: [] })),
      ]);
      setVersion(v);
      setPsModels(Array.isArray(ps?.models) ? ps.models : []);
      setTagsModels(Array.isArray(tags?.models) ? tags.models : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const t = window.setInterval(() => refreshAll(), 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const q = libraryQuery.trim();
    if (q.length < 2) {
      setLibraryResults([]);
      setLibraryLoading(false);
      return;
    }
    setLibraryLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/ollama/library/search?q=${encodeURIComponent(q)}`).then(x => x.json()).catch(() => ({ results: [] }));
        setLibraryResults(Array.isArray(r?.results) ? r.results : []);
      } finally {
        setLibraryLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(handle);
  }, [libraryQuery]);

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagsModels;
    return tagsModels.filter(m => String(m.name || '').toLowerCase().includes(q));
  }, [tagsModels, query]);

  const deleteModel = async (name: string) => {
    await fetch('/api/ollama/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name })
    });
    refreshAll();
  };

  const stopModel = async (name: string) => {
    await fetch('/api/ollama/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name })
    });
    refreshAll();
  };

  const stopAllModels = async () => {
    const list = psModels.map(m => m.name).filter(Boolean);
    for (const name of list) {
      await stopModel(name);
    }
  };

  const cancelPull = () => {
    if (pullAbortRef.current) {
      pullAbortRef.current.abort();
      pullAbortRef.current = null;
    }
    setPulling(false);
  };

  const pullModel = async (name: string) => {
    const model = String(name || '').trim();
    if (!model) return;
    cancelPull();
    const abort = new AbortController();
    pullAbortRef.current = abort;
    setPullName(model);
    setPullEvents([]);
    setPulling(true);
    try {
      const r = await fetch('/api/ollama/pull/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
        signal: abort.signal
      });
      if (!r.ok || !r.body) {
        setPullEvents([{ status: `HTTP_${r.status}` }]);
        setPulling(false);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const idx = buffer.indexOf('\n\n');
          if (idx === -1) break;
          const block = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          const line = block.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload?.type === 'progress') setPullEvents(prev => [...prev.slice(-30), payload.content]);
            if (payload?.type === 'error') setPullEvents(prev => [...prev.slice(-30), payload.content]);
            if (payload?.type === 'done') setPulling(false);
          } catch {}
        }
      }
    } catch (e: any) {
      setPullEvents(prev => [...prev.slice(-30), { error: e?.message || String(e) }]);
    } finally {
      pullAbortRef.current = null;
      setPulling(false);
      refreshAll();
    }
  };

  const latestPull = pullEvents.length ? pullEvents[pullEvents.length - 1] : null;
  const pullPercent = (() => {
    const completed = Number(latestPull?.completed || 0);
    const total = Number(latestPull?.total || 0);
    if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
  })();

  return (
    <div className="w-full h-full bg-neu-base text-neu-text p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neu-base shadow-neu-flat border border-neu-border flex items-center justify-center">
            <Server size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight">Ollama Control Center</div>
            <div className="text-[11px] text-neu-muted font-bold">
              {version?.ok ? `Base URL: ${version.baseUrl} • v${version.version || '?'}` : `Base URL: ${version?.baseUrl || '—'} • offline`}
            </div>
          </div>
        </div>
        <button
          onClick={refreshAll}
          className="px-4 py-2 bg-neu-base shadow-neu-flat active:shadow-neu-pressed rounded-2xl text-xs font-bold flex items-center gap-2 transition-all hover:text-blue-400"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Odśwież
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-[calc(100%-86px)]">
        <div className="rounded-[2rem] bg-neu-base shadow-neu-flat border border-neu-border p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Modele w pamięci</div>
            <div className="flex items-center gap-3">
              {psModels.length > 0 && (
                <button
                  onClick={stopAllModels}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-black border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Square size={12} />
                  Stop all
                </button>
              )}
              <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">{psModels.length}</div>
            </div>
          </div>
          <div className="mt-4 overflow-y-auto custom-scrollbar flex-1">
            {psModels.length === 0 ? (
              <div className="text-neu-muted text-xs font-bold opacity-60">Brak aktywnych modeli.</div>
            ) : (
              <div className="space-y-3">
                {psModels.map((m) => (
                  <div key={m.name} className="rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black truncate">{m.name}</div>
                        <div className="text-[10px] text-neu-muted font-bold">
                          {m.details?.family || '—'} • {m.details?.parameter_size || '—'} • {m.details?.quantization_level || '—'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-neu-muted font-bold">VRAM: {formatBytes(m.size_vram || m.size)}</div>
                        <div className="text-[10px] text-neu-muted font-bold">CTX: {m.context_length || '—'}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-neu-muted font-bold">Wygasa: {formatDateTime(m.expires_at)}</div>
                    <div className="mt-3">
                      <button
                        onClick={() => stopModel(m.name)}
                        className="w-full px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-black border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Square size={14} />
                        Stop (wyrzuć z pamięci)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Pull</div>
              {pulling ? (
                <button
                  onClick={cancelPull}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-black border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <X size={12} />
                  Przerwij
                </button>
              ) : null}
            </div>
            <div className="flex gap-3 mt-3">
              <input
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                className="flex-1 bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none border border-transparent focus:border-blue-500/30 transition-all placeholder-neu-muted font-medium"
                placeholder="np. qwen3:14b lub freehuntx/qwen3-coder:14b"
              />
              <button
                onClick={() => pullModel(pullName)}
                disabled={pulling || !pullName.trim()}
                className="px-4 py-3 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-xs font-black text-neu-muted hover:text-neu-text transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Download size={14} />
                Pull
              </button>
            </div>
            {pullPercent !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-neu-muted font-bold">
                  <span>{latestPull?.status || 'pobieranie...'}</span>
                  <span>{pullPercent}%</span>
                </div>
                <div className="mt-2 w-full h-2 bg-neu-dark/40 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 transition-all" style={{ width: `${pullPercent}%` }} />
                </div>
              </div>
            )}
            {pullEvents.length > 0 && (
              <div className="mt-3 max-h-24 overflow-y-auto custom-scrollbar text-[10px] font-mono text-neu-muted whitespace-pre-wrap">
                {pullEvents.slice(-10).map((e, idx) => (
                  <div key={idx}>{typeof e === 'string' ? e : JSON.stringify(e)}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-neu-base shadow-neu-flat border border-neu-border p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Modele zainstalowane</div>
            <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">{tagsModels.length}</div>
          </div>

          <div className="mt-4 rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">Biblioteka (online)</div>
              <div className="text-[10px] font-black text-neu-muted uppercase tracking-widest">
                {libraryLoading ? '...' : libraryResults.length}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-neu-base shadow-neu-pressed rounded-xl p-3 border border-transparent focus-within:border-blue-500/30 transition-all">
              <Search size={14} className="text-neu-muted" />
              <input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-neu-text placeholder-neu-muted"
                placeholder="np. qwen, llama, gemma..."
              />
            </div>
            <div className="mt-3 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
              {libraryResults.map((r, idx) => (
                <div key={`${r?.name || 'r'}-${idx}`} className="rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">{r.name}</div>
                      {r.description ? (
                        <div className="text-[10px] text-neu-muted font-bold line-clamp-2">{r.description}</div>
                      ) : null}
                      <div className="text-[10px] text-neu-muted font-bold mt-1">
                        {(r.pulls ? `${r.pulls} pulls` : '')}{r.tags ? ` • ${r.tags} tags` : ''}{r.updated ? ` • ${r.updated}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPullName(r.name);
                        pullModel(r.name);
                      }}
                      className="px-3 py-2 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-[10px] font-black text-neu-muted hover:text-neu-text transition-all flex items-center gap-2"
                    >
                      <Download size={12} />
                      Pull
                    </button>
                  </div>
                </div>
              ))}
              {libraryQuery.trim().length >= 2 && !libraryLoading && libraryResults.length === 0 ? (
                <div className="text-neu-muted text-xs font-bold opacity-60">Brak wyników.</div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 bg-neu-base shadow-neu-pressed rounded-xl p-3 border border-transparent focus-within:border-blue-500/30 transition-all">
            <Search size={14} className="text-neu-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-neu-text placeholder-neu-muted"
              placeholder="Szukaj modelu..."
            />
          </div>

          <div className="mt-4 overflow-y-auto custom-scrollbar flex-1">
            {filteredTags.length === 0 ? (
              <div className="text-neu-muted text-xs font-bold opacity-60">Brak modeli.</div>
            ) : (
              <div className="space-y-3">
                {filteredTags.map((m) => (
                  <div key={m.name} className="rounded-2xl border border-neu-border bg-neu-base shadow-neu-pressed p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black truncate">{m.name}</div>
                        <div className="text-[10px] text-neu-muted font-bold">
                          {m.details?.family || '—'} • {m.details?.parameter_size || '—'} • {m.details?.quantization_level || '—'}
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-[10px] text-neu-muted font-bold">
                        <div>{formatBytes(m.size)}</div>
                        <div>{formatDateTime(m.modified_at)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => pullModel(m.name)}
                        className="flex-1 px-4 py-2 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-xs font-black text-neu-muted hover:text-neu-text transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Pull
                      </button>
                      <button
                        onClick={() => deleteModel(m.name)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-black border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        Usuń
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
