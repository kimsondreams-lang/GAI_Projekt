
import React, { useState, useEffect, useRef, useContext } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Save, FilePlus, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../../services/memoryService';
import { AppContext } from '../../contexts/AppContext';
import { soundService } from '../../services/soundService';

// Configure Monaco Loader to use a reliable CDN
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

interface TextEditorProps {
    launchArgs?: { file?: string };
}

interface EditorTab {
    id: string;
    filePath: string | null;
    title: string;
    content: string;
    isDirty: boolean;
    language: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({ launchArgs }) => {
    const { showModal } = useContext(AppContext);
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [lineCount, setLineCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState('plaintext');
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const storageKey = 'gai_texteditor_tabs_v1';
    const lastOpenedRef = useRef<string | null>(null);

    const languageOptions = [
        { id: 'plaintext', label: 'Plain Text' },
        { id: 'javascript', label: 'JavaScript' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'json', label: 'JSON' },
        { id: 'html', label: 'HTML' },
        { id: 'css', label: 'CSS' },
        { id: 'markdown', label: 'Markdown' },
        { id: 'python', label: 'Python' },
        { id: 'shell', label: 'Shell' },
        { id: 'yaml', label: 'YAML' }
    ];

    const detectLanguage = (path?: string | null) => {
        if (!path) return 'plaintext';
        const ext = path.split('.').pop()?.toLowerCase();
        if (!ext) return 'plaintext';
        if (['js', 'mjs', 'cjs'].includes(ext)) return 'javascript';
        if (['ts', 'tsx'].includes(ext)) return 'typescript';
        if (['json'].includes(ext)) return 'json';
        if (['html', 'htm'].includes(ext)) return 'html';
        if (['css', 'scss', 'less'].includes(ext)) return 'css';
        if (['md', 'markdown'].includes(ext)) return 'markdown';
        if (['py'].includes(ext)) return 'python';
        if (['sh', 'bash', 'zsh'].includes(ext)) return 'shell';
        if (['yml', 'yaml'].includes(ext)) return 'yaml';
        return 'plaintext';
    };

    const createFallbackTab = (): EditorTab => ({
        id: `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        filePath: null,
        title: 'Untitled',
        content: '',
        isDirty: false,
        language: 'plaintext'
    });

    const createTab = (payload?: Partial<EditorTab>) => {
        const base = createFallbackTab();
        const next: EditorTab = {
            ...base,
            ...payload,
            language: payload?.language ?? detectLanguage(payload?.filePath)
        };
        setTabs(prev => [...prev, next]);
        setActiveTabId(next.id);
        return next.id;
    };

    const updateTab = (id: string, patch: Partial<EditorTab>) => {
        setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, ...patch } : tab));
    };

    const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0] || null;

    useEffect(() => {
        if (!activeTab && tabs.length > 0) {
            setActiveTabId(tabs[0].id);
            return;
        }
        if (activeTab) {
            setLanguage(activeTab.language);
            setLineCount(activeTab.content.split('\n').length || 1);
        }
    }, [activeTabId, tabs]);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed?.tabs) && parsed.tabs.length > 0) {
                    setTabs(parsed.tabs);
                    setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
                    return;
                }
            } catch {}
        }
        const initial = createFallbackTab();
        setTabs([initial]);
        setActiveTabId(initial.id);
    }, []);

    useEffect(() => {
        if (tabs.length === 0) return;
        localStorage.setItem(storageKey, JSON.stringify({ tabs, activeTabId }));
    }, [tabs, activeTabId]);

    useEffect(() => {
        const loadFile = async () => {
            if (!launchArgs?.file) return;
            if (lastOpenedRef.current === launchArgs.file) return;
            lastOpenedRef.current = launchArgs.file;
            setLoading(true);
            try {
                let data = db.readVFS(launchArgs.file);
                if (data === null || data === "[Content deferred]" || data === "[BLOB_OMITTED_FOR_PERFORMANCE]") {
                    data = await db.fetchFileContent(launchArgs.file);
                }
                if (data !== null) {
                    const existing = tabs.find(tab => tab.filePath === launchArgs.file);
                    if (existing) {
                        setActiveTabId(existing.id);
                        updateTab(existing.id, { content: data, isDirty: false });
                    } else {
                        createTab({
                            filePath: launchArgs.file,
                            title: launchArgs.file.split('/').pop() || 'Untitled',
                            content: data,
                            isDirty: false,
                            language: detectLanguage(launchArgs.file)
                        });
                    }
                } else {
                    createTab({
                        filePath: launchArgs.file,
                        title: launchArgs.file.split('/').pop() || 'Untitled',
                        content: '// File not found or empty',
                        isDirty: false,
                        language: detectLanguage(launchArgs.file)
                    });
                }
            } catch (err: any) {
                showModal('error', 'Load Error', err.message);
            } finally {
                setLoading(false);
            }
        };
        loadFile();
    }, [launchArgs?.file, tabs]);

    const handleEditorChange = (value?: string) => {
        if (!activeTab) return;
        const val = value ?? '';
        updateTab(activeTab.id, { content: val, isDirty: true });
        setLineCount(val.split('\n').length || 1);
    };

    const saveTab = (tab: EditorTab, onSaved?: () => void) => {
        if (tab.filePath) {
            db.writeVFS(tab.filePath, tab.content);
            updateTab(tab.id, { isDirty: false, title: tab.filePath.split('/').pop() || tab.title });
            soundService.play('success');
            if (onSaved) onSaved();
        } else {
            showModal('prompt', 'Save File', 'Enter file path (e.g., /home/documents/notes.txt):', (path?: string) => {
                if (path) {
                    const success = db.writeVFS(path, tab.content);
                    if (success) {
                        updateTab(tab.id, {
                            filePath: path,
                            isDirty: false,
                            title: path.split('/').pop() || 'Untitled',
                            language: detectLanguage(path)
                        });
                        soundService.play('success');
                        if (onSaved) onSaved();
                    } else {
                        showModal('error', 'Error', 'Could not write to file path. Ensure directory exists.');
                    }
                }
            }, undefined, '/home/documents/untitled.txt');
        }
    };

    const newFile = () => {
        createTab({ content: '', isDirty: false, title: 'Untitled', filePath: null, language: 'plaintext' });
    };

    const closeTab = (tab: EditorTab) => {
        const removeTab = () => {
            setTabs(prev => {
                const next = prev.filter(t => t.id !== tab.id);
                if (next.length === 0) {
                    const fallback = createFallbackTab();
                    setActiveTabId(fallback.id);
                    return [fallback];
                }
                if (activeTabId === tab.id) {
                    setActiveTabId(next[0].id);
                }
                return next;
            });
        };

        if (tab.isDirty) {
            showModal('confirm', 'Unsaved Changes', 'Save changes before closing?', undefined, undefined, undefined, [
                { label: 'Save', action: () => saveTab(tab, removeTab) },
                { label: 'Discard', variant: 'danger', action: removeTab },
                { label: 'Cancel', variant: 'secondary', action: () => {} }
            ]);
        } else {
            removeTab();
        }
    };

    const handleSaveActive = () => {
        if (!activeTab) return;
        saveTab(activeTab);
    };

    const handleLanguageChange = (nextLanguage: string) => {
        setLanguage(nextLanguage);
        if (activeTab) {
            updateTab(activeTab.id, { language: nextLanguage });
        }
    };

    const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
        editorRef.current = editorInstance;
        const model = editorInstance.getModel();
        if (model) {
            setLineCount(model.getLineCount());
        }
        const position = editorInstance.getPosition();
        if (position) {
            setCursorPosition({ line: position.lineNumber, column: position.column });
        }
        editorInstance.onDidChangeCursorPosition((e) => {
            setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
        });
    };

    const languageLabel = languageOptions.find(option => option.id === language)?.label || 'Plain Text';

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm relative">
             {loading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-[#252526] p-4 rounded-lg shadow-xl border border-white/10 flex items-center gap-3">
                         <Loader2 className="animate-spin text-blue-400" />
                         <span className="text-white font-bold">Reading Data Stream...</span>
                    </div>
                </div>
             )}

            <div className="h-10 bg-[#252526] flex items-center px-4 justify-between select-none border-b border-black/20">
                <div className="flex items-center gap-1 h-full overflow-x-auto">
                    {tabs.map(tab => {
                        const isActive = tab.id === activeTab?.id;
                        return (
                            <div
                                key={tab.id}
                                className={`px-3 h-full flex items-center gap-2 border-t-2 text-xs cursor-pointer ${isActive ? 'bg-[#1e1e1e] border-blue-500' : 'bg-transparent border-transparent text-gray-400 hover:text-white'}`}
                                onClick={() => setActiveTabId(tab.id)}
                            >
                                <span className={tab.isDirty ? 'text-yellow-400' : 'text-[#d4d4d4]'}>
                                    {tab.title}
                                </span>
                                {tab.isDirty && <div className="w-2 h-2 rounded-full bg-white/50"></div>}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab);
                                    }}
                                    className="text-gray-500 hover:text-white"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="h-7 px-2 rounded bg-[#1e1e1e] border border-white/10 text-[11px] text-gray-300 hover:text-white transition-colors"
                    >
                        {languageOptions.map(option => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button onClick={newFile} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="New File">
                        <FilePlus size={14} />
                    </button>
                    <button onClick={handleSaveActive} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-green-400 transition-colors" title="Save to VFS">
                        <Save size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <Editor
                    value={activeTab?.content ?? ''}
                    language={language}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    loading={<div className="flex items-center justify-center h-full text-blue-400 gap-2"><Loader2 className="animate-spin" /> Loading Editor...</div>}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineHeight: 20,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'off',
                        padding: { top: 12, bottom: 12 }
                    }}
                />
            </div>

            <div className="h-6 text-white flex items-center justify-between px-3 text-[10px] select-none bg-[#007acc]">
                <div className="flex gap-4">
                    <span>main*</span>
                    <span className="flex items-center gap-1"><AlertCircle size={10}/> 0 problems</span>
                </div>
                <div className="flex gap-4">
                    <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    <span>Lines {lineCount}</span>
                    <span>UTF-8</span>
                    <span>{languageLabel}</span>
                </div>
            </div>
        </div>
    );
};
