
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../services/memoryService';
import { AgentModule, SystemSettings, AppId } from '../../types';
import { Brain, Save, Plus, Trash2, Edit3, Bot, Check, X, Server, Search, Terminal, Image, FileText } from 'lucide-react';
import { soundService } from '../../services/soundService';
import { AppContext } from '../../contexts/AppContext';

const AVAILABLE_MODELS = [
  'mistral-nemo',
  'gemma2',
  'qwen2.5-coder',
  'llama3.1',
  'llava',
  'phi3',
  'deepseek-r1'
];

const CAPABILITIES = [
  { id: 'web_search', label: 'Web Search', icon: Search },
  { id: 'code_execution', label: 'Code & Terminal', icon: Terminal },
  { id: 'file_system', label: 'File System', icon: FileText },
  { id: 'vision', label: 'Vision', icon: Image },
  { id: 'ftp', label: 'FTP Access', icon: Server },
];

export const AgentControl: React.FC = () => {
  const { openApp, activeWindowId, setAppMenu } = useContext(AppContext);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [modules, setModules] = useState<AgentModule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgentModule>>({});
  const [masterModel, setMasterModel] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Initial menu setup (also checking window ID)
  useEffect(() => {
    // Cleanup is tricky if we depend on activeWindowId, as unmounting/blurring might not trigger cleanup
    // But App.tsx handles clearing if we switch to another window that doesn't set a menu.
    return () => {
        // Only clear if we are still the active window (e.g. unmounting)
        // If we just lost focus, App.tsx handles the switch.
    };
  }, [editingId, activeWindowId]); 

  useEffect(() => {
    const s = db.getSettings();
    setSettings(s);
    if (s.agenticSystem) {
      setModules(s.agenticSystem.modules || []);
      setMasterModel(s.agenticSystem.masterModel || '');
      setIsEnabled(s.agenticSystem.enabled || false);
      setAllowedModels(s.agenticSystem.allowedModels || []);
    }
    fetchOllamaModels();

    const handleStateUpdate = (e: CustomEvent) => {
        const s = e.detail?.settings;
        if (s) {
            setSettings(s);
            if (s.agenticSystem) {
                setModules(s.agenticSystem.modules || []);
                setMasterModel(s.agenticSystem.masterModel || '');
                setIsEnabled(s.agenticSystem.enabled || false);
                setAllowedModels(s.agenticSystem.allowedModels || []);
            }
        }
    };

    window.addEventListener('gai:state_update', handleStateUpdate as EventListener);
    return () => {
        window.removeEventListener('gai:state_update', handleStateUpdate as EventListener);
    };
  }, []);

  const fetchOllamaModels = async () => {
    setIsFetchingModels(true);
    try {
      // Assuming we have an endpoint or we can call ollama tags
      // For now, let's use the command endpoint to list them or a direct fetch if cors allows
      // Actually, server.js likely proxies /api/ollama/tags
      const res = await fetch('/api/ollama/tags');
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name);
        setAvailableOllamaModels(models);
      } else {
         // Fallback to static list if offline
         setAvailableOllamaModels(AVAILABLE_MODELS);
      }
    } catch (e) {
      console.warn('Failed to fetch ollama models', e);
      setAvailableOllamaModels(AVAILABLE_MODELS);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const saveConfig = async (newModules: AgentModule[]) => {
    // Fetch latest settings to avoid overwriting other fields
    const currentSettings = db.getSettings();
    if (!currentSettings || !currentSettings.agenticSystem) return;

    const newAgentic = {
      ...currentSettings.agenticSystem,
      modules: newModules
    };
    
    // Optimistic update
    setModules(newModules);
    setSettings({ ...currentSettings, agenticSystem: newAgentic });

    try {
      await db.updateSettings({
        agenticSystem: newAgentic
      });
      soundService.play('success');
    } catch (e) {
      console.error(e);
      soundService.play('error');
    }
  };

  const toggleAllowedModel = (model: string) => {
    // Removed: Managed in SettingsApp
  };

  const handleAddModule = () => {
    const newModule: AgentModule = {
      id: `agent_${Date.now()}`,
      name: 'New Agent',
      description: 'Describe what this agent does...',
      model: availableOllamaModels[0] || '',
      systemPrompt: 'You are a helpful assistant...',
      capabilities: [],
      memoryContext: []
    };
    setEditingId(newModule.id);
    setEditForm(newModule);
    setModules(prev => [...prev, newModule]);
  };

  const handleDelete = () => {
    if (editingId && confirm('Are you sure you want to delete this agent module?')) {
      const filtered = modules.filter(m => m.id !== editingId);
      saveConfig(filtered);
      setEditingId(null);
    }
  };

  const startEdit = (m: AgentModule) => {
    setEditingId(m.id);
    setEditForm({ ...m });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updated = modules.map(m => m.id === editingId ? { ...m, ...editForm } as AgentModule : m);
    saveConfig(updated);
    setEditingId(null);
  };

  const cancelEdit = () => {
    // If it was a new unsaved module (check if it exists in original modules but logic is tricky here, simpler to just revert form)
    // Actually if we added it to state in handleAddModule, we might want to remove it if user cancels immediately without saving?
    // For simplicity, we just stop editing. The module remains in the list if it was added.
    setEditingId(null);
  };

  const toggleCapability = (cap: any) => {
    const current = editForm.capabilities || [];
    const exists = current.includes(cap);
    setEditForm({
      ...editForm,
      capabilities: exists ? current.filter(c => c !== cap) : [...current, cap]
    });
  };

  const [customCapability, setCustomCapability] = useState('');

  const addCustomCapability = () => {
      if (!customCapability.trim()) return;
      const current = editForm.capabilities || [];
      if (!current.includes(customCapability.trim())) {
          setEditForm({
              ...editForm,
              capabilities: [...current, customCapability.trim()]
          });
      }
      setCustomCapability('');
  };

  const { maximizeWindow } = useContext(AppContext);

  // Define menu effects last to capture latest state/handlers
  useEffect(() => {
    if (activeWindowId === AppId.AGENT_CONTROL) {
        setAppMenu([
            {
                label: 'Agent',
                items: [
                    { label: 'New Agent', action: handleAddModule, shortcut: '⌘N' },
                    { label: 'Save Changes', action: saveEdit, disabled: !editingId, shortcut: '⌘S' },
                    { label: 'Delete Agent', action: handleDelete, disabled: !editingId },
                ]
            },
            {
                label: 'View',
                items: [
                    { label: 'Refresh Models', action: fetchOllamaModels },
                    { label: 'Refresh List', action: () => window.location.reload() }
                ]
            }
        ]);
    }
  }, [editingId, activeWindowId, modules, editForm]); 

  return (
    <div className="h-full w-full flex flex-col bg-neu-base text-neu-text overflow-hidden">
      {/* HEADER */}
      <div 
        className="p-6 border-b border-neu-border flex items-center justify-between bg-neu-base z-10 select-none"
        onDoubleClick={(e) => {
            e.stopPropagation();
            if (activeWindowId) maximizeWindow(activeWindowId);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Agent Control Center</h1>
            <p className="text-xs text-neu-muted font-medium">Monitor active specialized modules created by the Brain</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="text-[10px] text-neu-muted uppercase font-bold tracking-wider px-3 py-1.5 bg-neu-pressed rounded-lg border border-neu-border">
                Orchestrator: <span className="text-indigo-400">{masterModel || 'Not Configured'}</span>
             </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR LIST */}
        <div className="w-1/3 border-r border-neu-border flex flex-col bg-neu-base/50">
          
          <div className="p-4 border-b border-neu-border flex justify-between items-center bg-neu-base">
             <span className="text-xs font-bold text-neu-muted uppercase">Specialized Modules ({modules.length})</span>
             <button onClick={handleAddModule} className="p-1.5 rounded-md hover:bg-neu-pressed text-neu-text transition-colors">
               <Plus size={16} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {modules.map(m => (
              <div 
                key={m.id} 
                onClick={() => startEdit(m)}
                className={`p-3 rounded-xl border cursor-pointer transition-all group ${editingId === m.id ? 'bg-indigo-500/10 border-indigo-500/50 shadow-md' : 'bg-neu-base border-neu-border hover:border-neu-text/30'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">{m.name}</span>
                  {m.model && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neu-pressed text-neu-muted font-mono">{m.model}</span>}
                </div>
                <p className="text-xs text-neu-muted line-clamp-2">{m.description}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {m.capabilities.map(c => {
                    const iconDef = CAPABILITIES.find(x => x.id === c);
                    const Icon = iconDef ? iconDef.icon : Bot;
                    return <div key={c} className="w-5 h-5 rounded bg-neu-pressed flex items-center justify-center text-neu-muted"><Icon size={12} /></div>
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EDIT AREA */}
        <div className="flex-1 bg-neu-pressed/30 p-6 overflow-y-auto">
          {editingId ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-bold">Edit Module</h2>
                 <div className="flex gap-2">
                   <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                   <button onClick={saveEdit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Save size={16} /> Save Changes</button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neu-muted uppercase">Module Name</label>
                  <input 
                    type="text" 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-neu-base border border-neu-border rounded-lg p-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Research Agent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neu-muted uppercase">Assigned Model</label>
                  <select 
                    value={editForm.model || ''}
                    onChange={e => setEditForm({...editForm, model: e.target.value})}
                    className="w-full bg-neu-base border border-neu-border rounded-lg p-2.5 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select Model...</option>
                    {/* Show all available models here, even if not in allowed list, to allow flexibility for specific modules */}
                    {availableOllamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-neu-muted uppercase">Description</label>
                  <input 
                    type="text" 
                    value={editForm.description || ''} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    className="w-full bg-neu-base border border-neu-border rounded-lg p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Short description of responsibilities..."
                  />
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-neu-muted uppercase">System Prompt (Instructions)</label>
                  <textarea 
                    value={editForm.systemPrompt || ''} 
                    onChange={e => setEditForm({...editForm, systemPrompt: e.target.value})}
                    className="w-full h-40 bg-neu-base border border-neu-border rounded-lg p-3 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                    placeholder="You are an expert in..."
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-bold text-neu-muted uppercase">Capabilities</label>
                  
                  {/* Dynamic Tags Input */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(editForm.capabilities || []).map(cap => (
                        <div key={cap} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center gap-2">
                            {cap}
                            <button onClick={() => toggleCapability(cap)} className="hover:text-red-400"><X size={12}/></button>
                        </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                      <input 
                        value={customCapability}
                        onChange={(e) => setCustomCapability(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomCapability()}
                        className="flex-1 bg-neu-base border border-neu-border rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none"
                        placeholder="Add custom capability (e.g. speech, reasoning)..."
                      />
                      <button onClick={addCustomCapability} className="p-2.5 bg-neu-pressed rounded-lg hover:bg-indigo-500 hover:text-white transition-colors">
                          <Plus size={18}/>
                      </button>
                  </div>

                  {/* Preset Suggestions (Optional) */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAPABILITIES.map(cap => {
                      const isSelected = (editForm.capabilities || []).includes(cap.id as any);
                      if (isSelected) return null; // Hide if selected
                      const Icon = cap.icon;
                      return (
                        <button 
                          key={cap.id}
                          onClick={() => toggleCapability(cap.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-neu-base border-neu-border text-neu-muted hover:border-indigo-500/50 hover:text-indigo-400 transition-all text-xs"
                        >
                          <Icon size={12} />
                          <span>{cap.label}</span>
                          <Plus size={10} />
                        </button>
                      )
                    })}
                  </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neu-muted opacity-50">
              <Bot size={64} className="mb-4" />
              <p className="font-bold">Select a module to edit</p>
              <p className="text-sm">or create a new one to expand the system</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
