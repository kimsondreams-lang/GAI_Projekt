
import React, { useState, useEffect, useContext } from 'react';
import { Server, HardDrive, ArrowRight, ArrowLeft, RefreshCw, Folder, File, Trash2, UploadCloud, DownloadCloud, AlertCircle, FolderOpen, CheckSquare, FolderPlus, Edit2 } from 'lucide-react';
import { db } from '../../services/memoryService';
import { ftpService, FTPFile } from '../../services/ftpService';
import { FileNode, ContextMenuItem } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { ContextMenu } from '../ui/ContextMenu';

export const FTPClient: React.FC = () => {
    const { showModal, handleContextMenu } = useContext(AppContext);
    
    // LOCAL STATE (REAL DISK)
    const [localPath, setLocalPath] = useState('/');
    const [localFiles, setLocalFiles] = useState<FileNode[]>([]);
    const [selectedLocal, setSelectedLocal] = useState<string[]>([]); // Multi-select

    // REMOTE STATE (FTP)
    const [remotePath, setRemotePath] = useState(db.getSettings().ftpConfig.rootPath || '/');
    const [remoteFiles, setRemoteFiles] = useState<FTPFile[]>([]);
    const [selectedRemote, setSelectedRemote] = useState<string[]>([]); // Multi-select
    
    // GENERAL
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        refreshLocal();
    }, [localPath]);

    const refreshLocal = async () => {
        setLoading(true);
        try {
            const files = await ftpService.listLocal(localPath);
            setLocalFiles(files);
        } catch (e: any) {
            console.error("Local Fetch Error", e);
            setError("Failed to read GAI Disk");
        } finally {
            setLoading(false);
            setSelectedLocal([]);
        }
    };

    const refreshRemote = async () => {
        setLoading(true);
        setError(null);
        setStatus(`Connecting to ${db.getSettings().ftpConfig.host}...`);
        try {
            const files = await ftpService.listFiles(remotePath);
            setRemoteFiles(files);
            setStatus('Connected');
        } catch (e: any) {
            setError(e.message);
            setStatus('Connection Failed');
        } finally {
            setLoading(false);
            setSelectedRemote([]);
        }
    };

    useEffect(() => {
        refreshRemote();
    }, [remotePath]);

    // --- HELPER ---
    const normalizePath = (p: string) => {
        if (p === '/') return '/';
        let clean = p.replace(/\/+$/, ''); // Remove trailing slashes
        return clean.replace(/\/+/g, '/'); // Remove double slashes
    };

    // --- NAVIGATION ---
    
    const handleLocalNav = (file: FileNode) => {
        if (file.type === 'directory') {
            setLocalPath(file.path);
        }
    };

    const handleLocalUp = () => {
        if (localPath === '/') return;
        const parent = localPath.substring(0, localPath.lastIndexOf('/')) || '/';
        setLocalPath(parent);
    };

    const handleRemoteNav = (file: FTPFile) => {
        if (file.isDirectory) {
            const base = remotePath === '/' ? '' : normalizePath(remotePath);
            const newPath = `${base}/${file.name}`;
            setRemotePath(newPath);
        }
    };

    const handleRemoteUp = () => {
        if (remotePath === '/') return;
        const normalized = normalizePath(remotePath);
        const parent = normalized.substring(0, normalized.lastIndexOf('/')) || '/';
        setRemotePath(parent);
    };

    // --- MULTI-SELECT LOGIC ---
    
    const handleSelectLocal = (e: React.MouseEvent, path: string, index: number) => {
        e.stopPropagation();
        if (e.shiftKey && selectedLocal.length > 0) {
            const lastPath = selectedLocal[selectedLocal.length - 1];
            const lastIndex = localFiles.findIndex(f => f.path === lastPath);
            if (lastIndex !== -1) {
                const start = Math.min(lastIndex, index);
                const end = Math.max(lastIndex, index);
                const range = localFiles.slice(start, end + 1).map(f => f.path);
                setSelectedLocal(prev => Array.from(new Set([...prev, ...range])));
            }
        } else if (e.ctrlKey || e.metaKey) {
            if (selectedLocal.includes(path)) {
                setSelectedLocal(prev => prev.filter(p => p !== path));
            } else {
                setSelectedLocal(prev => [...prev, path]);
            }
        } else {
            setSelectedLocal([path]);
        }
    };

    const handleSelectRemote = (e: React.MouseEvent, name: string, index: number) => {
        e.stopPropagation();
        if (e.shiftKey && selectedRemote.length > 0) {
            const lastName = selectedRemote[selectedRemote.length - 1];
            const lastIndex = remoteFiles.findIndex(f => f.name === lastName);
            if (lastIndex !== -1) {
                const start = Math.min(lastIndex, index);
                const end = Math.max(lastIndex, index);
                const range = remoteFiles.slice(start, end + 1).map(f => f.name);
                setSelectedRemote(prev => Array.from(new Set([...prev, ...range])));
            }
        } else if (e.ctrlKey || e.metaKey) {
            if (selectedRemote.includes(name)) {
                setSelectedRemote(prev => prev.filter(n => n !== name));
            } else {
                setSelectedRemote(prev => [...prev, name]);
            }
        } else {
            setSelectedRemote([name]);
        }
    };

    // --- ACTIONS ---

    const handleUpload = async () => {
        if (selectedLocal.length === 0) return;
        
        const nodesToUpload = localFiles.filter(f => selectedLocal.includes(f.path));
        
        if (nodesToUpload.length === 0) return;

        setLoading(true);
        
        try {
            let successCount = 0;
            const base = remotePath === '/' ? '' : normalizePath(remotePath);
            for (const node of nodesToUpload) {
                setStatus(`Uploading ${node.name}...`);
                const targetPath = `${base}/${node.name}`.replace(/\/+/g, '/');
                await ftpService.upload(node.path, targetPath);
                successCount++;
            }
            showModal('success', 'Upload Complete', `${successCount} item(s) sent to server.`);
            refreshRemote();
        } catch (e: any) {
            showModal('error', 'Upload Failed', e.message);
        } finally {
            setLoading(false);
            setStatus('Idle');
        }
    };

    const handleDownload = async () => {
        if (selectedRemote.length === 0) return;
        
        const filesToDownload = remoteFiles.filter(f => selectedRemote.includes(f.name));
        
        setLoading(true);
        try {
            let successCount = 0;
            const base = remotePath === '/' ? '' : normalizePath(remotePath);
            for (const file of filesToDownload) {
                setStatus(`Downloading ${file.name}...`);
                const targetRemotePath = `${base}/${file.name}`.replace(/\/+/g, '/');
                await ftpService.download(targetRemotePath, localPath, file.isDirectory);
                successCount++;
            }
            
            // CRITICAL: Fetch new state from server immediately to reflect downloads in VFS memory
            setStatus('Syncing VFS...');
            await db.fetchState();
            
            showModal('success', 'Download Complete', `${successCount} item(s) saved to local disk.`);
            refreshLocal(); 
        } catch (e: any) {
            showModal('error', 'Download Failed', e.message);
        } finally {
            setLoading(false);
            setStatus('Idle');
        }
    };

    const handleDeleteRemote = async () => {
        if (selectedRemote.length === 0) return;
        
        showModal('confirm', 'Delete Remote Items', `Permanently delete ${selectedRemote.length} item(s) from FTP Server?`, async () => {
             setLoading(true);
             try {
                 let count = 0;
                 const base = remotePath === '/' ? '' : normalizePath(remotePath);
                 for (const name of selectedRemote) {
                     setStatus(`Deleting ${name}...`);
                     const target = `${base}/${name}`.replace(/\/+/g, '/');
                     await ftpService.delete(target);
                     count++;
                 }
                 refreshRemote();
             } catch (e: any) {
                 showModal('error', 'Delete Failed', e.message);
             } finally {
                 setLoading(false);
                 setStatus('Idle');
             }
        });
    };

    const handleCreateRemoteFolder = () => {
        showModal('prompt', 'New Remote Folder', 'Enter folder name:', async (name?: string) => {
            if (name) {
                setLoading(true);
                setStatus('Creating Folder...');
                try {
                    const base = remotePath === '/' ? '' : normalizePath(remotePath);
                    const targetPath = `${base}/${name}`.replace(/\/+/g, '/');
                    await ftpService.createDir(targetPath);
                    refreshRemote();
                } catch (e: any) {
                    showModal('error', 'Creation Failed', e.message);
                } finally {
                    setLoading(false);
                    setStatus('Idle');
                }
            }
        });
    };

    const handleRenameRemote = (name: string) => {
        showModal('prompt', 'Rename Remote', `Enter new name for ${name}:`, async (newName?: string) => {
            if (newName && newName !== name) {
                setLoading(true);
                setStatus('Renaming...');
                try {
                    const base = remotePath === '/' ? '' : normalizePath(remotePath);
                    const oldPath = `${base}/${name}`.replace(/\/+/g, '/');
                    const newPath = `${base}/${newName}`.replace(/\/+/g, '/');
                    await ftpService.rename(oldPath, newPath);
                    refreshRemote();
                } catch (e: any) {
                    showModal('error', 'Rename Failed', e.message);
                } finally {
                    setLoading(false);
                    setStatus('Idle');
                }
            }
        }, undefined, name);
    };

    // --- CONTEXT MENU LOGIC ---
    const onRemoteContextMenu = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Select item if not selected
        if (!selectedRemote.includes(name)) setSelectedRemote([name]);
        
        const items: ContextMenuItem[] = [
            { label: 'Download', icon: <DownloadCloud size={14}/>, action: handleDownload },
        ];
        
        if (selectedRemote.length <= 1 && !selectedRemote.includes(name)) {
            // Logic for single item right click or if current item is the only one selected
             items.push({ label: 'Rename', icon: <Edit2 size={14}/>, action: () => handleRenameRemote(name) });
        } else if (selectedRemote.length === 1 && selectedRemote.includes(name)) {
             items.push({ label: 'Rename', icon: <Edit2 size={14}/>, action: () => handleRenameRemote(name) });
        }

        items.push({ label: 'Delete', icon: <Trash2 size={14}/>, danger: true, action: handleDeleteRemote });
        
        handleContextMenu(e, items);
    };

    const onRemoteBgContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        handleContextMenu(e, [
            { label: 'New Folder', icon: <FolderPlus size={14}/>, action: handleCreateRemoteFolder },
            { label: 'Refresh', icon: <RefreshCw size={14}/>, action: refreshRemote }
        ]);
    };

    return (
        <div className="flex flex-col h-full bg-neu-base text-neu-text font-mono text-sm select-none">
            {/* Header / Status Bar */}
            <div className="h-12 flex items-center justify-between px-4 bg-neu-base shadow-neu-flat border-b border-neu-border z-10">
                 <div className="flex items-center gap-2">
                     <Server size={18} className={status === 'Connected' ? 'text-green-400' : 'text-neu-muted'} />
                     <span className="text-xs font-bold">{db.getSettings().ftpConfig.host}</span>
                     <span className="text-[10px] text-neu-muted ml-2">Status: {status}</span>
                 </div>
                 <div className="flex gap-2">
                    <div className="text-[10px] text-neu-muted flex items-center mr-4">
                         <CheckSquare size={12} className="mr-1"/> Ctrl/Shift to Select
                    </div>
                    <button onClick={refreshRemote} className={`p-2 rounded hover:bg-neu-light/10 ${loading ? 'animate-spin' : ''}`}>
                        <RefreshCw size={16} />
                    </button>
                 </div>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold flex items-center gap-2 border-b border-red-500/20">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            {/* Dual Pane Container */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT PANE (REAL GAI DISK) */}
                <div className="flex-1 flex flex-col border-r border-neu-border bg-neu-base/50">
                    <div className="h-8 bg-neu-pressed flex items-center px-3 text-xs border-b border-neu-border justify-between">
                         <div className="flex items-center gap-2 truncate">
                            <HardDrive size={12} className="text-blue-400" />
                            <span className="font-bold">GAI System Disk: {localPath}</span>
                         </div>
                         <button onClick={handleLocalUp} className="hover:text-blue-400"><FolderOpen size={12}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1" onClick={() => setSelectedLocal([])}>
                         {localFiles.map((file, idx) => (
                             <div 
                                key={file.name}
                                onClick={(e) => handleSelectLocal(e, file.path, idx)}
                                onDoubleClick={() => handleLocalNav(file)}
                                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selectedLocal.includes(file.path) ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-neu-light/5'}`}
                             >
                                 {file.type === 'directory' ? <Folder size={14} className="text-yellow-400" /> : <File size={14} className="text-neu-muted" />}
                                 <span className="truncate">{file.name}</span>
                             </div>
                         ))}
                    </div>
                    <div className="h-6 bg-neu-base text-[10px] text-neu-muted flex items-center px-2 border-t border-neu-border">
                        {selectedLocal.length} item(s) selected
                    </div>
                </div>

                {/* CENTER ACTIONS */}
                <div className="w-12 bg-neu-base border-r border-neu-border flex flex-col items-center justify-center gap-4 py-4">
                    <button 
                        onClick={handleUpload} 
                        disabled={selectedLocal.length === 0} 
                        className="p-2 rounded bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-blue-400 disabled:opacity-30 transition-all"
                        title="Upload to FTP"
                    >
                        <ArrowRight size={18} />
                    </button>
                    <button 
                        onClick={handleDownload} 
                        disabled={selectedRemote.length === 0} 
                        className="p-2 rounded bg-neu-base shadow-neu-flat active:shadow-neu-pressed hover:text-green-400 disabled:opacity-30 transition-all"
                        title="Download from FTP"
                    >
                        <ArrowLeft size={18} />
                    </button>
                </div>

                {/* RIGHT PANE (REMOTE FTP) */}
                <div className="flex-1 flex flex-col bg-neu-base/50" onContextMenu={onRemoteBgContextMenu}>
                    <div className="h-8 bg-neu-pressed flex items-center px-3 text-xs border-b border-neu-border justify-between">
                         <div className="flex items-center gap-2 truncate">
                            <UploadCloud size={12} className="text-purple-400" />
                            <span>Remote: {remotePath}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <button onClick={handleCreateRemoteFolder} className="hover:text-purple-400"><FolderPlus size={12}/></button>
                            <button onClick={handleRemoteUp} className="hover:text-purple-400"><FolderOpen size={12}/></button>
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1" onClick={() => setSelectedRemote([])}>
                         {loading && <div className="p-4 text-center text-xs text-neu-muted animate-pulse">Fetching file list...</div>}
                         {!loading && remoteFiles.map((file, idx) => (
                             <div 
                                key={file.name}
                                onClick={(e) => handleSelectRemote(e, file.name, idx)}
                                onDoubleClick={() => handleRemoteNav(file)}
                                onContextMenu={(e) => onRemoteContextMenu(e, file.name)}
                                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selectedRemote.includes(file.name) ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-neu-light/5'}`}
                             >
                                 {file.isDirectory ? <Folder size={14} className="text-yellow-400" /> : <File size={14} className="text-neu-muted" />}
                                 <span className="truncate flex-1">{file.name}</span>
                                 <span className="text-[10px] text-neu-muted">{file.size > 0 ? (file.size / 1024).toFixed(1) + 'KB' : ''}</span>
                             </div>
                         ))}
                    </div>
                    <div className="h-8 border-t border-neu-border flex items-center justify-between px-2 bg-neu-base">
                        <div className="text-[10px] text-neu-muted">{selectedRemote.length} item(s) selected</div>
                        <button 
                            onClick={handleDeleteRemote} 
                            disabled={selectedRemote.length === 0} 
                            className="p-1.5 hover:bg-red-500/20 text-neu-muted hover:text-red-400 rounded transition-all disabled:opacity-30"
                            title="Delete Remote File"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
