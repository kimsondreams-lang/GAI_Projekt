import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X, Edit3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ModalState } from '../../types';

interface ModalProps {
    state: ModalState;
    onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ state, onClose }) => {
    const [inputValue, setInputValue] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (state.isOpen) {
            setInputValue(state.inputValue || '');
            setDetailsOpen(false);
            if (state.type === 'prompt') {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    }, [state.isOpen, state.type, state.inputValue]);

    if (!state.isOpen) return null;

    const getIcon = () => {
        switch (state.type) {
            case 'success': return <CheckCircle size={32} className="text-green-400" />;
            case 'error': return <AlertTriangle size={32} className="text-red-400" />;
            case 'confirm': return <AlertCircle size={32} className="text-blue-400" />;
            case 'prompt': return <Edit3 size={32} className="text-purple-400" />;
            case 'choice': return <AlertCircle size={32} className="text-blue-400" />;
            case 'progress': return <Loader2 size={32} className="text-blue-400 animate-spin" />;
            default: return <Info size={32} className="text-neu-accent" />;
        }
    };

    const handleConfirm = () => {
        if (state.type === 'progress') return;
        if (state.onConfirm) state.onConfirm(inputValue);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onClose();
    };

    const hasActions = Array.isArray(state.actions) && state.actions.length > 0;
    const progressValue = state.type === 'progress' ? state.progress?.value : undefined;
    const progressStatus = state.type === 'progress' ? String(state.progress?.status || '') : '';
    const progressDetails = state.type === 'progress' ? (Array.isArray(state.progress?.details) ? state.progress!.details! : []) : [];
    const canCancelProgress = state.type === 'progress' ? state.progress?.canCancel === true : false;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-neu-base rounded-3xl shadow-neu-flat border border-neu-border p-6 relative animate-in zoom-in-95 duration-200">
                
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 rounded-full text-neu-muted hover:text-red-400 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-neu-base shadow-neu-pressed flex items-center justify-center mb-6 border border-neu-light/5">
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-neu-text mb-2 neu-text-shadow">
                        {state.title}
                    </h3>

                    <div className="text-sm text-neu-muted mb-6 leading-relaxed w-full">
                        {state.message}
                        {state.type === 'prompt' && (
                            <input 
                                ref={inputRef}
                                type="text"
                                className="mt-4 w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-neu-text outline-none border border-transparent focus:border-blue-500/30 text-center"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type here..."
                            />
                        )}
                    </div>

                    {state.type === 'progress' && (
                        <div className="w-full mb-6">
                            {progressStatus && (
                                <div className="text-xs text-neu-muted mb-2 text-left">{progressStatus}</div>
                            )}
                            <div className="w-full h-3 rounded-full bg-neu-dark/40 border border-neu-border overflow-hidden">
                                {progressValue === null || typeof progressValue === 'undefined' ? (
                                    <div className="h-full w-full bg-blue-400/40 animate-pulse" />
                                ) : (
                                    <div
                                        className="h-full bg-blue-400 transition-all duration-200"
                                        style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }}
                                    />
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="text-[10px] text-neu-muted">
                                    {progressValue === null || typeof progressValue === 'undefined'
                                        ? 'Working...'
                                        : `${Math.max(0, Math.min(100, Math.round(progressValue)))}%`}
                                </div>
                                {progressDetails.length > 0 && (
                                    <button
                                        onClick={() => setDetailsOpen(v => !v)}
                                        className="text-[10px] font-bold text-neu-muted hover:text-neu-text transition-colors flex items-center gap-1"
                                    >
                                        {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {detailsOpen ? 'Hide details' : 'Show details'}
                                    </button>
                                )}
                            </div>
                            {detailsOpen && progressDetails.length > 0 && (
                                <div className="mt-3 max-h-40 overflow-y-auto bg-neu-dark/20 rounded-xl border border-neu-border p-3 text-left custom-scrollbar">
                                    <div className="text-[10px] font-mono text-neu-text/80 whitespace-pre-wrap">
                                        {progressDetails.slice(-200).join('\n')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`flex gap-4 w-full ${hasActions ? 'flex-col sm:flex-row' : ''}`}>
                        {hasActions ? (
                            state.actions!.map((a) => (
                                <button
                                    key={a.label}
                                    onClick={() => {
                                        a.action();
                                        onClose();
                                    }}
                                    className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95
                                        ${a.variant === 'danger'
                                            ? 'bg-red-400 hover:bg-red-300 text-neu-base'
                                            : a.variant === 'secondary'
                                                ? 'bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-neu-muted hover:text-neu-text border border-neu-border'
                                                : 'bg-blue-400 hover:bg-blue-300 text-neu-base'
                                        }`}
                                >
                                    {a.label}
                                </button>
                            ))
                        ) : (
                        <>
                        {(state.type === 'confirm' || state.type === 'prompt' || (state.type === 'progress' && canCancelProgress)) && (
                            <button
                                onClick={() => {
                                    if (state.onCancel) state.onCancel();
                                    onClose();
                                }}
                                className="flex-1 py-3 rounded-xl font-bold text-neu-muted bg-neu-base shadow-neu-flat active:shadow-neu-pressed transition-all hover:text-neu-text"
                            >
                                {state.type === 'progress' ? 'Cancel' : 'Cancel'}
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            disabled={state.type === 'progress'}
                            className={`flex-1 py-3 rounded-xl font-bold text-neu-base shadow-lg transition-all active:scale-95
                                ${state.type === 'error' ? 'bg-red-400 hover:bg-red-300' : 
                                  state.type === 'success' ? 'bg-green-400 hover:bg-green-300' : 
                                  'bg-blue-400 hover:bg-blue-300'}`}
                        >
                            {state.type === 'progress' ? 'Working...' : state.type === 'confirm' ? 'Confirm' : state.type === 'prompt' ? 'Submit' : 'Okay'}
                        </button>
                        </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
