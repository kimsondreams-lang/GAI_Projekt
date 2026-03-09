

import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    Folder, FileText, FileCode, ChevronLeft, ChevronRight, 
    Search, Plus, RefreshCw, File, FolderPlus, Trash2, Edit2, LayoutGrid, 
    List as ListIcon, MonitorPlay, HardDrive, Loader2, Image as ImageIcon, Music, Video,
    Database, Copy, Scissors, Clipboard, Home
} from 'lucide-react';
import { db } from '../../services/memoryService';
import { FileNode, AppId } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { soundService } from '../../services/soundService';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'size' | 'date' | 'kind';
type SortOrder = 'asc' | 'desc';

interface ClipboardItem {
    paths: string[];
    op: 'copy' | 'cut';
}

export const FileManager: React.FC = () => {
  const { handleContextMenu, openApp, showModal } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Navigation State
  const [currentPath, setCurrentPath] = useState('/');
  const [history, setHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Data State
  const [files, setFiles] = useState<FileNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Selection & Clipboard
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  
  const isTrash = currentPath === '/.trash';

  // --- INITIALIZATION & FETCHING ---
  useEffect(() => {
    const loadFiles = async () => {
        setLoading(true);
        try {
            let nodes: FileNode[] = await db.listRealDisk(currentPath);
            
            if (searchTerm) {
                nodes = nodes.filter((f: FileNode) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            setFiles(sortNodes(nodes));
        } catch (e: any) {
            console.error(e);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    loadFiles();
  }, [currentPath, refresh, sortField, sortOrder, searchTerm]);

  const sortNodes = (nodes: FileNode[]) => {
      return [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        
        let valA: any = a.name.toLowerCase();
        let valB: any = b.name.toLowerCase();
        
        if (sortField === 'size') { valA = a.size; valB = b.size; }
        if (sortField === 'date') { valA = a.updatedAt; valB = b.updatedAt; }
        if (sortField === 'kind') { valA = getFileKind(a.name); valB = getFileKind(b.name); }
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }

  // --- NAVIGATION HELPERS ---
  const navigate = (path: string) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(path);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentPath(path);
      setSelectedPaths([]);
      setSearchTerm('');
  };

  const goBack = () => {
      if (historyIndex > 0) {
          const newIdx = historyIndex - 1;
          setHistoryIndex(newIdx);
          setCurrentPath(history[newIdx]);
      }
  };

  const goForward = () => {
      if (historyIndex < history.length - 1) {
          const newIdx = historyIndex + 1;
          setHistoryIndex(newIdx);
          setCurrentPath(history[newIdx]);
      }
  };

  const openNode = (node: FileNode) => {
      if (node.type === 'directory') {
          navigate(node.path);
      } else {
          openFile(node);
      }
  };

  const openFile = async (node: FileNode) => {
      const ext = node.name.split('.').pop()?.toLowerCase();
      if (['html', 'htm', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
          openApp(AppId.BROWSER, { url: `/api/fs/raw?path=${encodeURIComponent(node.path)}` });
      } else if (['json', 'js', 'ts', 'tsx', 'css', 'md', 'txt', 'yaml', 'yml'].includes(ext || '')) {
          openApp(AppId.TEXT_EDITOR, { file: node.path });
      } else {
           openApp(AppId.TERMINAL, { file: node.path });
      }
  };

  // --- ACTIONS ---
  const handleDelete = (paths: string[]) => {
      if (paths.length === 0) return;
      const confirmMsg = isTrash 
          ? `Permanently delete ${paths.length} item(s)? This cannot be undone.` 
          : `Move ${paths.length} item(s) to Trash?`;

      showModal('confirm', isTrash ? 'Delete Forever' : 'Move to Trash', confirmMsg, async () => {
          const optimizedPaths = paths.filter(p => !paths.some(parent => parent !== p && p.startsWith(parent + '/')));
          setLoading(true);
          
          try {
              // Fix: Await all delete operations to prevent race conditions with list refresh
              await Promise.all(optimizedPaths.map(path => {
                  if (isTrash) return db.removeVFS(path, true);
                  else return db.moveToTrash(path);
              }));
              
              soundService.play('click');
              setRefresh(prev => prev + 1);
              setSelectedPaths([]);
          } catch (e: any) {
              showModal('error', 'Error', 'Failed to delete items: ' + e.message);
          } finally {
              setLoading(false);
          }
      });
  };

  const handleCreateFolder = () => {
      showModal('prompt', 'New Folder', 'Enter folder name:', (name?: string) => {
          if (!name) return;
          const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
          db.makeDir(path);
          setRefresh(r => r + 1);
      });
  };

  // --- CLIPBOARD OPERATIONS ---
  const handleCopy = (paths: string[]) => {
      if (paths.length === 0) return;
      setClipboard({ paths, op: 'copy' });
      soundService.play('click');
  };

  const handleCut = (paths: string[]) => {
      if (paths.length === 0) return;
      setClipboard({ paths, op: 'cut' });
      soundService.play('click');
  };

  const handlePaste = () => {
      if (!clipboard) return;
      
      setLoading(true);
      setTimeout(() => { // Yield to UI
          clipboard.paths.forEach(srcPath => {
              const fileName = srcPath.split('/').pop();
              if (!fileName) return;
              const destPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
              
              if (clipboard.op === 'copy') {
                  db.copyVFS(srcPath, destPath);
              } else {
                  db.moveVFS(srcPath, destPath);
              }
          });
          
          if (clipboard.op === 'cut') setClipboard(null);
          setRefresh(r => r + 1);
          setLoading(false);
          soundService.play('success');
      }, 100);
  };

  const handleRename = (node: FileNode) => {
      showModal('prompt', 'Rename', `Enter new name for ${node.name}:`, (newName?: string) => {
          if (newName && newName !== node.name) {
              const parent = node.path.substring(0, node.path.lastIndexOf('/'));
              const destPath = parent === '/' ? `/${newName}` : `${parent}/${newName}`;
              db.moveVFS(node.path, destPath);
              setRefresh(r => r + 1);
          }
      }, undefined, node.name);
  };

  // --- SELECTION & DRAG ---
  const handleSelection = (e: React.MouseEvent, path: string, index: number) => {
      e.stopPropagation();
      if (e.shiftKey && selectedPaths.length > 0) {
          const lastPath = selectedPaths[selectedPaths.length - 1];
          const lastIndex = files.findIndex(f => f.path === lastPath);
          if (lastIndex !== -1) {
              const start = Math.min(lastIndex, index);
              const end = Math.max(lastIndex, index);
              const range = files.slice(start, end + 1).map(f => f.path);
              setSelectedPaths(prev => Array.from(new Set([...prev, ...range])));
          }
      } else if (e.ctrlKey || e.metaKey) {
          if (selectedPaths.includes(path)) setSelectedPaths(prev => prev.filter(p => p !== path));
          else setSelectedPaths(prev => [...prev, path]);
      } else {
          setSelectedPaths([path]);
      }
  };

  // --- UTILS ---
  const getFileKind = (name: string) => {
      const ext = name.split('.').pop()?.toLowerCase();
      if (!ext) return 'File';
      switch(ext) {
          case 'png': case 'jpg': case 'jpeg': case 'gif': return 'Image';
          case 'mp3': case 'wav': return 'Audio';
          case 'mp4': case 'mov': return 'Video';
          case 'js': case 'ts': case 'tsx': case 'html': case 'css': return 'Code';
          case 'txt': case 'md': return 'Text';
          case 'json': return 'JSON';
          default: return ext.toUpperCase();
      }
  };

  const getFileIcon = (name: string, type: 'file' | 'directory') => {
      if (type === 'directory') return <Folder className="text-blue-400 fill-blue-400/20" />;
      const kind = getFileKind(name);
      switch(kind) {
          case 'Image': return <ImageIcon className="text-purple-400" />;
          case 'Audio': return <Music className="text-pink-400" />;
          case 'Video': return <Video className="text-red-400" />;
          case 'Code': return <FileCode className="text-yellow-400" />;
          case 'Text': return <FileText className="text-gray-400" />;
          default: return <File className="text-neu-text" />;
      }
  };

  // --- CONTEXT MENUS ---
  const onContextMenu = (e: React.MouseEvent, node?: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      
      const items = [];
      if (node) {
          if (!selectedPaths.includes(node.path)) setSelectedPaths([node.path]);
          const targets = selectedPaths.includes(node.path) ? selectedPaths : [node.path];
          
          items.push({ label: 'Open', icon: <MonitorPlay size={14}/>, action: () => openNode(node) });
          
          items.push({ label: 'Copy', icon: <Copy size={14}/>, action: () => handleCopy(targets) });
          items.push({ label: 'Cut', icon: <Scissors size={14}/>, action: () => handleCut(targets) });

          if (targets.length === 1) {
             items.push({ label: 'Rename', icon: <Edit2 size={14}/>, action: () => handleRename(node) });
          }
          items.push({ label: isTrash ? 'Delete Forever' : 'Move to Trash', icon: <Trash2 size={14}/>, danger: true, action: () => handleDelete(targets) });
      } else {
          // Background Context Menu
          items.push({ label: 'New Folder', icon: <FolderPlus size={14}/>, action: handleCreateFolder });
          if (clipboard) {
              items.push({ 
                  label: `Paste ${clipboard.paths.length} Item(s)`, 
                  icon: <Clipboard size={14}/>, 
                  action: handlePaste 
              });
          }
          items.push({ label: 'Refresh', icon: <RefreshCw size={14}/>, action: () => setRefresh(r => r+1) });
      }
      handleContextMenu(e, items);
  };

  return (
    <div ref={containerRef} className="flex h-full bg-neu-base text-neu-text font-sans select-none overflow-hidden rounded-lg focus:outline-none" tabIndex={0} onClick={() => setSelectedPaths([])}>
      
      {/* SIDEBAR */}
      <div className="w-64 bg-neu-base/50 backdrop-blur-xl border-r border-neu-border flex flex-col pt-4" onClick={(e) => e.stopPropagation()}>
          {/* Standard Window Controls */}
          <div className="flex gap-2 px-6 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 cursor-pointer" onClick={() => showModal('info', 'Close', 'Close window from window controls.')}></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('minimize-window'))}></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('maximize-window'))}></div>
          </div>

          <div className="px-6 text-[10px] font-bold text-neu-muted uppercase tracking-widest mb-4 ml-1">Data Sources</div>
          
          <div className="flex-1 px-4 space-y-4">
              {/* LOCAL GAI DISK */}
              <button 
                  onClick={() => { if (currentPath !== '/') navigate('/'); }}
                  className={`w-full p-5 rounded-2xl flex flex-col items-start gap-3 transition-all duration-300 border relative overflow-hidden group cursor-pointer
                      ${currentPath === '/' 
                          ? 'bg-neu-base shadow-neu-pressed border-blue-500/30' 
                          : 'bg-neu-base shadow-neu-flat hover:shadow-neu-pressed border-transparent'
                      }`}
              >
                  <div className={`absolute inset-0 opacity-10 ${currentPath === '/' ? 'bg-blue-500' : 'bg-transparent group-hover:bg-white'}`}></div>
                  
                  <div className={`p-3 rounded-xl ${currentPath === '/' ? 'bg-blue-500 text-white shadow-lg' : 'bg-neu-base shadow-neu-pressed text-neu-muted'}`}>
                      <Database size={24} />
                  </div>
                  <div>
                      <div className={`text-sm font-bold ${currentPath === '/' ? 'text-blue-400' : 'text-neu-text'}`}>Dysk GAI</div>
                      <div className="text-[10px] text-neu-muted mt-1">Real Physical Storage</div>
                  </div>
              </button>
          </div>
          
          {/* Storage Info Footer */}
          <div className="p-6">
             <div className="p-4 rounded-xl bg-neu-pressed/50 border border-neu-border/50">
                <div className="flex items-center gap-2 text-neu-muted mb-2">
                    <HardDrive size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">System Volume</span>
                </div>
                <div className="h-1.5 bg-neu-dark rounded-full overflow-hidden">
                     <div className="w-[25%] h-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                </div>
                <div className="text-[9px] text-right text-neu-muted mt-1">/app/data Mounted</div>
             </div>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-neu-base min-w-0">
          
          {/* TOOLBAR */}
          <div className="h-14 border-b border-neu-border flex items-center justify-between px-4 bg-neu-base shrink-0 gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex gap-1 shrink-0">
                    <button onClick={goBack} disabled={historyIndex === 0} className="p-1.5 rounded hover:bg-neu-light/10 disabled:opacity-20"><ChevronLeft size={18}/></button>
                    <button onClick={goForward} disabled={historyIndex === history.length - 1} className="p-1.5 rounded hover:bg-neu-light/10 disabled:opacity-20"><ChevronRight size={18}/></button>
                  </div>
                  
                  {/* Breadcrumbs */}
                  <button 
                      onClick={() => { if(currentPath !== '/') navigate('/'); }}
                      className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-neu-pressed/50 rounded-lg border border-neu-border/50 truncate transition-all hover:border-blue-500/30 hover:bg-neu-pressed group"
                  >
                      <HardDrive size={14} className="text-blue-400 shrink-0" />
                      <div className="text-xs font-mono text-neu-text truncate w-full text-left">
                         {currentPath || '/'}
                      </div>
                      <Home size={12} className="text-neu-muted opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-neu-pressed/50 rounded-lg p-0.5 border border-neu-border">
                      <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode==='grid' ? 'bg-neu-base shadow-sm text-blue-400 scale-105' : 'text-neu-muted hover:text-neu-text'}`}><LayoutGrid size={14}/></button>
                      <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode==='list' ? 'bg-neu-base shadow-sm text-blue-400 scale-105' : 'text-neu-muted hover:text-neu-text'}`}><ListIcon size={14}/></button>
                  </div>
                  
                  <>
                    <button onClick={handleCreateFolder} className="p-2 rounded-lg hover:bg-neu-light/10 hover:text-green-400 transition-colors">
                        <FolderPlus size={18}/>
                    </button>
                    {clipboard && (
                        <button onClick={handlePaste} className="p-2 rounded-lg hover:bg-neu-light/10 text-blue-400 transition-colors" title="Paste">
                            <Clipboard size={18}/>
                        </button>
                    )}
                  </>
                  
                  <div className="relative hidden md:block w-40">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neu-muted" />
                      <input 
                        type="text" 
                        placeholder="Filter..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-neu-pressed/50 rounded-full py-1.5 pl-8 pr-4 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 border border-transparent focus:border-blue-500/20 transition-all"
                      />
                  </div>
              </div>
          </div>

          {/* FILE AREA */}
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-4 outline-none relative" 
            onContextMenu={(e) => onContextMenu(e)}
          >
              {loading && (
                  <div className="absolute inset-0 bg-neu-base/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                      <span className="text-xs font-bold text-neu-muted">Processing...</span>
                  </div>
              )}

              {files.length === 0 && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-neu-muted opacity-30 select-none">
                      {isTrash ? <Trash2 size={64} /> : <Folder size={64} />}
                      <span className="text-sm mt-4 font-medium">Empty Directory</span>
                  </div>
              )}

              {viewMode === 'grid' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {files.map((node, idx) => {
                          const isSelected = selectedPaths.includes(node.path);
                          return (
                              <div 
                                key={node.path}
                                onClick={(e) => handleSelection(e, node.path, idx)}
                                onDoubleClick={() => openNode(node)}
                                onContextMenu={(e) => onContextMenu(e, node)}
                                className={`group flex flex-col items-center gap-2 p-3 rounded-xl transition-all border select-none
                                    ${isSelected ? 'bg-blue-500/10 border-blue-500/30 shadow-neu-pressed' : 'border-transparent hover:bg-neu-light/5'}
                                `}
                              >
                                  <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                                      {React.cloneElement(getFileIcon(node.name, node.type) as React.ReactElement<any>, { size: 40, strokeWidth: 1.5 })}
                                  </div>
                                  <span className={`text-[11px] text-center line-clamp-2 w-full leading-tight ${isSelected ? 'text-blue-400 font-medium' : 'text-neu-text group-hover:text-neu-text'}`}>
                                      {node.name}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              )}

              {viewMode === 'list' && (
                  <table className="w-full text-left text-xs border-collapse select-none">
                      <thead className="sticky top-0 bg-neu-base z-10 text-neu-muted font-medium">
                          <tr className="border-b border-neu-border">
                              <th className="pb-2 pl-2 cursor-pointer hover:text-neu-text w-[50%]" onClick={() => { setSortField('name'); setSortOrder(sortOrder==='asc'?'desc':'asc'); }}>Name</th>
                              <th className="pb-2 cursor-pointer hover:text-neu-text" onClick={() => { setSortField('size'); setSortOrder(sortOrder==='asc'?'desc':'asc'); }}>Size</th>
                              <th className="pb-2 cursor-pointer hover:text-neu-text" onClick={() => { setSortField('kind'); setSortOrder(sortOrder==='asc'?'desc':'asc'); }}>Kind</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-neu-light/5">
                          {files.map((node, idx) => {
                              const isSelected = selectedPaths.includes(node.path);
                              return (
                                  <tr 
                                    key={node.path}
                                    onClick={(e) => handleSelection(e, node.path, idx)}
                                    onDoubleClick={() => openNode(node)}
                                    onContextMenu={(e) => onContextMenu(e, node)}
                                    className={`group cursor-default transition-colors ${isSelected ? 'bg-blue-500/10 text-blue-300' : 'hover:bg-neu-light/5 text-neu-text'}`}
                                  >
                                      <td className="py-2 pl-2 flex items-center gap-3">
                                          {React.cloneElement(getFileIcon(node.name, node.type) as React.ReactElement<any>, { size: 16 })}
                                          <span className="truncate font-medium">{node.name}</span>
                                      </td>
                                      <td className="py-2 text-neu-muted">{node.type === 'directory' ? '--' : (node.size < 1024 ? `${node.size} B` : `${(node.size/1024).toFixed(1)} KB`)}</td>
                                      <td className="py-2 text-neu-muted">{node.type === 'directory' ? 'Folder' : getFileKind(node.name)}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              )}
          </div>

          {/* STATUS BAR */}
          <div className="h-7 bg-neu-base border-t border-neu-border flex items-center px-4 text-[10px] text-neu-muted justify-between shrink-0" onClick={(e) => e.stopPropagation()}>
               <span className="flex items-center gap-2">
                   <HardDrive size={10} className="text-blue-400"/>
                   {'GAI Disk (Physical Storage)'}
                   {clipboard && (
                       <span className="ml-2 text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                           {clipboard.op === 'copy' ? 'Copying' : 'Cutting'} {clipboard.paths.length} item(s)
                       </span>
                   )}
               </span>
               <span>{files.length} item(s) • {selectedPaths.length} selected</span>
          </div>
      </div>
    </div>
  );
};
