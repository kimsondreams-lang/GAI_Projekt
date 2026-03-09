
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, AlertTriangle, ExternalLink, Shield, ShieldOff, Star, X, Plus, GripVertical } from 'lucide-react';
import { db } from '../../services/memoryService';

interface BrowserProps {
    launchArgs?: { url?: string };
}

interface Tab {
    id: string;
    url: string;
    inputUrl: string;
    title: string;
    history: string[];
    historyIndex: number;
    isLoading: boolean;
    useProxy: boolean;
    iframeSrc: string;
    srcDoc: string | undefined;
    loadError: string | null;
}

export const BrowserApp: React.FC<BrowserProps> = ({ launchArgs }) => {
  const [tabs, setTabs] = useState<Tab[]>([{
      id: 'tab-1',
      url: 'https://technova.buzz',
      inputUrl: 'https://technova.buzz',
      title: 'Technova',
      history: ['https://technova.buzz'],
      historyIndex: 0,
      isLoading: false,
      useProxy: false,
      iframeSrc: 'https://technova.buzz',
      srcDoc: undefined,
      loadError: null
  }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [bookmarks, setBookmarks] = useState<{title: string, url: string}[]>([]);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
      // Load bookmarks
      try {
          const saved = localStorage.getItem('browser_bookmarks');
          if (saved) setBookmarks(JSON.parse(saved));
      } catch (e) {}
  }, []);

  useEffect(() => {
      if (launchArgs?.url) {
          // If we have launchArgs, either open in active tab or new tab
          // Let's open in current tab for simplicity, or update if it's default
          navigate(launchArgs.url);
      }
  }, [launchArgs]);

  // Helper to update active tab
  const updateActiveTab = (updates: Partial<Tab>) => {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };
  
  const updateTab = (id: string, updates: Partial<Tab>) => {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const createNewTab = () => {
      const newId = `tab-${Date.now()}`;
      const newTab: Tab = {
          id: newId,
          url: 'https://google.com',
          inputUrl: 'https://google.com',
          title: 'New Tab',
          history: ['https://google.com'],
          historyIndex: 0,
          isLoading: false,
          useProxy: false,
          iframeSrc: 'https://google.com',
          srcDoc: undefined,
          loadError: null
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newId);
      loadContentForTab(newTab.url, newTab.useProxy, newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (tabs.length === 1) {
          // Don't close last tab, just reset it
          updateTab(id, {
              url: 'https://technova.buzz',
              inputUrl: 'https://technova.buzz',
              title: 'Technova',
              history: ['https://technova.buzz'],
              historyIndex: 0,
              useProxy: false
          });
          return;
      }
      
      const newTabs = tabs.filter(t => t.id !== id);
      setTabs(newTabs);
      if (activeTabId === id) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
      }
  };

  const toggleBookmark = () => {
      const exists = bookmarks.some(b => b.url === activeTab.url);
      let nextBookmarks;
      if (exists) {
          nextBookmarks = bookmarks.filter(b => b.url !== activeTab.url);
      } else {
          nextBookmarks = [...bookmarks, { title: new URL(activeTab.url).hostname, url: activeTab.url }];
      }
      setBookmarks(nextBookmarks);
      localStorage.setItem('browser_bookmarks', JSON.stringify(nextBookmarks));
  };

  const navigate = (newUrl: string) => {
      let finalUrl = newUrl;
      if (newUrl.startsWith('/')) {
          finalUrl = newUrl;
      } else if (!newUrl.startsWith('http') && !newUrl.startsWith('file://')) {
          finalUrl = `https://${newUrl}`;
      }
      
      // SMART HANDLING
      let autoProxy = activeTab.useProxy;

      // 1. YouTube: Convert Watch to Embed (Bypass X-Frame-Options natively)
      if (finalUrl.includes('youtube.com/watch') || finalUrl.includes('youtu.be/')) {
          try {
              const urlObj = new URL(finalUrl);
              let videoId = urlObj.searchParams.get('v');
              if (!videoId && finalUrl.includes('youtu.be/')) {
                  videoId = finalUrl.split('youtu.be/')[1]?.split('?')[0];
              }
              if (videoId) {
                  finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                  // Embeds don't need proxy usually
                  autoProxy = false; 
              }
          } catch (e) {}
      }

      // 2. Google/Bing/DuckDuckGo: Force Proxy (they block iframes)
      if (finalUrl.includes('google.') || finalUrl.includes('bing.com') || finalUrl.includes('duckduckgo.com') || finalUrl.includes('wikipedia.org')) {
           autoProxy = true;
      }

      const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      newHistory.push(finalUrl);
      
      updateActiveTab({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          url: finalUrl,
          inputUrl: finalUrl,
          useProxy: autoProxy
      });
      
      // Load content
      loadContentForTab(finalUrl, autoProxy, activeTabId);
  };

  const goBack = () => {
      if (activeTab.historyIndex > 0) {
          const newIndex = activeTab.historyIndex - 1;
          const prevUrl = activeTab.history[newIndex];
          updateActiveTab({
              historyIndex: newIndex,
              url: prevUrl,
              inputUrl: prevUrl
          });
          loadContentForTab(prevUrl, activeTab.useProxy, activeTabId);
      }
  };

  const goForward = () => {
      if (activeTab.historyIndex < activeTab.history.length - 1) {
          const newIndex = activeTab.historyIndex + 1;
          const nextUrl = activeTab.history[newIndex];
          updateActiveTab({
              historyIndex: newIndex,
              url: nextUrl,
              inputUrl: nextUrl
          });
          loadContentForTab(nextUrl, activeTab.useProxy, activeTabId);
      }
  };

  const toggleProxy = () => {
      const nextProxy = !activeTab.useProxy;
      updateActiveTab({ useProxy: nextProxy });
      loadContentForTab(activeTab.url, nextProxy, activeTabId);
  };

  const loadContentForTab = (target: string, proxy: boolean, tabId: string) => {
      updateTab(tabId, { isLoading: true, loadError: null });
      
      let newIframeSrc = '';
      let newSrcDoc: string | undefined = undefined;
      let newTitle = 'Loading...';

      try {
          if (!target.startsWith('file://')) {
              newTitle = new URL(target).hostname;
          } else {
              newTitle = target.split('/').pop() || 'Local File';
          }
      } catch (e) { newTitle = target; }

      if (target.startsWith('file://')) {
          // INTERNAL: Read from VFS
          const path = target.replace('file://', '');
          const content = db.readVFS(path);
          if (content !== null) {
              if (path.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                   newSrcDoc = `
                    <html>
                    <body style="margin:0; background:#212529; display:flex; justify-content:center; align-items:center; height:100vh;">
                        <img src="${content}" style="max-width:100%; max-height:100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px;" />
                    </body>
                    </html>
                   `;
              } else {
                   newSrcDoc = content;
              }
              newIframeSrc = '';
          } else {
              newSrcDoc = `
                <html>
                <body style="background:#f0f0f0; font-family:sans-serif; padding:40px; text-align:center; color:#333;">
                    <h1 style="font-size:48px; margin-bottom:0;">404</h1>
                    <p>File not found in Virtual File System</p>
                    <code style="background:#e0e0e0; padding:4px 8px; border-radius:4px;">${path}</code>
                </body>
                </html>
              `;
              newIframeSrc = '';
              newTitle = '404 Not Found';
          }
      } else {
          // EXTERNAL
          // Sprawdzamy, czy to nasza własna strona (localhost lub obecny host)
          // Aby uniknąć "Incepcji" (ładowania GAIOS wewnątrz GAIOS)
          const currentHost = window.location.host;
          const targetUrlObj = new URL(target);
          
          if (targetUrlObj.host === currentHost) {
              // Zamiast ładować iframe, wyświetlamy komunikat
               newSrcDoc = `
                <html>
                <body style="background:#18181b; font-family:sans-serif; padding:40px; text-align:center; color:#e0e0e0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
                    <div style="font-size:64px; margin-bottom:20px;">♾️</div>
                    <h1 style="font-size:24px; margin-bottom:10px;">Recursive Loop Detected</h1>
                    <p style="color:#a0a0a0;">You are trying to open GAI OS inside itself.</p>
                </body>
                </html>
              `;
              newIframeSrc = '';
              newTitle = 'Loop Detected';
          } else {
              newSrcDoc = undefined;
              if (proxy) {
                  newIframeSrc = `/api/proxy?url=${encodeURIComponent(target)}`;
              } else {
                  newIframeSrc = target;
              }
          }
      }
      
      updateTab(tabId, {
          iframeSrc: newIframeSrc,
          srcDoc: newSrcDoc,
          title: newTitle
      });

      setTimeout(() => updateTab(tabId, { isLoading: false }), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-neu-base text-neu-text">
        {/* Browser Toolbar & Tabs */}
        <div className="flex flex-col z-10 shrink-0 bg-neu-base shadow-neu-flat border-b border-neu-border">
            
            {/* Tabs Bar */}
            <div className="flex items-end px-2 gap-1 pt-2 bg-neu-dark/10 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <div 
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer select-none min-w-[120px] max-w-[200px] border-t border-x border-transparent transition-all
                            ${activeTabId === tab.id 
                                ? 'bg-neu-base text-neu-text border-neu-border shadow-sm z-10' 
                                : 'bg-neu-base/40 text-neu-muted hover:bg-neu-base/60 border-transparent'}
                        `}
                    >
                        {tab.isLoading ? <RotateCw size={10} className="animate-spin" /> : <img src={`https://www.google.com/s2/favicons?domain=${tab.url}`} className="w-3 h-3 opacity-70" alt="" />}
                        <span className="truncate flex-1">{tab.title}</span>
                        <button 
                            onClick={(e) => closeTab(e, tab.id)}
                            className={`p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-500 opacity-0 group-hover:opacity-100 ${tabs.length === 1 ? 'hidden' : ''}`}
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
                <button 
                    onClick={createNewTab}
                    className="p-1.5 ml-1 mb-1 rounded-full hover:bg-neu-light/20 text-neu-muted"
                    title="New Tab"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Navigation Bar */}
            <div className="h-12 flex items-center px-4 gap-3 bg-neu-base">
                <div className="flex items-center gap-1">
                    <button onClick={goBack} disabled={activeTab.historyIndex===0} className="p-2 rounded-full hover:bg-neu-light/20 disabled:opacity-30"><ArrowLeft size={16}/></button>
                    <button onClick={goForward} disabled={activeTab.historyIndex===activeTab.history.length-1} className="p-2 rounded-full hover:bg-neu-light/20 disabled:opacity-30"><ArrowRight size={16}/></button>
                    <button onClick={() => loadContentForTab(activeTab.url, activeTab.useProxy, activeTabId)} className={`p-2 rounded-full hover:bg-neu-light/20 ${activeTab.isLoading ? 'animate-spin' : ''}`}><RotateCw size={16}/></button>
                </div>
                
                <form 
                    onSubmit={(e) => { e.preventDefault(); navigate(activeTab.inputUrl); }}
                    className="flex-1 flex items-center bg-neu-dark/20 rounded-full px-4 py-1.5 border border-neu-border focus-within:border-neu-accent/50 transition-colors"
                >
                    <Lock size={12} className="text-green-500 mr-2" />
                    <input 
                        className="flex-1 bg-transparent outline-none text-xs text-neu-text placeholder-neu-muted"
                        value={activeTab.inputUrl}
                        onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
                        onFocus={(e) => e.target.select()}
                    />
                    <button 
                        type="button"
                        onClick={toggleBookmark}
                        className={`ml-2 p-1 rounded-full hover:bg-white/10 ${bookmarks.some(b => b.url === activeTab.url) ? 'text-yellow-400' : 'text-neu-muted'}`}
                    >
                        <Star size={14} fill={bookmarks.some(b => b.url === activeTab.url) ? "currentColor" : "none"} />
                    </button>
                </form>

                {/* Proxy Toggle */}
                <button 
                    onClick={toggleProxy}
                    className={`p-2 rounded-full transition-all ${activeTab.useProxy ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]' : 'hover:bg-neu-light/20 text-neu-muted'}`}
                    title={activeTab.useProxy ? "Proxy Enabled (Bypass Blocks)" : "Proxy Disabled (Direct Connection)"}
                >
                    {activeTab.useProxy ? <Shield size={16} /> : <ShieldOff size={16} />}
                </button>

                {/* Open External Button */}
                <button 
                    onClick={() => window.open(activeTab.url, '_blank')}
                    className="p-2 rounded-full hover:bg-neu-light/20 text-neu-muted hover:text-blue-400 transition-colors"
                    title="Open in New Tab (External)"
                >
                    <ExternalLink size={16}/>
                </button>
            </div>
            
            {/* Bookmarks Bar */}
            {bookmarks.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto no-scrollbar border-t border-neu-border/30 bg-neu-base">
                    {bookmarks.map((b, i) => (
                        <button 
                            key={i}
                            onClick={() => navigate(b.url)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-neu-light/10 hover:bg-neu-light/30 whitespace-nowrap transition-colors group"
                        >
                            <img src={`https://www.google.com/s2/favicons?domain=${b.url}`} className="w-3 h-3 opacity-70" alt="" />
                            <span className="max-w-[100px] truncate">{b.title || b.url}</span>
                            <span 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const next = bookmarks.filter(bm => bm.url !== b.url);
                                    setBookmarks(next);
                                    localStorage.setItem('browser_bookmarks', JSON.stringify(next));
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 px-1"
                            >
                                <X size={10} />
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Content Area - Render ALL iframes but hide inactive to preserve state */}
        <div className="flex-1 bg-white relative overflow-hidden">
             {tabs.map(tab => (
                 <div 
                    key={tab.id} 
                    className="w-full h-full"
                    style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                 >
                     <iframe 
                        src={tab.iframeSrc}
                        srcDoc={tab.srcDoc}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                        title={`browser-content-${tab.id}`}
                        onError={() => updateTab(tab.id, { loadError: "Connection Refused" })}
                     />
                     
                     {tab.loadError && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-600">
                             <AlertTriangle size={48} className="mb-4 text-red-500" />
                             <h2 className="text-xl font-bold">Connection Error</h2>
                             <p className="mt-2 text-sm">The remote server refused the connection (likely X-Frame-Options).</p>
                             <p className="text-xs text-gray-500 mt-1">Try enabling the 🛡️ Shield (Proxy Mode) in the toolbar.</p>
                             <button 
                                onClick={() => window.open(tab.url, '_blank')}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                             >
                                 <ExternalLink size={16} /> Open in New Tab
                             </button>
                         </div>
                     )}
                 </div>
             ))}
        </div>
    </div>
  );
};
