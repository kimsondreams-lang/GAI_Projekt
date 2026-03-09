
import React, { useState, useContext } from 'react';
import { DynamicAppSchema, UIElement } from '../../types';
import { soundService } from '../../services/soundService';
import { AppContext } from '../../contexts/AppContext';

interface DynamicAppRendererProps {
    schema: DynamicAppSchema;
}

export const DynamicAppRenderer: React.FC<DynamicAppRendererProps> = ({ schema }) => {
    const { showModal } = useContext(AppContext);
    // Generic state store for all inputs in the dynamic app
    // Key: actionId or generated index, Value: string
    const [appState, setAppState] = useState<Record<string, string>>({});

    const handleInputChange = (key: string, value: string) => {
        setAppState(prev => ({ ...prev, [key]: value }));
    };

    const handleAction = (actionId?: string) => {
        soundService.play('click');
        if (typeof actionId !== 'string') return;
        
        // Simple Logic Simulation for demo (GAI would expand this in real compilation)
        if (actionId.startsWith('alert:')) {
            showModal('info', 'App Alert', actionId.replace('alert:', ''));
        }
        // Calc Logic
        if (actionId === 'calculate') {
            // Try to find inputs
            const inputs = Object.values(appState) as string[];
            // Extremely basic evaluator for demo
            try {
                // Safety: only eval numbers and math ops
                if (inputs.length > 0 && /^[0-9+\-*/. ]+$/.test(inputs[0])) {
                    const result = eval(inputs[0]); 
                    showModal('success', 'Result', `Result: ${result}`);
                }
            } catch (e) {
                showModal('error', 'Error', 'Invalid Calculation');
            }
        }
    };

    const renderElement = (el: UIElement, idx: number, parentKey: string = ''): React.ReactNode => {
        const { type, props = {}, children, actionId } = el;
        const key = `${parentKey}-${idx}`;
        
        switch (type) {
            case 'box':
                return (
                    <div key={key} {...props} className={`${props.className || ''} flex flex-col gap-2`}>
                        {children?.map((child, i) => renderElement(child, i, key))}
                    </div>
                );
            case 'text':
                return (
                    <span key={key} {...props} className={props.className || 'text-neu-text'}>
                        {props.content}
                    </span>
                );
            case 'button':
                return (
                    <button 
                        key={key} 
                        {...props} 
                        onClick={() => handleAction(actionId)}
                        className={`px-4 py-2 bg-neu-base shadow-neu-flat active:shadow-neu-pressed rounded-lg text-sm font-bold transition-all ${props.className}`}
                    >
                        {props.label || 'Button'}
                    </button>
                );
            case 'input':
                return (
                    <input 
                        key={key} 
                        {...props} 
                        value={appState[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className={`bg-neu-base shadow-neu-pressed rounded-lg p-2 text-sm text-neu-text outline-none border border-transparent focus:border-blue-500/30 transition-all ${props.className}`} 
                    />
                );
            case 'textarea':
                return (
                    <textarea 
                        key={key} 
                        {...props} 
                        value={appState[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className={`bg-neu-base shadow-neu-pressed rounded-lg p-2 text-sm text-neu-text outline-none resize-none ${props.className}`} 
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full overflow-auto bg-neu-base p-4 text-neu-text">
            {renderElement(schema.layout, 0)}
        </div>
    );
};
