
import React, { useState, useEffect, useContext } from 'react';
import { Code, Terminal, Save, Layers, Box, MonitorPlay, FileText, RefreshCcw } from 'lucide-react';
import { generateAppSchema } from '../../services/aiService';
import { db } from '../../services/memoryService';
import { DynamicAppSchema } from '../../types';
import { AppContext } from '../../contexts/AppContext';

interface CodeStudioProps {
    launchArgs?: { file?: string; prompt?: string };
}

export const CodeStudio: React.FC<CodeStudioProps> = ({ launchArgs }) => {
  const { showModal } = useContext(AppContext);
  const [prompt, setPrompt] = useState('');
  const [schemaJson, setSchemaJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DynamicAppSchema | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
      const load = async () => {
          if (launchArgs?.file) {
              let content = db.readVFS(launchArgs.file);
              if (content === null) {
                  content = await db.fetchFileContent(launchArgs.file);
              }
              if (content !== null) {
                  setActiveFile(launchArgs.file);
                  setSchemaJson(content);
                  setPrompt(`Editing: ${launchArgs.file}`);
              }
          } else if (launchArgs?.prompt) {
              setPrompt(launchArgs.prompt);
          }
      };
      load();
  }, [launchArgs]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const res = await generateAppSchema(prompt);
        setSchemaJson(res || "{}");
        // Attempt parse
        try {
            const parsed = JSON.parse(res);
            if (parsed.name && parsed.layout) {
                setPreview(parsed);
            } else {
                throw new Error("Invalid Schema Structure");
            }
        } catch (e) {
            setPreview(null);
            showModal('error', 'Compilation Error', 'The AI generated invalid JSON. Please try refining your prompt.');
        }
    } catch (e: any) {
        showModal('error', 'Generation Error', e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleInstall = async () => {
      if (!preview) return;
      setLoading(true);
      const app: DynamicAppSchema = {
          ...preview,
          id: `app_${Date.now()}`,
          createdAt: Date.now()
      };
      
      try {
          // AWAIT the installation to ensure server has data before reload
          // The db.installApp now throws if sync fails, catching that here avoids premature reload
          await db.installApp(app);
          setLoading(false);
          showModal('success', 'App Installed', `Successfully compiled and installed "${app.name}" to OS. Reloading system...`, () => {
              window.location.reload(); 
          });
      } catch (e: any) {
          setLoading(false);
          console.error(e);
          showModal('error', 'Installation Failed', `Could not save application to database: ${e.message}`);
      }
  };

  const handleSaveFile = () => {
      if (activeFile) {
          db.writeVFS(activeFile, schemaJson);
          showModal('success', 'File Saved', `Saved to ${activeFile}`);
      } else {
          showModal('error', 'No Active File', "No active file selected. This button saves VFS files.");
      }
  };

  return (
    <div className="flex h-full bg-neu-base text-neu-text">
      <div className="w-80 p-6 flex flex-col gap-6 border-r border-neu-border bg-neu-base z-10">
        
        <div>
            <h3 className="text-sm font-bold text-neu-text mb-2 flex items-center gap-2 neu-text-shadow">
                {activeFile ? <FileText size={16} className="text-yellow-400"/> : <Layers size={16} className="text-purple-400" />} 
                {activeFile ? 'FILE EDITOR' : 'APP ARCHITECT'}
            </h3>
            
            {activeFile ? (
                <p className="text-[10px] text-neu-muted mb-6 leading-relaxed break-all">
                    {activeFile}
                </p>
            ) : (
                <p className="text-[10px] text-neu-muted mb-6 leading-relaxed">
                    Describe functionality. GAI will infer logic, generate UI schema, and compile to executable.
                </p>
            )}
            
            {!activeFile && (
                <>
                    <div className="text-[10px] font-bold text-neu-muted mb-2 uppercase tracking-wider">Spec Prompt</div>
                    <textarea
                        className="w-full h-40 bg-neu-base shadow-neu-pressed rounded-xl p-4 text-xs text-neu-text outline-none border border-transparent focus:border-purple-500/30 mb-4 resize-none"
                        placeholder="e.g., 'A Bitcoin price tracker with a refresh button' or 'A simple ToDo list'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-purple-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:text-purple-300 disabled:opacity-50 border border-transparent hover:border-neu-border"
                    >
                        {loading ? <Code className="animate-spin" size={14}/> : <Terminal size={14}/>}
                        GENERATE SCHEMA
                    </button>
                </>
            )}
            
            {activeFile && (
                <div className="space-y-3">
                    <button 
                        onClick={handleSaveFile}
                        className="w-full bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-green-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:text-green-300 border border-transparent hover:border-neu-border"
                    >
                        <Save size={14} /> SAVE TO VFS
                    </button>
                </div>
            )}
        </div>

        {preview && !activeFile && (
            <div className="mt-auto pt-6 border-t border-neu-border animate-in fade-in slide-in-from-bottom-2">
                <div className="text-xs text-green-400 mb-4 flex items-center gap-2 justify-center font-bold">
                    <Box size={14} /> COMPILATION SUCCESS
                </div>
                <button 
                    onClick={handleInstall}
                    className="w-full bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-green-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:text-green-300 transition-all border border-transparent hover:border-neu-border"
                >
                    <MonitorPlay size={14} /> INSTALL TO OS
                </button>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-neu-base relative">
        {loading && (
            <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-neu-base p-4 rounded-xl shadow-neu-flat flex items-center gap-3 text-blue-400 font-bold">
                    <RefreshCcw className="animate-spin" /> Processing...
                </div>
            </div>
        )}
        <div className="h-12 shadow-neu-flat z-0 flex items-center px-6 justify-between bg-neu-base border-b border-neu-border">
            <span className="text-xs font-bold text-purple-400 tracking-wider">
                {activeFile ? activeFile : 'schema.json'}
            </span>
            <span className="text-[10px] text-neu-muted uppercase">{activeFile ? 'Write Access' : 'Read-Only Output'}</span>
        </div>
        <div className="flex-1 p-6">
            <textarea 
                className="w-full h-full bg-neu-base shadow-neu-pressed rounded-2xl p-6 text-green-400/80 font-mono text-xs outline-none resize-none border border-neu-border"
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                readOnly={!activeFile && !preview} 
                placeholder="// Generated JSON Schema or File Content..."
            />
        </div>
      </div>
    </div>
  );
};
