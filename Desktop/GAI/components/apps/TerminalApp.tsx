
import React, { useState, useEffect, useRef, useContext, useLayoutEffect, useCallback } from 'react';
import { 
    Send, Activity, Loader2, Brain, Trash2, 
    Paperclip, X, FileText,
    ChevronDown, ChevronUp, ChevronRight, ScrollText, FileCode, Square,
    AlertTriangle, CheckCircle, Info, Server,
    Search, Eye, Edit3, ArrowRight, Check, Circle
} from 'lucide-react';
import { db } from '../../services/memoryService';
import { gaiMemory } from '../../services/gaiMemoryService';
import { Task, TaskSubtask, ChatMessage, FileNode, AgentState, SystemSettings, NotificationEntry, SupportHint, AppId } from '../../types';
import { soundService } from '../../services/soundService';
import { AppContext } from '../../contexts/AppContext';

// Prosta funkcja debounce bez dodatkowych bibliotek
const debounce = <T extends (...args: any[]) => any,>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
};

const SyntaxHighlighter: React.FC<{ code: string; lang?: string }> = ({ code, lang }) => {
    // Advanced regex-based syntax highlighting
    const highlight = (text: string, language: string) => {
        let highlighted = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const isJson = language === 'json' || language === 'jsonc';
        const isJsTs = ['js', 'ts', 'jsx', 'tsx', 'javascript', 'typescript', 'mjs', 'cjs'].includes(language);
        const isHtml = ['html', 'xml', 'svg'].includes(language);
        const isCss = ['css', 'scss', 'less'].includes(language);
        const isPy = ['python', 'py'].includes(language);

        if (isJson) {
             highlighted = highlighted
                .replace(/(".*?")(\s*:)/g, '<span class="text-sky-400">$1</span>$2') // Keys
                .replace(/(:)\s*(".*?")/g, '$1 <span class="text-emerald-400">$2</span>') // String Values
                .replace(/(:)\s*(-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, '$1 <span class="text-orange-400">$2</span>') // Number Values
                .replace(/(:)\s*(true|false|null)/g, '$1 <span class="text-purple-400">$2</span>'); // Booleans
        } else if (isJsTs) {
            // Comments first to prevent matching inside them
            highlighted = highlighted
                .replace(/(\/\/.*)/g, '<span class="text-gray-500">$1</span>')
                .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>')
                // Strings
                .replace(/('.*?')/g, '<span class="text-emerald-400">$1</span>')
                .replace(/(".*?")/g, '<span class="text-emerald-400">$1</span>')
                .replace(/(`[\s\S]*?`)/g, '<span class="text-emerald-400">$1</span>')
                // Keywords
                .replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|await|async|try|catch|class|extends|new|this|typeof|void|interface|type|enum|implements|public|private|protected|readonly|static|get|set|switch|case|break|default|continue|throw|finally)\b/g, '<span class="text-purple-400">$1</span>')
                // Built-ins & Primitives
                .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="text-orange-400">$1</span>')
                .replace(/\b(console|window|document|Math|JSON|Promise|Object|Array|String|Number|Boolean|Date|RegExp|Map|Set|Symbol|Error)\b/g, '<span class="text-yellow-400">$1</span>')
                // Numbers
                .replace(/\b(\d+)\b/g, '<span class="text-orange-300">$1</span>')
                // Function calls (approximate)
                .replace(/(\w+)(?=\()/g, '<span class="text-blue-300">$1</span>');
        } else if (isHtml) {
             highlighted = highlighted
                // Comments
                .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-gray-500">$1</span>')
                // Doctype
                .replace(/(&lt;!DOCTYPE html&gt;)/gi, '<span class="text-gray-500 font-bold">$1</span>')
                // Tags (start and end)
                .replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, (match, p1, p2, p3, p4) => {
                    // p1: < or </
                    // p2: tag name
                    // p3: attributes
                    // p4: >
                    const tagName = `<span class="text-blue-400 font-bold">${p2}</span>`;
                    const attributes = p3.replace(/(\s+)([a-zA-Z0-9-]+)(=)/g, '$1<span class="text-purple-300">$2</span>$3')
                                         .replace(/(".*?")/g, '<span class="text-emerald-400">$1</span>');
                    return `${p1}${tagName}${attributes}${p4}`;
                });
        } else if (isCss) {
             highlighted = highlighted
                .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>')
                .replace(/([a-zA-Z0-9-,\s#.]+)(\s*\{)/g, '<span class="text-blue-300">$1</span>$2') // Selectors
                .replace(/([a-zA-Z-]+)(:)/g, '<span class="text-sky-300">$1</span>$2') // Properties
                .replace(/(:)\s*(.*?)(;)/g, (match, p1, p2, p3) => {
                    // Values coloring
                    const val = p2
                        .replace(/(\d+(px|em|rem|%|vh|vw|s|ms|deg)?)/g, '<span class="text-orange-300">$1</span>')
                        .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-yellow-300">$1</span>')
                        .replace(/\b(red|blue|green|black|white|orange|purple|gray|transparent)\b/g, '<span class="text-yellow-300">$1</span>');
                    return `${p1} ${val}${p3}`;
                });
        } else if (isPy) {
             highlighted = highlighted
                .replace(/(#.*)/g, '<span class="text-gray-500">$1</span>')
                .replace(/\b(def|class|import|from|if|else|elif|for|while|return|try|except|with|as|pass|lambda|global|nonlocal|assert|del|break|continue|raise|yield|in|is|not|and|or)\b/g, '<span class="text-purple-400">$1</span>')
                .replace(/\b(True|False|None)\b/g, '<span class="text-orange-400">$1</span>')
                .replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|open|type|super|isinstance)\b/g, '<span class="text-yellow-400">$1</span>')
                .replace(/('.*?')/g, '<span class="text-emerald-400">$1</span>')
                .replace(/(".*?")/g, '<span class="text-emerald-400">$1</span>')
                .replace(/(`.*?`)/g, '<span class="text-emerald-400">$1</span>')
                .replace(/\b(\d+)\b/g, '<span class="text-orange-300">$1</span>');
        }

        return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
    };

    return highlight(code, (lang || '').toLowerCase());
};

const DiffViewer: React.FC<{ diff: string }> = ({ diff }) => {
    if (!diff) return null;
    const lines = diff.split('\n');
    return (
        <div className="font-mono text-[10px] whitespace-pre-wrap overflow-x-auto">
            {lines.map((line, i) => {
                let className = "text-gray-400";
                if (line.startsWith('+')) className = "text-green-400 bg-green-500/10 block w-full";
                else if (line.startsWith('-')) className = "text-red-400 bg-red-500/10 block w-full";
                else if (line.startsWith('@@')) className = "text-purple-400 block w-full my-1";
                
                return <div key={i} className={className}>{line}</div>
            })}
        </div>
    );
};

const splitCodeBlocks = (text: string) => {
    const blocks: { type: 'text' | 'code'; content: string; lang?: string }[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        blocks.push({ type: 'code', content: match[2], lang: match[1] });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        blocks.push({ type: 'text', content: text.slice(lastIndex) });
    }
    return blocks;
};

const sanitizeToolDirectives = (text: string) => {
    const withoutBlocks = text.replace(/\[\[[\s\S]*?\]\]/g, '').replace(/^\s*ACTION:\s*.*$/gmi, '');
    return withoutBlocks.replace(/\n{3,}/g, '\n\n').trim();
};

const normalizeComparableText = (msg: ChatMessage) => {
    let text = msg.role === 'model' ? sanitizeToolDirectives(msg.text) : msg.text;
    text = String(text || '')
        .replace(/<\|im_start\|>/g, '')
        .replace(/<\|im_end\|>/g, '')
        .replace(/<think>/g, '')
        .replace(/<\/think>/g, '')
        .trim();
    return text.replace(/\s+/g, ' ').trim();
};

type DisplayMessage = ChatMessage & { mergedIds?: string[] };

const DeleteBtn: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
    <button
        onClick={onClick}
        className={`absolute -top-1 -right-1 p-1 bg-red-500/10 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 z-10 ${className || ''}`}
        title="Delete"
    >
        <Trash2 size={9} />
    </button>
);

const getFileExt = (path: string) => (path.split('.').pop() || '').toUpperCase().slice(0, 6);
const getFileName = (path: string) => path.split('/').pop() || path;

const TerminalMessage: React.FC<{ msg: DisplayMessage; onDelete: (ids: string[]) => void }> = React.memo(({ msg, onDelete }) => {
    const shouldAutoOpen = !!(msg.logType && ['thought', 'system', 'fs', 'exec', 'stdout', 'stderr', 'ftp', 'ollama', 'code'].includes(msg.logType));
    const [isExpanded, setIsExpanded] = useState(shouldAutoOpen);
    const idsToDelete = Array.isArray(msg.mergedIds) && msg.mergedIds.length ? msg.mergedIds : [msg.id];
    const del = () => onDelete(idsToDelete);
    const thoughtRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!shouldAutoOpen) return;
        // Nie zwijaj automatycznie myśli, kodu ani odpowiedzi Ollama
        if (msg.logType === 'thought' || msg.logType === 'code' || msg.logType === 'ollama') return;
        
        const timer = setTimeout(() => setIsExpanded(false), 5000);
        return () => clearTimeout(timer);
    }, [msg.id, shouldAutoOpen, msg.text.length, msg.logType]);

    useEffect(() => {
        if (isExpanded && thoughtRef.current) {
            thoughtRef.current.scrollTop = thoughtRef.current.scrollHeight;
        }
    }, [msg.text, isExpanded]);

    const isThought = msg.role === 'model' && (msg.logType === 'thought' || msg.text.includes('<think>') || msg.text.includes('<|im_start|>'));
    const isOllama  = msg.logType === 'ollama';
    const isFs      = msg.logType === 'fs';
    const isExec    = msg.logType === 'exec';
    const isStdout  = msg.logType === 'stdout';
    const isStderr  = msg.logType === 'stderr';
    const isFtp     = msg.logType === 'ftp';
    const isSystem  = msg.logType === 'system';
    const isTelegram = msg.logType === 'telegram';
    const isDiff = msg.logType === 'diff';

    let displayText = msg.role === 'model' ? sanitizeToolDirectives(msg.text) : msg.text;
    if (isThought) {
        displayText = displayText
            .replace(/<\|im_start\|>/g, '').replace(/<\|im_end\|>/g, '')
            .replace(/<think>/g, '').replace(/<\/think>/g, '').trim();
    }

    if (!displayText.trim()) return null;

    const ts     = Number.isFinite(Number(msg.timestamp))      ? Number(msg.timestamp)      : Date.now();
    const tsStart = Number.isFinite(Number(msg.timestampStart)) ? Number(msg.timestampStart) : ts;
    const durationSec = Math.max(0, Math.round((ts - tsStart) / 1000));
    const fmtTime = (t: number) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fmtDateTime = (t: number) => new Date(t).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    // ── THOUGHT → compact pill ──────────────────────────────────────────────
    if (isThought) {
        // Native Ollama-like thinking state
        const duration = durationSec > 0 ? `${durationSec}s` : '';
        const isStreaming = !msg.id.includes('msg_') || (Date.now() - ts) < 2000; // Heuristic for active streaming if no explicit flag
        
        return (
            <div className="mb-2 relative group">
                <DeleteBtn onClick={del} />
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setIsExpanded(v => !v)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1c] border border-[#2b2d31] hover:border-[#3f4148] transition-all w-fit"
                    >
                        {isStreaming ? (
                            <span className="flex gap-0.5 items-center mr-1">
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                            </span>
                        ) : (
                            <Brain size={12} className="text-gray-500" />
                        )}
                        <span className="text-[11px] font-medium text-gray-500">Thought</span>
                        {duration && <span className="text-[10px] text-gray-600">({duration})</span>}
                        {isExpanded ? <ChevronDown size={10} className="text-gray-600" /> : <ChevronRight size={10} className="text-gray-600" />}
                    </button>
                    
                    {isExpanded && (
                        <div
                            ref={thoughtRef}
                            className="ml-2 pl-3 border-l-2 border-[#2b2d31] py-1 text-[10px] text-gray-300 font-mono leading-relaxed max-h-96 overflow-y-auto custom-scrollbar bg-[#111113]/50 rounded-r"
                        >
                            <pre className="whitespace-pre-wrap break-words">{displayText || '(thinking...)'}</pre>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── DIFF OUTPUT ──────────────────────────────────────────────────────────
    if (isDiff) {
        // @ts-expect-error - TS doesn't know about msg.details
        const diffContent = msg.details?.diff || displayText;
        // @ts-expect-error - TS doesn't know about msg.details
        const diffFile = msg.details?.file || 'unknown';

        return (
            <div className="mb-2 relative group">
                <DeleteBtn onClick={del} />
                <div className="rounded-md border border-[#3f4148] bg-[#1e1e1e] overflow-hidden shadow-sm w-full max-w-[90%]">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3f4148]">
                         <div className="flex items-center gap-2">
                            <Edit3 size={11} className="text-yellow-500/80"/>
                            <span className="text-[10px] text-gray-300 font-medium font-mono">FILE MODIFIED: {diffFile}</span>
                         </div>
                    </div>
                    <div className="p-3 overflow-x-auto custom-scrollbar bg-[#1e1e1e] max-h-96">
                        <DiffViewer diff={diffContent} />
                    </div>
                </div>
            </div>
        );
    }

    // ── SYSTEM / STAGE ──────────────────────────────────────────────────────
    if (isSystem) {
        const stageText = displayText.replace(/STAGE:\s*/gi, '').trim();
        if (!stageText) return null;
        return (
            <div className="mb-0.5 flex items-start gap-2 text-[10px] font-mono text-gray-300 relative group px-1 py-0.5 min-w-0 w-full">
                <DeleteBtn onClick={del} className="mt-0.5" />
                <span className="text-gray-500 mt-0.5">→</span>
                <span className="flex-1 font-medium opacity-90 break-words whitespace-pre-wrap min-w-0">{stageText}</span>
                <span className="text-gray-500 shrink-0 text-[9px] mt-0.5">{fmtTime(ts)}</span>
            </div>
        );
    }

    // ── FILESYSTEM ──────────────────────────────────────────────────────────
    if (isFs) {
        const isWrite  = /^SUCCESS: Written to|^SUCCESS: Replaced/i.test(displayText);
        const isRead   = /^READ /i.test(displayText);
        const isDir    = /^DIR /i.test(displayText);
        const isImg    = /^IMAGE GENERATED:/i.test(displayText);

        if (isImg) {
            const src = displayText.replace(/^IMAGE GENERATED:\s*/i, '').split('\n')[0].trim();
            return (
                <div className="mb-4 w-full max-w-[90%] relative group">
                    <DeleteBtn onClick={del} />
                    <div className="bg-[#1e1e1e] border border-[#3f4148] rounded-lg p-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />Generated Image
                        </div>
                        <img src={src} alt="Generated" className="rounded border border-[#3f4148]/50 max-h-[400px] w-auto object-contain bg-black/20" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        <div className="mt-2 text-[9px] font-mono text-gray-600 truncate">{src}</div>
                    </div>
                </div>
            );
        }

        const pathMatch  = displayText.match(/(?:Written to|Replaced content in|READ |DIR )\s*([\S]+)/i);
        const filePath   = pathMatch?.[1] || '';
        const fileName   = getFileName(filePath) || displayText.slice(0, 40);
        const ext        = getFileExt(filePath);

        const lineMatch  = displayText.match(/(?:lines? )?(\d+)(?:\s*[-–]\s*|\s+to\s+)(\d+)/i);
        const lineRange  = lineMatch ? `L${lineMatch[1]}-${lineMatch[2]}` : '';

        return (
            <div className="mb-1.5 relative group">
                <DeleteBtn onClick={del} />
                <button
                    onClick={() => setIsExpanded(v => !v)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-[#111113] border border-[#2b2d31] rounded text-[10px] font-mono hover:border-[#3f4148] transition-colors w-fit max-w-[92%]"
                >
                    {isWrite
                        ? <Edit3 size={10} className="text-yellow-500/60 shrink-0" />
                        : isRead
                            ? <Eye size={10} className="text-blue-400/60 shrink-0" />
                            : <FileCode size={10} className="text-gray-500 shrink-0" />
                    }
                    {ext && <span className="px-1 py-0.5 bg-blue-500/10 text-blue-400/80 rounded text-[9px] font-bold shrink-0">{ext}</span>}
                    <span className="text-gray-300 truncate">{fileName}</span>
                    {lineRange && <span className="text-gray-600 shrink-0 ml-1">{lineRange}</span>}
                    <span className="ml-auto shrink-0">{isExpanded ? <ChevronDown size={9} className="text-gray-600" /> : <ChevronRight size={9} className="text-gray-700" />}</span>
                </button>
                {isExpanded && (
                    <div className="mt-2 rounded-md border border-[#3f4148] bg-[#1e1e1e] overflow-hidden shadow-sm w-full max-w-full">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3f4148]">
                             <div className="flex items-center gap-2">
                                <FileCode size={11} className="text-blue-400"/>
                                <span className="text-[10px] text-gray-300 font-medium font-mono">{fileName}</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <span className="text-[9px] text-gray-500 uppercase font-mono">{ext}</span>
                                 <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-[#ff5f56]"></div>
                                    <div className="w-2 h-2 rounded-full bg-[#ffbd2e]"></div>
                                    <div className="w-2 h-2 rounded-full bg-[#27c93f]"></div>
                                 </div>
                             </div>
                        </div>
                        <div className="p-3 overflow-x-auto custom-scrollbar max-h-96 bg-[#1e1e1e]">
                            <pre className="text-[11px] font-mono text-[#d4d4d4] leading-relaxed whitespace-pre-wrap break-words tab-4 font-normal">
                                <SyntaxHighlighter code={displayText} lang={ext} />
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── EXEC / STDOUT / STDERR / FTP ────────────────────────────────────────
    if (isExec || isStdout || isStderr || isFtp) {
        const isError  = isStderr || (isExec && /error|fail/i.test(displayText));
        const label    = (msg.logType || 'log').toUpperCase();
        const preview  = displayText.slice(0, 90).replace(/\n/g, ' ');

        const searchMatch = isExec && displayText.match(/[Ss]earch(?:ing|ed)?\s+(?:for\s+)?["']?([^"'\n]{3,50})["']?/);
        if (searchMatch) {
            return (
                <div className="mb-1 relative group">
                    <DeleteBtn onClick={del} />
                    <button
                        onClick={() => setIsExpanded(v => !v)}
                        className="flex items-center gap-2 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors py-0.5 px-1"
                    >
                        <Search size={10} className="text-gray-700 shrink-0" />
                        <span className="italic">Searched codebase for "{searchMatch[1]}"</span>
                        {isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                    </button>
                    {isExpanded && (
                        <div className="mt-1 ml-5 pl-2 border-l border-[#2b2d31] py-1 text-[10px] font-mono text-gray-600 max-h-32 overflow-y-auto custom-scrollbar">
                            <pre className="whitespace-pre-wrap break-all">{displayText}</pre>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="mb-0.5 relative group">
                <DeleteBtn onClick={del} />
                <button
                    onClick={() => setIsExpanded(v => !v)}
                    className={`w-full flex items-center gap-2 px-2 py-1 text-[10px] font-mono rounded-sm text-left transition-colors
                        ${isError ? 'text-red-400/60 hover:text-red-400/80' : 'text-gray-700 hover:text-gray-500'}`}
                >
                    <span className="shrink-0">{isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}</span>
                    <span className={`text-[9px] font-bold uppercase shrink-0 ${isError ? 'text-red-500/60' : 'text-gray-700'}`}>[{label}]</span>
                    <span className="truncate flex-1">{preview}</span>
                    <span className="text-[9px] text-gray-800 shrink-0">{fmtTime(ts)}</span>
                </button>
                {isExpanded && (
                    <div className={`mt-0.5 ml-4 pl-2 py-1.5 text-[10px] font-mono border-l max-h-40 overflow-y-auto custom-scrollbar
                        ${isError ? 'text-red-300/60 border-red-500/20' : 'text-gray-500 border-[#2b2d31]'}`}>
                        <pre className="whitespace-pre-wrap break-words">{displayText}</pre>
                    </div>
                )}
            </div>
        );
    }

    // ── OLLAMA LIVE ─────────────────────────────────────────────────────────
    if (isOllama) {
        return (
            <div className="mb-1 relative group">
                <DeleteBtn onClick={del} />
                <button
                    onClick={() => setIsExpanded(v => !v)}
                    className="flex items-center gap-2 px-2 py-1 text-[10px] font-mono text-gray-700 hover:text-gray-500 transition-colors rounded border border-transparent hover:border-[#2b2d31]"
                >
                    <Server size={9} className="text-blue-400/40 shrink-0" />
                    <span className="text-[9px] text-blue-400/40 font-bold uppercase shrink-0">OLLAMA</span>
                    <span className="truncate flex-1">{displayText.slice(0, 60).replace(/\n/g, ' ')}</span>
                    {isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                </button>
                {isExpanded && (
                    <div className="mt-1 ml-4 pl-2 border-l border-blue-500/10 py-1 text-[10px] font-mono text-blue-100/30 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                        {displayText.split('\n\n────────\n\n').map((section, idx) => {
                            const lines = section.split('\n');
                            const title = (lines.shift() || '').trim();
                            const body  = lines.join('\n').trim();
                            return (
                                <div key={idx} className="space-y-0.5">
                                    {title && <div className="text-[9px] text-blue-300/40 font-bold uppercase">{title}</div>}
                                    {body && <pre className="whitespace-pre-wrap break-all text-gray-600">{body}</pre>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ── IMAGE (plain text route) ─────────────────────────────────────────────
    const imageMatch = displayText.match(/IMAGE GENERATED:\s*(\S+)/);
    if (imageMatch) {
        const src = imageMatch[1];
        return (
            <div className="mb-4 w-full max-w-[90%] relative group">
                <DeleteBtn onClick={del} />
                <div className="bg-[#1e1e1e] border border-[#3f4148] rounded-lg p-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />Generated Image
                    </div>
                    <img src={src} alt="Generated" className="rounded border border-[#3f4148]/50 max-h-[400px] w-auto object-contain bg-black/20" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                    <div className="mt-2 text-[9px] font-mono text-gray-600 truncate">{src}</div>
                </div>
            </div>
        );
    }

    // ── CODE OUTPUT ──────────────────────────────────────────────────────────
    const hasCode = displayText.includes('```');
    if (hasCode && msg.role === 'model') {
        const blocks = splitCodeBlocks(displayText);
        return (
            <div className="mb-3 w-full max-w-[90%] relative group">
                <DeleteBtn onClick={del} />
                <button
                    onClick={() => setIsExpanded(v => !v)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono rounded-sm text-left text-gray-600 hover:text-gray-400 border border-transparent hover:border-[#2b2d31] transition-all"
                >
                    <span className="shrink-0">{isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}</span>
                    <FileCode size={10} className="text-green-400/50 shrink-0" />
                    <span className="text-green-400/50 font-bold text-[9px] uppercase shrink-0">CODE</span>
                    <span className="truncate flex-1">{msg.text.slice(0, 60).replace(/\n/g, ' ')}</span>
                </button>
                {isExpanded && (
                    <div className="mt-1 space-y-2">
                        {blocks.map((block, idx) =>
                            block.type === 'code' ? (
                                <div key={idx} className="my-2 rounded-md border border-[#3f4148] bg-[#1e1e1e] overflow-hidden shadow-sm w-full">
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3f4148]">
                                        <div className="flex items-center gap-2">
                                            <FileCode size={10} className="text-blue-400/70"/>
                                            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">{block.lang || 'TEXT'}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 overflow-x-auto custom-scrollbar bg-[#1e1e1e]">
                                        <pre className="text-[11px] font-mono text-[#d4d4d4] leading-relaxed tab-4">
                                            <SyntaxHighlighter code={block.content} lang={block.lang} />
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div key={idx} className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed px-1">{block.content}</div>
                            )
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── PLAIN CHAT BUBBLE ────────────────────────────────────────────────────
    return (
        <div className={`px-4 py-3 text-sm max-w-[85%] border leading-relaxed mb-4 flex flex-col gap-1 rounded-lg font-mono relative group
            ${msg.role === 'user'
                ? 'bg-[#2b2d31] text-[#e0e0e0] border-[#3f4148] ml-auto'
                : 'bg-[#1e1e1e] text-[#cccccc] border-[#2b2d31] mr-auto'
            }`}>
            <DeleteBtn onClick={del} />
            {isTelegram && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">Telegram</span>
            )}
            <span className="whitespace-pre-wrap break-words">{displayText}</span>
            <span className="text-[10px] opacity-40 text-right w-full block mt-1 text-gray-500">
                {fmtDateTime(ts)}
            </span>
        </div>
    );
});

// ── SUBTASK PANEL (replaces TaskContextBar) ──────────────────────────────────
const TaskContextBar: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const activeTask = tasks.find(t => t.status === 'in_progress') || tasks.find(t => t.status === 'pending');
    // Domyślnie zwinięte dla zadań telemetrycznych
    const shouldStartExpanded = activeTask ? !activeTask.title.toLowerCase().includes('telemetry') : true;
    const [isExpanded, setIsExpanded] = useState(shouldStartExpanded);

    useEffect(() => {
        if (activeTask) {
            setIsExpanded(!activeTask.title.toLowerCase().includes('telemetry'));
        }
    }, [activeTask?.id]);

    if (!activeTask) return null;

    const subtasks: TaskSubtask[] = Array.isArray(activeTask.subtasks) ? activeTask.subtasks : [];
    const progress = activeTask.progress || 0;
    const completedCount = subtasks.filter(s => s.status === 'completed').length;
    const totalCount = subtasks.length;

    const StatusIcon: React.FC<{ status: TaskSubtask['status'] }> = ({ status }) => {
        if (status === 'completed')  return <CheckCircle size={10} className="text-emerald-500 shrink-0" />;
        if (status === 'in_progress') return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />;
        return <div className="w-2 h-2 rounded-full border border-gray-700 shrink-0" />;
    };

    return (
        <div className="sticky top-0 z-30 border-b border-[#2b2d31] bg-[#18181b]/95 backdrop-blur-sm">
            <div
                className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1c] transition-colors"
                onClick={() => setIsExpanded(v => !v)}
            >
                <Activity size={11} className={`text-blue-400 shrink-0 ${activeTask.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                <span className="text-[11px] font-mono text-gray-300 truncate flex-1">{activeTask.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {totalCount > 0 && (
                        <span className="text-[9px] font-mono text-gray-600">{completedCount}/{totalCount}</span>
                    )}
                    <div className="w-16 h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-gray-700">{progress}%</span>
                </div>
                {isExpanded ? <ChevronUp size={10} className="text-gray-700 shrink-0" /> : <ChevronDown size={10} className="text-gray-700 shrink-0" />}
            </div>

            {isExpanded && subtasks.length > 0 && (
                <div className="px-5 pb-2.5 pt-0.5 space-y-1.5">
                    {subtasks.map((st, idx) => (
                        <div key={st.id || idx} className="flex items-center gap-2 text-[10px] font-mono">
                            <ArrowRight size={9} className="text-gray-700 shrink-0" />
                            <StatusIcon status={st.status} />
                            <span className={`flex-1 truncate ${
                                st.status === 'completed'  ? 'text-gray-600 line-through'  :
                                st.status === 'in_progress' ? 'text-gray-300'               :
                                'text-gray-600'
                            }`}>
                                {idx + 1}. {st.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {isExpanded && subtasks.length === 0 && activeTask.logs && activeTask.logs.length > 0 && (
                <div className="px-5 pb-2 pt-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                    {activeTask.logs.slice(-3).map((log, i) => (
                        <div key={i} className="flex gap-2 text-[10px] font-mono text-gray-700">
                            <span className="text-gray-800 shrink-0">›</span>
                            <span className="truncate">{log}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── PROCESSING STATUS (compact, replaces ProcessingPanel) ────────────────────
const ProcessingPanel: React.FC<{ tasks: Task[]; agentState: AgentState | null; messages: ChatMessage[] }> = ({ tasks, agentState, messages }) => {
    const stageNow     = agentState?.processingStage || '';
    const isProcessing = agentState?.currentAction && agentState.currentAction !== 'idle';
    const waitStarted  = agentState?.ollamaWaitStartedAt || 0;
    const [waitSec, setWaitSec] = useState(0);

    useEffect(() => {
        if (!waitStarted) { setWaitSec(0); return; }
        const t = setInterval(() => setWaitSec(Math.floor((Date.now() - waitStarted) / 1000)), 1000);
        return () => clearInterval(t);
    }, [waitStarted]);

    if (!isProcessing && !stageNow) return null;

    const label = stageNow || agentState?.currentAction || 'Processing...';

    return (
        <div className="px-4 py-1.5 flex items-center gap-2 text-[10px] font-mono text-gray-700 border-b border-[#1e1e1e]">
            <Loader2 size={9} className="animate-spin text-blue-400/40 shrink-0" />
            <span className="truncate flex-1">{label}</span>
            {waitSec > 30 && (
                <span className="text-yellow-600/60 shrink-0 flex items-center gap-1">
                    <AlertTriangle size={9} />
                    {waitSec}s
                </span>
            )}
        </div>
    );
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export const TerminalApp: React.FC = () => {
    const { showModal, setAppMenu, activeWindowId } = useContext(AppContext);
    const [input, setInput] = useState('');
    const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [agentState, setAgentState] = useState<AgentState | null>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    // --- LIVE AUTONOMY STREAM ---
    useEffect(() => {
        if (activeWindowId === AppId.TERMINAL) {
            setAppMenu([
                {
                    label: 'Session',
                    items: [
                        { label: 'Clear Output', action: () => setAllMessages([]), shortcut: '⌘K' },
                        { label: 'Reset Brain Context', action: async () => {
                            if (confirm('Are you sure you want to reset the Brain context?')) {
                                try {
                                    await fetch('/api/context/reset', { method: 'POST' });
                                    setAllMessages([]);
                                    soundService.play('trash');
                                } catch(e) { console.error(e); }
                            }
                        }},
                        { label: 'Stop Kernel', action: handleStop, shortcut: '⌃C' }
                    ]
                },
                {
                    label: 'View',
                    items: [
                        { label: 'Toggle Memory Panel', action: () => setShowMemoryPanel(v => !v) },
                        { label: 'Toggle Cache Panel', action: () => setShowCachePanel(v => !v) },
                        { label: 'Toggle Support Panel', action: () => setShowSupportPanel(v => !v) },
                        { label: 'Toggle Unread Only', action: () => setShowUnreadOnly(v => !v) }
                    ]
                }
            ]);
        }
    }, [activeWindowId]);

    useEffect(() => {
        let es: EventSource | null = null;
        let reconnectTimeout: any = null;
        let currentThoughtId: string | null = null;
        let timeoutId: any;

        const connect = () => {
            if (es) es.close();
            es = new EventSource('/api/events');

        const handleThought = (e: any) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.source === 'terminal') return;
                    
                    if (data.source === 'support') {
                        const text = String(data.content || '').trim();
                        if (!text || text.startsWith('SUPPORT_ERROR:')) return;
                        setSupportEntries(prev => {
                            const id = String(data.id || `support_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
                            const entry = { id, text, ts: Number(data.timestamp || Date.now()), taskTitle: data.taskTitle ? String(data.taskTitle) : undefined };
                            const map = new Map(prev.map(item => [item.id, item]));
                            map.set(entry.id, entry);
                            const merged = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
                            return merged.slice(-50);
                        });
                        return;
                    }

                    if (!currentThoughtId) {
                        currentThoughtId = `autonomy-${Date.now()}`;
                        setAllMessages(prev => {
                            if (prev.length > 0 && prev[prev.length - 1].id === currentThoughtId) return prev;
                            return [...prev, {
                                id: currentThoughtId!,
                                role: 'model',
                                text: data.content,
                                timestamp: Date.now(),
                                logType: 'thought'
                            }];
                        });
                    } else {
                        setAllMessages(prev => prev.map(m => 
                            m.id === currentThoughtId 
                                ? { ...m, text: m.text + data.content }
                                : m
                        ));
                    }

                    clearTimeout(timeoutId);
                    // Usuwamy timer który resetował currentThoughtId po 5 sekundach,
                    // aby chmurka nie "odłączała się" i nie znikała przedwcześnie podczas streamingu.
                    // Reset nastąpi dopiero przy nowym zdarzeniu lub manualnie.
                } catch (err) { console.error(err); }
            };

            es.addEventListener('thought', handleThought);
            
            es.onerror = (err) => {
                console.warn('SSE Disconnected, reconnecting in 3s...', err);
                es?.close();
                reconnectTimeout = setTimeout(connect, 3000);
            };
        };

        connect();
        
        return () => {
            es?.close();
            clearTimeout(timeoutId);
            clearTimeout(reconnectTimeout);
        };
    }, []);

    const [gaiMemories, setGaiMemories] = useState<any[]>([]);
    const [gaiProfile, setGaiProfile] = useState<any>(null);
    const [showMemoryPanel, setShowMemoryPanel] = useState(false);
    const [showCachePanel, setShowCachePanel] = useState(false);
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showSupportPanel, setShowSupportPanel] = useState(false);
    const [supportEntries, setSupportEntries] = useState<{ id: string; text: string; ts: number; taskTitle?: string }[]>([]);
    const [supportFilter, setSupportFilter] = useState<'all' | 'current' | 'idle'>('all');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const hiddenMessageIdsRef = useRef<Set<string>>(new Set());
    const transientMessageIdsRef = useRef<Set<string>>(new Set());
    const pendingStreamRef = useRef<{ startedAt: number; optimisticId: string; answerId: string; summaryId: string } | null>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const inputPriorityRequestedRef = useRef(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('gai_notifications_unread_only');
            if (raw === '1') setShowUnreadOnly(true);
            if (raw === '0') setShowUnreadOnly(false);
        } catch {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('gai_notifications_unread_only', showUnreadOnly ? '1' : '0');
        } catch {}
    }, [showUnreadOnly]);

    const [visibleLimit, setVisibleLimit] = useState(10);
    const lastActivityRef = useRef(Date.now());
    
    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resetActivity);
        window.addEventListener('keydown', resetActivity);
        window.addEventListener('click', resetActivity);
        return () => {
            window.removeEventListener('mousemove', resetActivity);
            window.removeEventListener('keydown', resetActivity);
            window.removeEventListener('click', resetActivity);
        };
    }, [resetActivity]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastActivityRef.current > 300000 && visibleLimit > 10) {
                setVisibleLimit(10);
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    setAutoScroll(true);
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [visibleLimit]);

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const prevScrollHeightRef = useRef<number>(0);
    const prevScrollTopRef = useRef<number>(0);
    const initialLoadRef = useRef(true);

    // Cache dla danych sync - ostatnie wyniki
    const syncCacheRef = useRef<{
        messages: ChatMessage[] | null;
        tasks: Task[] | null;
        agentState: AgentState | null;
        settings: SystemSettings | null;
        notifications: NotificationEntry[] | null;
        lastUpdate: number;
    }>({ messages: null, tasks: null, agentState: null, settings: null, notifications: null, lastUpdate: 0 });

    const apiHeaders = () => ({ 'Content-Type': 'application/json' });

    const sync = () => {
        const now = Date.now();
        const cache = syncCacheRef.current;

        // REMOVED: Auto-scroll logic from sync loop to prevent fighting with user scroll
        // if (containerRef.current) { ... }

        const hidden = hiddenMessageIdsRef.current;
        const nextMessages = db.getChatHistory().filter(m => !hidden.has(String(m?.id || '')));
        const nextTasks = db.getTasks();
        const nextAgentState = db.getAgentState();
        const nextSettings = db.getSettings();
        const nextNotifications = db.getNotifications?.() || [];

        let messagesChanged = false;
        if (!cache.messages) {
            messagesChanged = true;
        } else if (cache.messages.length !== nextMessages.length) {
            messagesChanged = true;
        } else if (nextMessages.length > 0) {
            const prevLast = cache.messages[cache.messages.length - 1];
            const nextLast = nextMessages[nextMessages.length - 1];
            const prevText = String(prevLast?.text || '');
            const nextText = String(nextLast?.text || '');
            if (prevLast?.id !== nextLast?.id || prevText.length !== nextText.length) {
                messagesChanged = true;
            }
        }

        const taskFingerprint = (arr: Task[]) => arr.map(t => `${t.id}:${t.status}:${Number(t.updatedAt || 0)}:${Array.isArray(t.logs) ? t.logs.length : 0}`).join('|');
        const tasksChanged = !cache.tasks || taskFingerprint(cache.tasks) !== taskFingerprint(nextTasks);
        const notificationsChanged = !cache.notifications || cache.notifications.length !== nextNotifications.length;
        const agentStateChanged = !cache.agentState || JSON.stringify(cache.agentState) !== JSON.stringify(nextAgentState);
        const settingsChanged = !cache.settings || JSON.stringify(cache.settings) !== JSON.stringify(nextSettings);

        if (!messagesChanged && !tasksChanged && !notificationsChanged && !agentStateChanged && !settingsChanged && (now - cache.lastUpdate) < 200) {
            return;
        }

        if (messagesChanged) {
            const transientIds = transientMessageIdsRef.current;
            const pending = pendingStreamRef.current;
            if (pending) {
                const hasServerReply = nextMessages.some(m => m.role === 'model' && Number(m.timestamp || 0) >= pending.startedAt && String(m.text || '').trim());
                const hasServerUser = nextMessages.some(m => m.role === 'user' && Number(m.timestamp || 0) >= pending.startedAt && String(m.text || '').trim());
                if (hasServerReply) {
                    transientIds.delete(pending.answerId);
                    transientIds.delete(pending.summaryId);
                }
                if (hasServerUser) {
                    transientIds.delete(pending.optimisticId);
                }
                if (hasServerReply && hasServerUser) {
                    pendingStreamRef.current = null;
                }
            }
            const transient = allMessages.filter(m => transientIds.has(String(m.id)));
            const merged = new Map<string, ChatMessage>();
            nextMessages.forEach(m => merged.set(String(m.id), m));
            transient.forEach(m => {
                if (!merged.has(String(m.id))) merged.set(String(m.id), m);
            });
            const next = Array.from(merged.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
            setAllMessages(next);
            cache.messages = nextMessages;
        }
        if (tasksChanged) {
            setTasks(nextTasks);
            cache.tasks = nextTasks;
        }
        if (agentStateChanged) {
            setAgentState(nextAgentState);
            cache.agentState = nextAgentState;
        }
        if (settingsChanged) {
            setSettings(nextSettings);
            cache.settings = nextSettings;
        }
        if (notificationsChanged) {
            setNotifications(nextNotifications);
            cache.notifications = nextNotifications;
        }
        
        cache.lastUpdate = now;
    };

    // Zdebounce'owana wersja sync - wywoływana max raz na 300ms
    const debouncedSync = debounce(sync, 300);

    const handleExitPriorityMode = async () => {
        setIsSending(true);
        try {
            await fetch('/api/user/priority/reset', { method: 'POST', headers: apiHeaders() });
            await db.fetchState().catch(() => {});
            soundService.play('click');
            debouncedSync();
        } finally {
            setIsSending(false);
        }
    };

    const refreshGaiMemory = async () => {
        try {
            const memories = db.getMemories() || [];
            const profile  = db.getGaiProfile();
            console.log('[GAI Memory Panel] Loaded memories:', memories.length);
            setGaiMemories(memories.slice(-10));
            setGaiProfile(profile);
        } catch (error) {
            console.error('Failed to refresh GAI memory:', error);
        }
    };

    // Zdebounce'owana wersja refreshGaiMemory - wywoływana max raz na 500ms
    const debouncedRefreshGaiMemory = debounce(refreshGaiMemory, 500);

    useEffect(() => {
        sync();
        refreshGaiMemory();
        const handler = () => { debouncedSync(); debouncedRefreshGaiMemory(); };
        window.addEventListener('gai:state_update', handler);
        return () => window.removeEventListener('gai:state_update', handler);
    }, []);

    useEffect(() => {
        const queueLen = Number(agentState?.userQueueLength || 0);
        const needFastSync = isSending || queueLen > 0 || !!agentState?.userPriority;
        if (!needFastSync) return;
        const timer = window.setInterval(() => {
            db.fetchState().then(() => {
                sync();
            }).catch(() => {});
        }, 700);
        return () => window.clearInterval(timer);
    }, [isSending, agentState?.userQueueLength, agentState?.userPriority]);

    useEffect(() => {
        const hints: SupportHint[] = (agentState?.supportHints ?? []) as SupportHint[];
        if (!hints || hints.length === 0) return;
        setSupportEntries(prev => {
            const map = new Map(prev.map(item => [item.id, item]));
            hints.forEach((h: SupportHint) => {
                const text = String(h.hint || '').trim();
                if (!text || text.startsWith('SUPPORT_ERROR:')) return;
                const id = String(h.id || `support_${h.timestamp || Date.now()}`);
                const entry = { id, text, ts: Number(h.timestamp || Date.now()), taskTitle: h.taskTitle ? String(h.taskTitle) : undefined };
                map.set(entry.id, entry);
            });
            const merged = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
            return merged.slice(-50);
        });
    }, [agentState]);

    const lastMessageKey = allMessages.length
        ? `${allMessages[allMessages.length - 1].id}:${String(allMessages[allMessages.length - 1].text || '').length}`
        : '';

    const terminalLogFilters = settings?.terminalLogFilters || {
        enabled: true, system: true, stdout: true, stderr: true,
        exec: true, fs: true, ftp: true, thought: false, ollama: false
    };
    const systemLogTypes = new Set(['system', 'stdout', 'stderr', 'exec', 'fs', 'ftp', 'thought', 'ollama']);
    const filteredMessages = allMessages.filter(msg => {
        const type = msg.logType || '';
        
        // Wymuszone ukrycie chmurek Ollama/Thought zgodnie z życzeniem użytkownika
        if (type === 'thought' || type === 'ollama') return false;

        if (msg.text.trim() === '---' || !msg.text.trim()) return false;
        if (!type || type === 'text' || type === 'telegram') return true;
        if (!systemLogTypes.has(type)) return true;
        if (!terminalLogFilters.enabled) return false;
        
        // Fallback dla typów, których nie ma w settingsach
        const key = type as string;
        // @ts-expect-error - TS doesn't know about this key
        return terminalLogFilters[key] !== false;
    });

    useLayoutEffect(() => {
        if (!autoScroll || !containerRef.current) return;
        
        // Use scrollTop instead of scrollIntoView for better stability
        const el = containerRef.current;
        el.scrollTop = el.scrollHeight;
        
    }, [filteredMessages.length, autoScroll, lastMessageKey, filteredMessages[filteredMessages.length - 1]?.text.length]);

    useEffect(() => {
        const handleResize = () => {
            if (autoScroll && containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [autoScroll]);

    useEffect(() => {
        if (initialLoadRef.current) {
            if (filteredMessages.length > 0) {
                setVisibleLimit(10);
                initialLoadRef.current = false;
                // Force scroll to bottom on initial load
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                        setAutoScroll(true);
                    }
                }, 100);
            }
        }
    }, [filteredMessages.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        resetActivity();
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        
        // History loading logic
        if (!isLoadingHistory && scrollTop < 100 && visibleLimit < filteredMessages.length) {
            prevScrollHeightRef.current = scrollHeight;
            prevScrollTopRef.current = scrollTop;
            setIsLoadingHistory(true);
            setVisibleLimit(prev => Math.min(prev + 50, filteredMessages.length));
        }

        // Auto-scroll detection
        // Increased threshold to 150px for better UX
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceToBottom < 150;
        
        // Only update state if it changed to avoid render loops
        if (isAtBottom && !autoScroll) setAutoScroll(true);
        if (!isAtBottom && autoScroll) setAutoScroll(false);
    };

    useLayoutEffect(() => {
        if (containerRef.current && prevScrollHeightRef.current > 0) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop = prevScrollTopRef.current + heightDifference;
            prevScrollHeightRef.current = 0;
            prevScrollTopRef.current = 0;
            setIsLoadingHistory(false);
        }
    }, [visibleLimit]);

    useEffect(() => {
        if (!containerRef.current) return;
        if (visibleLimit >= filteredMessages.length) return;
        const { scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight <= clientHeight) {
            const handle = window.setTimeout(() => {
                setVisibleLimit(prev => Math.min(prev + 20, filteredMessages.length));
            }, 0);
            return () => window.clearTimeout(handle);
        }
    }, [filteredMessages.length, visibleLimit]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const cmd = input;
        const currentAttachments = [...attachments];
        const now = Date.now();

        if (isSending) {
            const optimisticQueued: ChatMessage = {
                id: `temp_queue_${now}`,
                role: 'user',
                text: cmd,
                timestamp: Date.now()
            };
            transientMessageIdsRef.current.add(optimisticQueued.id);
            setAllMessages(prev => [...prev, optimisticQueued]);
            setAutoScroll(true);
            setInput('');
            setAttachments([]);
            inputPriorityRequestedRef.current = false;
            try {
                await fetch('/api/user/priority/set', {
                    method: 'POST',
                    headers: apiHeaders(),
                    body: JSON.stringify({ enabled: true })
                });
            } catch {}
            fetch('/api/command', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify({ message: cmd, role: 'user', attachments: currentAttachments, config: { modelRole: 'chat' } })
            }).catch(() => undefined);
            soundService.play('click');
            db.fetchState().then(() => sync()).catch(() => {});
            return;
        }

        const optimisticMsg: ChatMessage = {
            id: `temp_${now}`, role: 'user', text: cmd, timestamp: Date.now()
        };
        const streamAnswerId  = `stream_answer_${now}`;
        const streamSummaryId = `stream_summary_${now}`;
        transientMessageIdsRef.current.add(optimisticMsg.id);
        transientMessageIdsRef.current.add(streamAnswerId);
        transientMessageIdsRef.current.add(streamSummaryId);
        pendingStreamRef.current = { startedAt: now, optimisticId: optimisticMsg.id, answerId: streamAnswerId, summaryId: streamSummaryId };
        setAllMessages(prev => [...prev, optimisticMsg, {
            id: streamAnswerId, role: 'model', text: '...', timestamp: Date.now()
        }]);
        setAutoScroll(true);

        setIsSending(true);
        setInput('');
        setAttachments([]);
        inputPriorityRequestedRef.current = false;

        try {
            const gaiContext = await gaiMemory.analyzeContext(cmd, db.getSessionId?.() || undefined);

            // Asynchroniczny zapis pamięci - nie blokuje interfejsu
            gaiMemory.saveMemory({
                type: 'conversation', content: cmd, importance: 0.8,
                metadata: {
                    tags: ['user_input', 'terminal'],
                    context: 'Terminal conversation',
                    emotionalTone: gaiContext.emotionalContext as any,
                    relatedMemories: gaiContext.relevantMemories.map((m: any) => m.id)
                }
            }).catch(err => console.error('Failed to save user memory:', err));

            const enhancedMessage = {
                message: cmd,
                context: {
                    relevantMemories: gaiContext.relevantMemories,
                    userProfile: gaiContext.userProfile,
                    relatedLearnings: gaiContext.relatedLearnings,
                    suggestedApproach: gaiContext.suggestedApproach,
                    emotionalContext: gaiContext.emotionalContext
                },
                attachments: currentAttachments,
                config: { modelRole: 'chat', stream: true }
            };

            const streamController = new AbortController();
            streamAbortRef.current = streamController;
            const res = await fetch('/api/command/stream', {
                method: 'POST', headers: apiHeaders(), body: JSON.stringify(enhancedMessage), signal: streamController.signal
            });
            if (!res.ok || !res.body) throw new Error('Stream unavailable');

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let summaryCreated = false;
            let answerText  = '';
            let summaryText = '';

            
            // Buffering for smoother streaming
            let pendingSummaryUpdate = false;
            let pendingAnswerUpdate = false;
            let lastSummaryUpdate = 0;
            let lastAnswerUpdate = 0;
            const UPDATE_INTERVAL = 100; // Update UI every 100ms
            
            const flushPendingUpdates = () => {
                const now = Date.now();
                if (pendingSummaryUpdate && (now - lastSummaryUpdate) >= UPDATE_INTERVAL) {
                    const normalized = summaryText.trim();
                    if (isMeaningfulThoughtText(normalized)) {
                        if (!summaryCreated) {
                            setAllMessages(prev => {
                                const idx = prev.findIndex(m => m.id === streamAnswerId);
                                if (idx === -1) return prev;
                                const next = [...prev];
                                next.splice(idx, 0, { id: streamSummaryId, role: 'model', text: '', timestamp: Date.now(), logType: 'thought' });
                                return next;
                            });
                            summaryCreated = true;
                        }
                        updateMessage(streamSummaryId, normalized);
                        setAutoScroll(true);
                    }
                    lastSummaryUpdate = now;
                    pendingSummaryUpdate = false;
                }
                if (pendingAnswerUpdate && (now - lastAnswerUpdate) >= UPDATE_INTERVAL) {
                    if (answerText.trim()) {
                        updateMessage(streamAnswerId, answerText);
                        setAutoScroll(true);
                    }
                    lastAnswerUpdate = now;
                    pendingAnswerUpdate = false;
                }
            };

            const isMeaningfulThoughtText = (text: string) => {
                const cleaned = String(text || '')
                    .replace(/\[\[[\s\S]*?\]\]/g, '')
                    .replace(/^\s*ACTION:\s*.*$/gmi, '')
                    .replace(/<\/?think>/gi, '')
                    .replace(/<\|im[_ ]?start\|>/gi, '')
                    .replace(/<\|im[_ ]?end\|>/gi, '')
                    .replace(/im[_ ]?start\|>/gi, '')
                    .replace(/mstart\|>/gi, '')
                    .replace(/[*_`~]+/g, '')
                    .trim();
                if (!cleaned) return false;
                if (cleaned.length < 10) return false;
                if (!/[a-z]/i.test(cleaned)) return false;
                if (cleaned.includes('"timestamp":') || cleaned.includes('"role":') || cleaned.includes('{"id":') || cleaned.includes('"log":') || cleaned.includes('SNAPSHOT')) return false;
                return true;
            };

            const updateMessage = (id: string, text: string) => {
                setAllMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text } : msg));
            };

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process buffer looking for double newlines (SSE deli2miters)
                const parts = buffer.split('\n\n');
                // Keep the last part in buffer as it might be incomplete
                buffer = parts.pop() || '';
                
                for (const part of parts) {
                    const lines = part.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data:')) {
                            const dataContent = line.replace(/^data:\s*/, '').trim();
                            if (!dataContent || dataContent === '[DONE]') continue;
                            
                            try {
                                const payload = JSON.parse(dataContent);
                                
                                if (payload.type === 'summary_delta') {
                                    summaryText += payload.content || '';
                                    pendingSummaryUpdate = true;
                                } else if (payload.type === 'answer_delta') {
                                    answerText += payload.content || '';
                                    pendingAnswerUpdate = true;
                                } else if (payload.type === 'done') {
                                    // Handle done event...
                                    const doneSummary = String(payload?.content?.summary || '').trim();
                                    if (isMeaningfulThoughtText(doneSummary)) {
                                         if (!summaryCreated) {
                                            setAllMessages(prev => {
                                                const idx = prev.findIndex(m => m.id === streamAnswerId);
                                                if (idx === -1) return prev;
                                                const next = [...prev];
                                                next.splice(idx, 0, { id: streamSummaryId, role: 'model', text: '', timestamp: Date.now(), logType: 'thought' });
                                                return next;
                                            });
                                            summaryCreated = true;
                                        }
                                        updateMessage(streamSummaryId, doneSummary);
                                    }
                                    if (payload?.content?.answer) {
                                        updateMessage(streamAnswerId, payload.content.answer);
                                    }
                                } else if (payload.error) {
                                    console.error('Stream error:', payload.error);
                                }
                            } catch (e) {
                                console.warn('Failed to parse SSE JSON:', dataContent);
                            }
                        }
                    }
                }
                
                // Flush updates periodically
                flushPendingUpdates();
            }


            // Final flush of any pending updates
            flushPendingUpdates();

            // Asynchroniczne zapisy pamięci - nie blokuje interfejsu
            if (answerText) {
                gaiMemory.saveMemory({
                    type: 'conversation', content: answerText, importance: 0.7,
                    metadata: {
                        tags: ['model_response', 'terminal', 'answer'],
                        context: 'Terminal conversation - model response',
                        relatedMemories: [optimisticMsg.id]
                    }
                }).catch(err => console.error('Failed to save answer memory:', err));
            }
            if (summaryText && isMeaningfulThoughtText(summaryText)) {
                gaiMemory.saveMemory({
                    type: 'system', content: summaryText, importance: 0.6,
                    metadata: {
                        tags: ['thought_process', 'reasoning', 'terminal'],
                        context: 'Terminal conversation - thought process',
                        relatedMemories: [optimisticMsg.id]
                    }
                }).catch(err => console.error('Failed to save thought memory:', err));
            }

            soundService.play('success');
            // Zoptymalizowana aktualizacja - tylko raz na końcu
            setTimeout(() => {
                db.fetchState().catch(console.error);
                sync();
            }, 100); // Małe opóźnienie aby zgrupować aktualizacje
        } catch (e: any) {
            setAllMessages(prev => prev.filter(m => m.id !== streamAnswerId && m.id !== streamSummaryId));
            transientMessageIdsRef.current.delete(streamAnswerId);
            transientMessageIdsRef.current.delete(streamSummaryId);
            
            if (pendingStreamRef.current?.startedAt === now) pendingStreamRef.current = null;
            const message = String(e?.message || '');
            const aborted = e?.name === 'AbortError' || message.toLowerCase().includes('aborted');
            if (aborted) {
                transientMessageIdsRef.current.delete(optimisticMsg.id);
                soundService.play('click');
                await db.fetchState();
                debouncedSync();
                return;
            }

            try {
                // Próba fallback - wysłanie zwykłym trybem (nie stream)
                await db.sendCommand(cmd, 'user', currentAttachments, { modelRole: 'chat' });
                // Jeśli się uda, sync() zaktualizuje widok
            } catch (fallbackError) {
                // Krytyczny błąd wysyłania - przywracamy input
                transientMessageIdsRef.current.delete(optimisticMsg.id);
                setAllMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                
                // Zawsze przywracamy treść do inputu (ewentualnie doklejając)
                setInput(prev => {
                    if (!prev || !prev.trim()) return cmd;
                    return prev + '\n' + cmd;
                });
                
                showModal('error', 'Błąd wysyłania', 'Wiadomość nie została wysłana. Treść przywrócono do pola edycji.');

                soundService.play('error');
                console.error('Send error (stream & fallback):', e, fallbackError);
            }
            
            await db.fetchState();
            debouncedSync();
        } finally {
            streamAbortRef.current = null;
            setIsSending(false);
        }
    };

    const handleQueueRemove = async (id: string, index: number) => {
        try {
            const res = await fetch('/api/user/queue/remove', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify({ id, index })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({} as any));
                throw new Error(data?.error || `Queue remove failed (${res.status})`);
            }
            soundService.play('click');
            await db.fetchState();
            sync();
        } catch (e: any) {
            soundService.play('error');
            showModal('error', 'Queue', e?.message || 'Nie udało się usunąć wiadomości z kolejki.');
        }
    };

    const handleQueueForceSend = async (id: string, index: number) => {
        try {
            const res = await fetch('/api/user/queue/force-send', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify({ id, index })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({} as any));
                throw new Error(data?.error || `Queue force failed (${res.status})`);
            }
            soundService.play('success');
            await db.fetchState();
            sync();
        } catch (e: any) {
            soundService.play('error');
            showModal('error', 'Queue', e?.message || 'Nie udało się wymusić wysyłki.');
        }
    };

    const handleStop = async () => {
        try {
            if (streamAbortRef.current) {
                streamAbortRef.current.abort();
                streamAbortRef.current = null;
            }
        } catch {}
        setIsSending(false);
        inputPriorityRequestedRef.current = false;
        try {
            await fetch('/api/stop-kernel', { method: 'POST', headers: apiHeaders() });
            soundService.play('success');
            await db.fetchState();
            sync();
            showModal('success', 'Stop', 'Bieżąca akcja została zatrzymana, autonomia pozostaje aktywna.');
        } catch (e: any) {
            soundService.play('error');
            showModal('error', 'Stop Failed', e.message || 'Nie udało się zatrzymać jądra.');
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileBase64: base64, name: file.name })
                });
                const data = await res.json();
                if (data.ok && data.path) {
                    setAttachments(prev => Array.from(new Set([...prev, data.path])));
                    soundService.play('click');
                } else {
                    showModal('error', 'Upload Failed', data.error);
                }
            } catch (err: any) {
                showModal('error', 'Upload Error', String(err));
            }
        };
        reader.readAsDataURL(file);
    };

    const pickFile = async () => {
        const files: FileNode[] = await db.listRealDisk('/');
        showModal('info', 'Załącz plik do analizy',
            <div className="flex flex-col gap-2 max-h-80">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-all text-left mb-2"
                >
                    <Paperclip size={16} />
                    <span>Upload from Computer</span>
                </button>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-2">System Files</div>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar p-1">
                    {files.filter(f => f.type === 'file').map(f => (
                        <button
                            key={f.path}
                            onClick={() => {
                                setAttachments(prev => Array.from(new Set([...prev, f.path])));
                                soundService.play('click');
                            }}
                            className="flex items-center gap-3 p-3 bg-neu-base shadow-neu-flat rounded-xl hover:text-blue-400 text-xs font-bold transition-all text-left"
                        >
                            <FileCode size={16} className="text-blue-500" />
                            <span className="truncate">{f.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const removeAttachment = (path: string) => {
        setAttachments(prev => prev.filter(p => p !== path));
        soundService.play('click');
    };

    const visibleMessages = filteredMessages.slice(-visibleLimit);
    const dedupedVisibleMessages = visibleMessages.filter((msg, idx, arr) => {
        if (msg.role === 'model' && msg.logType === 'thought') {
            for (let i = idx + 1; i < arr.length; i += 1) {
                const next = arr[i];
                if (next.role !== 'model') continue;
                if (next.logType && next.logType !== 'text' && next.logType !== 'telegram') continue;
                const a = normalizeComparableText(msg);
                const b = normalizeComparableText(next);
                if (a && b && (a === b || b.startsWith(a) || a.startsWith(b))) return false;
                break;
            }
        }
        return true;
    });

    const groupedMessages = dedupedVisibleMessages.reduce<DisplayMessage[]>((acc, msg) => {
        if (!acc.length) return [msg];
        const last = acc[acc.length - 1];
        const sameType = last.role === msg.role && last.logType === msg.logType;
        const lastEndTs = Number.isFinite(Number(last.timestamp)) ? Number(last.timestamp) : 0;
        const nextEndTs = Number.isFinite(Number(msg.timestamp)) ? Number(msg.timestamp) : 0;
        const gapMs = (lastEndTs && nextEndTs) ? (nextEndTs - lastEndTs) : 0;
        const shouldMerge = sameType && msg.role !== 'user' && gapMs <= 5 * 60 * 1000;
        if (shouldMerge) {
            const joiner = (last.logType === 'stdout' || last.logType === 'stderr' || last.logType === 'exec' || last.logType === 'system')
                ? '\n' : '\n\n';
            const lastIds = Array.isArray((last as any).mergedIds) && (last as any).mergedIds.length ? (last as any).mergedIds : [last.id];
            acc[acc.length - 1] = {
                ...last,
                text: `${last.text}${joiner}${msg.text}`.trim(),
                timestampStart: Number.isFinite(Number(last.timestampStart)) ? Number(last.timestampStart) : (Number.isFinite(Number(last.timestamp)) ? Number(last.timestamp) : undefined),
                timestamp: msg.timestamp,
                mergedIds: [...lastIds, msg.id]
            };
            return acc;
        }
        acc.push(msg);
        return acc;
    }, []);

    const handleDeleteMessage = useCallback((ids: string[]) => {
        const idSet = new Set((ids || []).map(x => String(x || '').trim()).filter(Boolean));
        if (!idSet.size) return;
        {
            const next = new Set(hiddenMessageIdsRef.current);
            for (const id of idSet) next.add(id);
            hiddenMessageIdsRef.current = next;
        }
        setAllMessages(prev => prev.filter(m => !idSet.has(String(m.id || ''))));
        (async () => {
            try {
                await db.deleteChatMessage(Array.from(idSet));
                debouncedSync();
                {
                    const next = new Set(hiddenMessageIdsRef.current);
                    for (const id of idSet) next.delete(id);
                    hiddenMessageIdsRef.current = next;
                }
            } catch (e: any) {
                {
                    const next = new Set(hiddenMessageIdsRef.current);
                    for (const id of idSet) next.delete(id);
                    hiddenMessageIdsRef.current = next;
                }
                await db.fetchState().catch(() => {});
                debouncedSync();
                showModal('error', 'Usuwanie nieudane', String(e?.message || e || 'Nie udało się usunąć wiadomości.'));
            }
        })();
        soundService.play('click');
    }, [db, debouncedSync]);

    const toolMemory = Array.isArray(agentState?.toolMemory) ? (agentState?.toolMemory ?? []) : [];
    const cacheConfig = agentState?.cacheConfig;
    const lastCacheClearAt = Number(agentState?.lastToolCacheClearedAt || 0);
    const lastCacheClearReason = String(agentState?.lastToolCacheClearReason || '');

    return (
        <div className="flex flex-col h-full bg-[#18181b] text-[#d4d4d4] font-mono overflow-hidden">
            <TaskContextBar tasks={tasks} />
            <ProcessingPanel tasks={tasks} agentState={agentState} messages={allMessages} />

            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 custom-scrollbar scroll-smooth relative"
                onScroll={handleScroll}
            >
                {isLoadingHistory && (
                    <div className="flex justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-gray-700 opacity-50" />
                    </div>
                )}

                {groupedMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <TerminalMessage msg={msg} onDelete={handleDeleteMessage} />
                    </div>
                ))}

                {isSending && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-700 py-1 mb-2">
                        <Loader2 size={9} className="animate-spin text-blue-400/40 shrink-0" />
                        <span>{agentState?.thoughtProcess || agentState?.currentAction || 'Thinking...'}</span>
                    </div>
                )}

                {!autoScroll && (
                    <button
                        onClick={() => {
                            if (!containerRef.current) return;
                            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
                            setAutoScroll(true);
                        }}
                        aria-label="Scroll down"
                        className="sticky bottom-4 left-full -translate-x-full mb-4 mr-2 w-8 h-8 rounded-full bg-[#2b2d31] text-gray-400 shadow hover:bg-[#3f4148] flex items-center justify-center"
                    >
                        <ChevronDown size={16} />
                    </button>
                )}

                <div ref={bottomRef} className="h-1" />
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,text/*,.pdf"
            />

            <div className="p-4 border-t border-[#2b2d31] bg-[#18181b] shrink-0">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map(path => (
                            <div key={path} className="flex items-center gap-2 px-3 py-1 bg-[#2b2d31] border border-[#3f4148] rounded text-[10px] font-mono text-blue-400">
                                <FileText size={12} />
                                <span className="truncate max-w-[150px]">{path.split('/').pop()}</span>
                                <button onClick={() => removeAttachment(path)} className="hover:text-red-400 transition-colors ml-1"><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}

                {agentState?.userPriority && (
                    <div className="max-w-5xl mx-auto mb-2">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <div className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">Priority Mode</div>
                            <button
                                onClick={handleExitPriorityMode}
                                disabled={isSending}
                                className="px-2 py-0.5 rounded bg-[#2b2d31] border border-[#3f4148] text-gray-400 hover:bg-[#3f4148] hover:text-gray-200 transition-all"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                )}

                {(agentState?.userQueueLength ?? 0) > 0 && (
                    <div className="max-w-5xl mx-auto mb-2 space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <div className="px-2 py-0.5 rounded bg-[#2b2d31] border border-[#3f4148]">
                                Queue: {agentState?.userQueueLength ?? 0}
                            </div>
                        </div>
                        {(agentState?.userQueuePreview?.length ?? 0) > 0 && (
                            <div className="space-y-1 text-[10px] text-gray-500 font-mono">
                                {(agentState?.userQueuePreview ?? []).map((item, idx) => (
                                    <div key={item.id || `${item.source}-${idx}`} className="px-2 py-1 rounded bg-[#2b2d31] border border-[#3f4148]/50 flex items-center gap-2">
                                        <span className="uppercase font-bold tracking-widest text-[9px] mr-2 text-blue-400">{item.source}</span>
                                        <span className="truncate opacity-70 flex-1">{item.text}</span>
                                        <button
                                            onClick={() => handleQueueForceSend(String(item.id || ''), idx)}
                                            className="px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-widest bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                                        >
                                            Force
                                        </button>
                                        <button
                                            onClick={() => handleQueueRemove(String(item.id || ''), idx)}
                                            className="px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-widest bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {showMemoryPanel && (
                    <div className="max-w-5xl mx-auto mb-3 p-3 bg-[#1e1e1e] border border-[#2b2d31] rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Brain size={13} className="text-purple-400/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70">GAI Memory</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <span>{gaiMemories.length} memories</span>
                                {gaiProfile && (
                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400/70 rounded">{gaiProfile.userName}</span>
                                )}
                            </div>
                        </div>
                        {gaiProfile && (
                            <div className="mb-3 p-2 bg-[#2b2d31] rounded border border-[#3f4148]">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Profile</div>
                                <div className="text-xs text-gray-400">
                                    <div>Style: {gaiProfile.communicationStyle}</div>
                                    <div>Level: {gaiProfile.expertiseLevel}</div>
                                    <div>Trust: {(gaiProfile.trustLevel * 100).toFixed(0)}%</div>
                                </div>
                            </div>
                        )}
                        {gaiMemories.length > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {gaiMemories.slice(-5).map((memory, idx) => {
                                    const ts = Number(
                                        (memory as any)?.metadata?.timestamp ||
                                        (memory as any)?.timestamp ||
                                        (memory as any)?.updatedAt ||
                                        (memory as any)?.createdAt ||
                                        Date.now()
                                    );
                                    const tags = Array.isArray((memory as any)?.metadata?.tags)
                                        ? (memory as any).metadata.tags
                                        : Array.isArray((memory as any)?.meta?.tags)
                                            ? (memory as any).meta.tags
                                            : [];
                                    const typeLabel = String((memory as any)?.type || (memory as any)?.meta?.type || 'system');
                                    const content = String((memory as any)?.content || '');

                                    return (
                                        <div key={idx} className="p-2 bg-[#2b2d31] rounded border border-[#3f4148]/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{typeLabel}</span>
                                                <span className="text-[9px] text-gray-700">{new Date(ts).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">
                                                {content.length > 100 ? content.slice(0, 100) + '...' : content}
                                            </div>
                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {tags.slice(0, 3).map((tag: string, tagIdx: number) => (
                                                        <span key={tagIdx} className="text-[9px] px-1 py-0.5 bg-purple-500/10 text-purple-400/60 rounded">{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                onClick={refreshGaiMemory}
                                className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400/70 rounded hover:bg-purple-500/20 transition-colors"
                            >
                                Refresh
                            </button>
                            <div className="text-[9px] text-gray-700">Context-aware responses enabled</div>
                        </div>
                    </div>
                )}

                {showCachePanel && (
                    <div className="max-w-5xl mx-auto mb-3 p-3 bg-[#1e1e1e] border border-[#2b2d31] rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Server size={13} className="text-emerald-400/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Tool Cache</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <span>{toolMemory.length} wpisów</span>
                                {lastCacheClearAt > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400/70 rounded">
                                        {new Date(lastCacheClearAt).toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        {cacheConfig && (
                            <div className="mb-3 p-2 bg-[#2b2d31] rounded border border-[#3f4148]">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Cache Config</div>
                                <div className="text-xs text-gray-400">
                                    <div>File TTL: {Math.round(cacheConfig.fileReadTtlMs / 60000)}m</div>
                                    <div>File Limit: {cacheConfig.fileReadLimit}</div>
                                    <div>Tool TTL: {Math.round(cacheConfig.toolResultTtlMs / 60000)}m</div>
                                    <div>Tool Limit: {cacheConfig.toolResultLimit}</div>
                                    <div>Memory Limit: {cacheConfig.toolMemoryLimit}</div>
                                </div>
                            </div>
                        )}
                        {lastCacheClearReason && (
                            <div className="mb-3 text-[10px] text-gray-600">
                                Ostatnie czyszczenie: {lastCacheClearReason}
                            </div>
                        )}
                        {toolMemory.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {toolMemory.slice(-8).reverse().map((entry, idx) => (
                                    <div key={`${entry.tool}-${entry.ts}-${idx}`} className="p-2 bg-[#2b2d31] rounded border border-[#3f4148]/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{entry.tool}</span>
                                            <span className="text-[9px] text-gray-700">{new Date(entry.ts).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate">{entry.key}</div>
                                        <div className="text-xs text-gray-400 truncate">{entry.output}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-700">Brak wpisów cache.</div>
                        )}
                        <div className="mt-3 text-[9px] text-gray-700">Cache działa automatycznie i czyści się po zakończeniu zadań</div>
                    </div>
                )}

                {showNotificationsPanel && (
                    <div className="max-w-5xl mx-auto mb-3 p-3 bg-[#1e1e1e] border border-[#2b2d31] rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Info size={13} className="text-blue-400/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">Notifications</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <span>{notifications.filter((n: any) => !n?.read).length} unread</span>
                            </div>
                        </div>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowUnreadOnly(v => !v)}
                                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${showUnreadOnly ? 'bg-blue-500/10 border-blue-500/30 text-blue-300/70' : 'bg-[#2b2d31] border-[#3f4148] text-gray-400 hover:bg-[#3f4148]'}`}
                                >
                                    {showUnreadOnly ? 'Unread only' : 'All'}
                                </button>
                                <button onClick={() => db.fetchState().catch(() => undefined)} className="text-[10px] px-2 py-1 bg-[#2b2d31] text-gray-400 rounded border border-[#3f4148] hover:bg-[#3f4148] transition-colors">Refresh</button>
                                <button onClick={() => db.markAllNotificationsRead?.().catch(() => undefined)} className="text-[10px] px-2 py-1 bg-[#2b2d31] text-gray-400 rounded border border-[#3f4148] hover:bg-[#3f4148] transition-colors">Mark all read</button>
                            </div>
                            <button onClick={() => db.clearNotifications?.().catch(() => undefined)} className="text-[10px] px-2 py-1 bg-[#2b2d31] text-gray-400 rounded border border-[#3f4148] hover:bg-[#3f4148] transition-colors">Clear</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {(showUnreadOnly ? notifications.filter((n) => !n?.read) : notifications).slice(-30).reverse().map((n) => (
                                <button
                                    key={String(n.id)}
                                    onClick={() => db.markNotificationRead?.(String(n.id)).catch(() => undefined)}
                                    className={`w-full text-left p-2 rounded border transition-colors ${n.read ? 'bg-[#2b2d31] border-[#3f4148]/40' : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${n.level === 'error' ? 'text-red-400' : n.level === 'warn' ? 'text-yellow-400' : n.level === 'success' ? 'text-emerald-400' : 'text-gray-500'}`}>{String(n.level || 'info')}</span>
                                        <span className={`text-xs font-bold truncate ${n.read ? 'text-gray-400' : 'text-blue-300/80'}`}>{String(n.title || '')}</span>
                                        {!n.read && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                    </div>
                                    {n.message && (
                                        <div className="mt-1 text-[10px] text-gray-500 font-mono whitespace-pre-wrap break-words">{String(n.message)}</div>
                                    )}
                                    <div className="mt-1 text-[9px] text-gray-700 font-mono">{new Date(Number(n.timestamp || Date.now())).toLocaleString('pl-PL')}</div>
                                </button>
                            ))}
                            {notifications.length === 0 && (
                                <div className="text-[10px] text-gray-700 pl-1">No notifications.</div>
                            )}
                        </div>
                        <div className="mt-2 text-[9px] text-gray-700">Kliknij wpis, aby oznaczyć jako przeczytane</div>
                    </div>
                )}

                {showSupportPanel && (() => {
                    const currentTask = tasks.find(t => t.status === 'in_progress') || tasks.find(t => t.status === 'pending');
                    const currentTaskTitle = currentTask?.title || null;
                    let filteredHints = supportEntries;
                    if (supportFilter === 'current') {
                        filteredHints = supportEntries.filter(e => currentTaskTitle && e.taskTitle === currentTaskTitle);
                    } else if (supportFilter === 'idle') {
                        filteredHints = supportEntries.filter(e => !e.taskTitle || e.taskTitle === 'IDLE');
                    }
                    const visibleHints = filteredHints.slice(-10).reverse();
                    return (
                        <div className="max-w-5xl mx-auto mb-3 p-3 bg-[#1e1e1e] border border-[#2b2d31] rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Info size={13} className="text-emerald-400/70" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Support</span>
                                    {currentTaskTitle && (
                                        <span className="text-[9px] text-emerald-300/60 font-mono truncate max-w-[160px]">
                                            {currentTaskTitle}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                    <span>{filteredHints.length} hints</span>
                                    <button
                                        onClick={() => setSupportFilter('all')}
                                        className={`px-2 py-0.5 rounded-full border text-[9px] ${supportFilter === 'all' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' : 'border-transparent text-gray-600 hover:text-gray-400 hover:border-[#3f4148]'}`}
                                    >
                                        Wszystkie
                                    </button>
                                    <button
                                        onClick={() => setSupportFilter('current')}
                                        className={`px-2 py-0.5 rounded-full border text-[9px] ${supportFilter === 'current' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' : 'border-transparent text-gray-600 hover:text-gray-400 hover:border-[#3f4148]'}`}
                                        disabled={!currentTaskTitle}
                                    >
                                        Bieżące
                                    </button>
                                    <button
                                        onClick={() => setSupportFilter('idle')}
                                        className={`px-2 py-0.5 rounded-full border text-[9px] ${supportFilter === 'idle' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' : 'border-transparent text-gray-600 hover:text-gray-400 hover:border-[#3f4148]'}`}
                                    >
                                        Globalne
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {visibleHints.map((e) => {
                                    const isIdle = !e.taskTitle || e.taskTitle === 'IDLE';
                                    return (
                                        <div key={e.id} className="p-2 bg-[#2b2d31] rounded border border-[#3f4148]/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
                                                    {isIdle ? 'Global Hint' : 'Task Hint'}
                                                </span>
                                                <span className="text-[9px] text-gray-700">{new Date(e.ts).toLocaleTimeString()}</span>
                                            </div>
                                            {!isIdle && e.taskTitle && (
                                                <div className="text-[9px] text-emerald-300/60 font-mono mb-1 truncate">{e.taskTitle}</div>
                                            )}
                                            <div className="text-xs text-gray-300 whitespace-pre-wrap break-words">{e.text}</div>
                                        </div>
                                    );
                                })}
                                {visibleHints.length === 0 && (
                                    <div className="text-[10px] text-gray-700 pl-1">Brak wskazówek support dla wybranego filtra.</div>
                                )}
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <button
                                    onClick={() => setSupportEntries([])}
                                    className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400/70 rounded hover:bg-emerald-500/20 transition-colors"
                                >
                                    Clear
                                </button>
                                <div className="text-[9px] text-gray-700">Wsparcie aktywne</div>
                            </div>
                        </div>
                    );
                })()}

                <div className="max-w-5xl mx-auto flex items-center gap-2 bg-[#1e1e1e] p-2 rounded-lg border border-[#2b2d31] focus-within:border-[#3f4148] transition-colors">
                    <button onClick={pickFile} className={`p-2 transition-all rounded hover:bg-[#2b2d31] ${attachments.length > 0 ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}>
                        <Paperclip size={15} />
                    </button>
                    <button
                        onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                        className={`p-2 transition-all rounded hover:bg-[#2b2d31] ${showMemoryPanel ? 'text-purple-400' : 'text-gray-600 hover:text-gray-400'}`}
                        title="GAI Memory Panel"
                    >
                        <Brain size={15} />
                    </button>
                    <button
                        onClick={() => setShowCachePanel(!showCachePanel)}
                        className={`p-2 transition-all rounded hover:bg-[#2b2d31] ${showCachePanel ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
                        title="Tool Cache Panel"
                    >
                        <Server size={15} />
                    </button>
                    <button
                        onClick={() => setShowSupportPanel(!showSupportPanel)}
                        className={`p-2 transition-all rounded hover:bg-[#2b2d31] ${showSupportPanel ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
                        title="Support Panel"
                    >
                        <div className="relative">
                            <Info size={15} />
                            {supportEntries.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            )}
                        </div>
                    </button>
                    <textarea
                        className="flex-1 bg-transparent px-2 py-1 outline-none text-sm font-mono text-gray-300 resize-none max-h-48 custom-scrollbar placeholder-gray-700"
                        placeholder={attachments.length > 0 ? `Analyzing ${attachments.length} files...` : 'Enter command...'}
                        rows={1}
                        value={input}
                        onChange={e => {
                            const nextValue = e.target.value;
                            setInput(nextValue);
                            const hasText = nextValue.trim().length > 0;
                            if (hasText && !inputPriorityRequestedRef.current) {
                                inputPriorityRequestedRef.current = true;
                                fetch('/api/user/priority/set', {
                                    method: 'POST',
                                    headers: apiHeaders(),
                                    body: JSON.stringify({ enabled: true })
                                }).catch(() => undefined);
                            }
                            if (!hasText) {
                                inputPriorityRequestedRef.current = false;
                            }
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    {isSending && !input.trim() ? (
                        <button
                            onClick={handleStop}
                            className="p-2 rounded transition-all text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                            title="Stop"
                        >
                            <Square size={15} />
                        </button>
                    ) : input.trim() ? (
                        <button
                            onClick={handleSend}
                            disabled={isSending || !input.trim()}
                            className={`p-2 rounded transition-all ${isSending || !input.trim() ? 'text-gray-700' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2b2d31]'}`}
                        >
                            <Send size={15} />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
