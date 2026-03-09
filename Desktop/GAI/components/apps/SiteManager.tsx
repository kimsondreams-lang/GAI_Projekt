import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DownloadCloud, FolderOpen, RefreshCw, Server, Eye, Loader2, UploadCloud, Trash2 } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { db } from '../../services/memoryService';
import { ftpService } from '../../services/ftpService';

type BackupEntry = {
    id: string;
    createdAt: number;
    remotePath: string;
    localDir: string;
    note?: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatTs = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const safeJoin = (...parts: string[]) => {
    const cleaned = parts.map(p => String(p || '').replace(/\\/g, '/')).filter(Boolean);
    const joined = cleaned.join('/').replace(/\/{2,}/g, '/');
    return joined;
};

export const SiteManager: React.FC = () => {
    const { showModal, openProgressModal, updateProgressModal, closeModal } = useContext(AppContext);
    const settings = db.getSettings();

    const [statusLoading, setStatusLoading] = useState(false);
    const [dataDir, setDataDir] = useState('');
    const [remotePath, setRemotePath] = useState(String(settings?.ftpConfig?.rootPath || '/').trim() || '/');
    const [deployRemotePath, setDeployRemotePath] = useState(String(settings?.ftpConfig?.rootPath || '/').trim() || '/');
    const [backupBaseDir, setBackupBaseDir] = useState('');
    const [bundleDir, setBundleDir] = useState('');
    const [backups, setBackups] = useState<BackupEntry[]>([]);
    const [bundles, setBundles] = useState<{ id: string; localDir: string; updatedAt: number }[]>([]);
    const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
    const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const metaPath = useMemo(() => {
        if (!backupBaseDir) return '';
        return safeJoin(backupBaseDir, '_backups.json');
    }, [backupBaseDir]);

    const appRoot = useMemo(() => {
        const dir = String(dataDir || '').replace(/\\/g, '/').replace(/\/+$/g, '');
        if (!dir) return '';
        if (dir.toLowerCase().endsWith('/data')) return dir.slice(0, -5);
        return '';
    }, [dataDir]);

    const localSiteDir = useMemo(() => {
        if (!appRoot) return '';
        return safeJoin(appRoot, 'temp_ftp_blog');
    }, [appRoot]);

    useEffect(() => {
        if (!dataDir) return;
        setBundleDir(safeJoin(dataDir, 'out/site_bundles'));
    }, [dataDir]);

    const fetchSystemStatus = async () => {
        setStatusLoading(true);
        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            const dir = String(data?.persistence?.path || '').trim();
            if (!dir) throw new Error('Missing persistence path');
            setDataDir(dir);
            setBackupBaseDir(safeJoin(dir, 'out/site_backups'));
            setBundleDir(safeJoin(dir, 'out/site_bundles'));
        } catch (e: any) {
            showModal('error', 'Site Manager', e.message || 'Failed to read system status');
        } finally {
            setStatusLoading(false);
        }
    };

    const ensureDir = async (path: string) => {
        const res = await fetch('/api/fs/mkdir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.error || 'Failed to create directory');
        }
    };

    const readJson = async (path: string) => {
        const res = await fetch('/api/fs/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!res.ok) return null;
        const j = await res.json().catch(() => null);
        const content = String(j?.content || '');
        if (!content.trim()) return null;
        try {
            return JSON.parse(content);
        } catch {
            return null;
        }
    };

    const writeJson = async (path: string, value: any) => {
        const res = await fetch('/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content: JSON.stringify(value, null, 2), encoding: 'utf8' })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.error || 'Failed to write file');
        }
    };

    const deletePath = async (path: string) => {
        const res = await fetch('/api/fs/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, permanent: true })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || 'Failed to delete');
        return j;
    };

    const copyPath = async (src: string, dest: string) => {
        const res = await fetch('/api/fs/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ src, dest })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.error || 'Failed to copy');
        }
        return await res.json().catch(() => ({}));
    };

    const normalizeRemote = (p: string) => {
        const raw = String(p || '').trim().replace(/\\/g, '/');
        if (!raw) return '/';
        if (raw === '/') return '/';
        const noTrailing = raw.replace(/\/+$/g, '');
        return noTrailing.startsWith('/') ? noTrailing : `/${noTrailing}`;
    };

    const joinRemote = (base: string, rel: string) => {
        const b = normalizeRemote(base);
        const r = String(rel || '').replace(/^\/+/g, '');
        if (b === '/') return `/${r}`.replace(/\/{2,}/g, '/');
        return `${b}/${r}`.replace(/\/{2,}/g, '/');
    };

    const listAllFiles = async (rootAbsDir: string) => {
        const files: { localPath: string; relPath: string; size: number }[] = [];
        const stack: { dir: string; relPrefix: string }[] = [{ dir: rootAbsDir, relPrefix: '' }];
        while (stack.length) {
            const cur = stack.pop()!;
            const nodes = await db.listRealDisk(cur.dir);
            for (const n of nodes as any[]) {
                const name = String(n?.name || '');
                if (!name) continue;
                if (name === '.DS_Store') continue;
                if (name.startsWith('.')) continue;
                const type = String(n?.type || '');
                const abs = String(n?.path || '');
                const rel = `${cur.relPrefix}${name}`;
                if (type === 'directory') {
                    stack.push({ dir: abs, relPrefix: `${rel}/` });
                } else {
                    files.push({ localPath: abs, relPath: rel, size: Number(n?.size || 0) });
                }
            }
        }
        return files;
    };

    const deployBundle = async (bundleLocalDir: string) => {
        const targetBase = normalizeRemote(deployRemotePath);
        showModal('confirm', 'Deploy bundle', `Upload bundle to FTP path?\n\nBundle: ${bundleLocalDir}\nRemote: ${targetBase}`, async () => {
            setLoading(true);
            try {
                const progressId = openProgressModal({
                    title: 'Deploying bundle',
                    message: bundleLocalDir,
                    value: 0,
                    status: 'Preparing...',
                    details: [],
                    canCancel: false
                });
                const files = await listAllFiles(bundleLocalDir);
                if (files.length === 0) throw new Error('Bundle is empty.');
                const totalBytes = files.reduce((acc, f) => acc + Math.max(0, Number(f.size || 0)), 0);

                updateProgressModal(progressId, { status: `Creating directories (${files.length} files)...`, value: 1 });
                const dirSet = new Set<string>();
                for (const f of files) {
                    const parts = String(f.relPath || '').split('/').filter(Boolean);
                    if (parts.length <= 1) continue;
                    const dir = parts.slice(0, -1).join('/');
                    if (dir) dirSet.add(dir);
                }
                const dirs = Array.from(dirSet.values()).sort((a, b) => a.length - b.length);
                for (const d of dirs) {
                    await ftpService.createDir(joinRemote(targetBase, d));
                }

                let uploaded = 0;
                let uploadedBytes = 0;
                const details: string[] = [];
                for (const f of files) {
                    details.push(`Uploading: ${f.relPath}`);
                    const pct = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 98) + 2 : Math.round(((uploaded / files.length) * 98) + 2);
                    updateProgressModal(progressId, {
                        status: `Uploading ${uploaded + 1}/${files.length}`,
                        value: Math.max(0, Math.min(99, pct)),
                        details: details.slice(-120)
                    });
                    await ftpService.upload(f.localPath, joinRemote(targetBase, f.relPath));
                    uploaded += 1;
                    uploadedBytes += Math.max(0, Number(f.size || 0));
                }

                updateProgressModal(progressId, { status: 'Finalizing...', value: 100 });
                closeModal();
                showModal('success', 'Deploy complete', `Uploaded: ${uploaded} files\nRemote: ${targetBase}`);
            } catch (e: any) {
                showModal('error', 'Deploy failed', e.message || 'Deploy failed');
            } finally {
                setLoading(false);
            }
        });
    };

    const refreshBackups = async () => {
        if (!backupBaseDir) return;
        setLoading(true);
        try {
            await ensureDir(backupBaseDir);
            const fromMeta = (await readJson(metaPath)) as any;
            const metaEntries = Array.isArray(fromMeta?.backups) ? (fromMeta.backups as BackupEntry[]) : [];
            const list = await db.listRealDisk(backupBaseDir);
            const dirEntries = list.filter((n: any) => n?.type === 'directory').map((n: any) => {
                const id = String(n?.name || '').trim();
                return {
                    id,
                    createdAt: Number(n?.updatedAt || 0),
                    remotePath: '',
                    localDir: safeJoin(backupBaseDir, id)
                } satisfies BackupEntry;
            });
            const byId = new Map<string, BackupEntry>();
            for (const e of dirEntries) byId.set(e.id, e);
            for (const e of metaEntries) {
                if (!e?.id) continue;
                const prev = byId.get(e.id);
                byId.set(e.id, { ...prev, ...e });
            }
            const next = Array.from(byId.values())
                .filter(e => e?.id)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setBackups(next);
        } catch (e: any) {
            showModal('error', 'Site Manager', e.message || 'Failed to refresh backups');
        } finally {
            setLoading(false);
        }
    };

    const refreshBundles = async () => {
        if (!bundleDir) return;
        setLoading(true);
        try {
            await ensureDir(bundleDir);
            const list = await db.listRealDisk(bundleDir);
            const dirs = list
                .filter((n: any) => n?.type === 'directory')
                .map((n: any) => {
                    const id = String(n?.name || '').trim();
                    return { id, localDir: safeJoin(bundleDir, id), updatedAt: Number(n?.updatedAt || 0) };
                })
                .filter(e => e.id)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            setBundles(dirs);
        } catch (e: any) {
            showModal('error', 'Site Manager', e.message || 'Failed to refresh bundles');
        } finally {
            setLoading(false);
        }
    };

    const deleteBackup = async (b: BackupEntry) => {
        showModal('confirm', 'Delete backup', `Permanently delete this backup?\n\n${b.id}\n${b.localDir}`, async () => {
            setLoading(true);
            try {
                const progressId = openProgressModal({
                    title: 'Deleting backup',
                    message: b.id,
                    value: null,
                    status: 'Removing files...',
                    details: [b.localDir],
                    canCancel: false
                });
                await deletePath(b.localDir);
                try {
                    const current = (await readJson(metaPath)) as any;
                    const metaEntries = Array.isArray(current?.backups) ? current.backups : [];
                    const next = metaEntries.filter((x: any) => String(x?.id || '') !== String(b.id));
                    await writeJson(metaPath, { backups: next });
                } catch {
                }
                await refreshBackups();
                if (selectedBackupId === b.id) setSelectedBackupId(null);
                updateProgressModal(progressId, { status: 'Done', value: 100 });
                closeModal();
                showModal('success', 'Backup deleted', b.id);
            } catch (e: any) {
                showModal('error', 'Delete failed', e.message || 'Delete failed');
            } finally {
                setLoading(false);
            }
        });
    };

    const deleteBundle = async (b: { id: string; localDir: string; updatedAt: number }) => {
        showModal('confirm', 'Delete bundle', `Permanently delete this bundle?\n\n${b.id}\n${b.localDir}`, async () => {
            setLoading(true);
            try {
                const progressId = openProgressModal({
                    title: 'Deleting bundle',
                    message: b.id,
                    value: null,
                    status: 'Removing files...',
                    details: [b.localDir],
                    canCancel: false
                });
                await deletePath(b.localDir);
                await refreshBundles();
                if (selectedBundleId === b.id) setSelectedBundleId(null);
                updateProgressModal(progressId, { status: 'Done', value: 100 });
                closeModal();
                showModal('success', 'Bundle deleted', b.id);
            } catch (e: any) {
                showModal('error', 'Delete failed', e.message || 'Delete failed');
            } finally {
                setLoading(false);
            }
        });
    };

    const createBackup = async () => {
        const rp = String(remotePath || '').trim();
        if (!rp) {
            showModal('error', 'Backup', 'Remote path is required.');
            return;
        }
        if (!backupBaseDir) {
            showModal('error', 'Backup', 'Backup base dir not ready.');
            return;
        }
        setLoading(true);
        try {
            const progressId = openProgressModal({
                title: 'Creating FTP backup',
                message: rp,
                value: null,
                status: 'Preparing...',
                details: [],
                canCancel: false
            });
            await ensureDir(backupBaseDir);
            const now = Date.now();
            const id = `backup_${now}`;
            const localDir = safeJoin(backupBaseDir, id);
            await ensureDir(localDir);

            updateProgressModal(progressId, { status: 'Downloading directory from FTP...', details: [`Remote: ${rp}`, `Local: ${localDir}`] });
            await ftpService.download(rp, localDir, true);
            updateProgressModal(progressId, { status: 'Syncing state...', details: [`Downloaded: ${id}`] });
            await db.fetchState();

            const current = (await readJson(metaPath)) as any;
            const metaEntries = Array.isArray(current?.backups) ? current.backups : [];
            const entry: BackupEntry = { id, createdAt: now, remotePath: rp, localDir };
            await writeJson(metaPath, { backups: [entry, ...metaEntries].slice(0, 50) });
            await refreshBackups();
            updateProgressModal(progressId, { status: 'Done', value: 100 });
            closeModal();
            showModal('success', 'Backup complete', `Saved: ${id}\nFrom: ${rp}`);
        } catch (e: any) {
            showModal('error', 'Backup failed', e.message || 'FTP backup failed');
        } finally {
            setLoading(false);
        }
    };

    const exportLocalBundle = async () => {
        if (!localSiteDir) {
            showModal('error', 'Export bundle', 'Local site dir not detected (temp_ftp_blog).');
            return;
        }
        if (!bundleDir) {
            showModal('error', 'Export bundle', 'Bundle dir not ready.');
            return;
        }
        setLoading(true);
        try {
            const progressId = openProgressModal({
                title: 'Exporting bundle',
                message: localSiteDir,
                value: null,
                status: 'Preparing...',
                details: [],
                canCancel: false
            });
            await ensureDir(bundleDir);
            const id = `bundle_${Date.now()}`;
            const dest = safeJoin(bundleDir, id);
            updateProgressModal(progressId, { status: 'Copying files...', details: [`From: ${localSiteDir}`, `To: ${dest}`] });
            await copyPath(localSiteDir, dest);
            await refreshBundles();
            updateProgressModal(progressId, { status: 'Done', value: 100 });
            closeModal();
            showModal('success', 'Bundle exported', `Saved: ${dest}`);
        } catch (e: any) {
            showModal('error', 'Export failed', e.message || 'Export failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemStatus();
    }, []);

    useEffect(() => {
        if (backupBaseDir) refreshBackups();
    }, [backupBaseDir]);

    useEffect(() => {
        if (bundleDir) refreshBundles();
    }, [bundleDir]);

    return (
        <div className="flex flex-col h-full bg-neu-base text-neu-text font-mono p-6 gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neu-pressed rounded-lg shadow-neu-pressed">
                        <Server size={20} className="text-cyan-400" />
                    </div>
                    <div>
                        <div className="text-lg font-bold">Site Manager</div>
                        <div className="text-[10px] text-neu-muted">Lokalne backupy strony z FTP</div>
                    </div>
                </div>
                <button
                    onClick={refreshBackups}
                    disabled={loading || statusLoading || !backupBaseDir}
                    className="px-4 py-2 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-blue-400 font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neu-base shadow-neu-pressed rounded-2xl border border-neu-border p-4 flex flex-col gap-3">
                    <div className="text-xs font-bold text-neu-muted uppercase tracking-widest">Backup</div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-neu-muted font-bold">REMOTE PATH (FTP)</label>
                        <input
                            className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none border border-transparent focus:border-blue-500/20"
                            value={remotePath}
                            onChange={(e) => setRemotePath(e.target.value)}
                            placeholder="/public_html"
                        />
                        <label className="text-[10px] text-neu-muted font-bold">LOCAL BACKUP DIR</label>
                        <input
                            className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-xs text-neu-text outline-none border border-transparent focus:border-blue-500/20"
                            value={backupBaseDir || (dataDir ? safeJoin(dataDir, 'out/site_backups') : '')}
                            onChange={(e) => setBackupBaseDir(e.target.value)}
                            placeholder="(loading...)"
                        />
                    </div>
                    <button
                        onClick={createBackup}
                        disabled={loading || statusLoading}
                        className="w-full py-3 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-green-400 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <DownloadCloud size={18} />}
                        Backup now
                    </button>
                    <button
                        onClick={exportLocalBundle}
                        disabled={loading || statusLoading}
                        className="w-full py-3 rounded-xl bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-purple-400 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <FolderOpen size={18} />}
                        Export local bundle
                    </button>
                </div>

                <div className="bg-neu-base shadow-neu-pressed rounded-2xl border border-neu-border p-4 flex flex-col gap-3">
                    <div className="text-xs font-bold text-neu-muted uppercase tracking-widest">Status</div>
                    <div className="text-xs text-neu-muted flex flex-col gap-1">
                        <div>GAIOS: local</div>
                        <div>DATA_DIR: {dataDir || '(loading...)'}</div>
                        <div>Backups: {backups.length}</div>
                        <div>Bundles: {bundles.length}</div>
                        <div>Local site dir: {localSiteDir || '(not detected)'}</div>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <label className="text-[10px] text-neu-muted font-bold">DEPLOY REMOTE PATH (FTP)</label>
                        <input
                            className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-xs text-neu-text outline-none border border-transparent focus:border-blue-500/20"
                            value={deployRemotePath}
                            onChange={(e) => setDeployRemotePath(e.target.value)}
                            placeholder="/public_html"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="overflow-hidden bg-neu-base shadow-neu-pressed rounded-2xl border border-neu-border">
                    <div className="p-4 border-b border-neu-border flex items-center justify-between">
                        <div className="text-xs font-bold text-neu-muted uppercase tracking-widest">Backups</div>
                    </div>
                    <div className="p-4 overflow-y-auto h-full space-y-2 custom-scrollbar">
                        {backups.length === 0 && (
                            <div className="text-center text-neu-muted py-10 opacity-60">No backups yet. Click “Backup now”.</div>
                        )}
                        {backups.map((b) => (
                            <div
                                key={b.id}
                                onClick={() => setSelectedBackupId(b.id)}
                                className={`flex items-center justify-between p-3 rounded-xl bg-neu-base shadow-neu-flat border transition-all cursor-pointer
                                    ${selectedBackupId === b.id ? 'border-blue-500/40 shadow-neu-pressed' : 'border-transparent hover:border-blue-500/20'}`}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="font-bold text-sm text-neu-text">{b.id}</div>
                                    <div className="text-[10px] text-neu-muted">
                                        {formatTs(b.createdAt)} • {b.remotePath || '(unknown remote)'}
                                    </div>
                                    <div className="text-[10px] text-neu-muted opacity-80">{b.localDir}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteBackup(b); }}
                                        disabled={loading || statusLoading}
                                        className="p-2 hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.open(`/api/fs/raw?path=${encodeURIComponent(safeJoin(b.localDir, 'index.html'))}`, '_blank'); }}
                                        className="p-2 hover:text-blue-400 transition-colors"
                                        title="Preview index.html"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); showModal('info', 'Backup folder', b.localDir); }}
                                        className="p-2 hover:text-purple-400 transition-colors"
                                        title="Show local folder path"
                                    >
                                        <FolderOpen size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overflow-hidden bg-neu-base shadow-neu-pressed rounded-2xl border border-neu-border">
                    <div className="p-4 border-b border-neu-border flex items-center justify-between">
                        <div className="text-xs font-bold text-neu-muted uppercase tracking-widest">Bundles (do wysłania)</div>
                    </div>
                    <div className="p-4 overflow-y-auto h-full space-y-2 custom-scrollbar">
                        {bundles.length === 0 && (
                            <div className="text-center text-neu-muted py-10 opacity-60">No bundles yet. Click “Export local bundle”.</div>
                        )}
                        {bundles.map((b) => (
                            <div
                                key={b.id}
                                onClick={() => setSelectedBundleId(b.id)}
                                className={`flex items-center justify-between p-3 rounded-xl bg-neu-base shadow-neu-flat border transition-all cursor-pointer
                                    ${selectedBundleId === b.id ? 'border-blue-500/40 shadow-neu-pressed' : 'border-transparent hover:border-blue-500/20'}`}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="font-bold text-sm text-neu-text">{b.id}</div>
                                    <div className="text-[10px] text-neu-muted">{formatTs(b.updatedAt)}</div>
                                    <div className="text-[10px] text-neu-muted opacity-80">{b.localDir}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteBundle(b); }}
                                        disabled={loading || statusLoading}
                                        className="p-2 hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deployBundle(b.localDir); }}
                                        disabled={loading || statusLoading}
                                        className={`p-2 transition-colors disabled:opacity-50 ${selectedBundleId === b.id ? 'text-green-400' : 'hover:text-green-400'}`}
                                        title="Deploy to FTP"
                                    >
                                        <UploadCloud size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.open(`/api/fs/raw?path=${encodeURIComponent(safeJoin(b.localDir, 'index.html'))}`, '_blank'); }}
                                        className="p-2 hover:text-blue-400 transition-colors"
                                        title="Preview index.html"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); showModal('info', 'Bundle folder', b.localDir); }}
                                        className="p-2 hover:text-purple-400 transition-colors"
                                        title="Show local folder path"
                                    >
                                        <FolderOpen size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
