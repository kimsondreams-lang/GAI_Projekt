
import React, { useState } from 'react';
import { DollarSign, TrendingUp, Zap } from 'lucide-react';
import { generateStrategy } from '../../services/aiService';

export const IncomeStrategist: React.FC = () => {
  const [context, setContext] = useState('');
  const [strategy, setStrategy] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await generateStrategy(context || "General tech trends for 2025");
    setStrategy(result || "");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-neu-base text-neu-text p-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full shadow-neu-flat mb-4 bg-neu-base">
             <DollarSign className="text-emerald-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-neu-text tracking-widest neu-text-shadow">PASSIVE INCOME ARCHITECT</h2>
        <p className="text-[10px] text-neu-muted mt-2 tracking-widest">AUTONOMOUS REVENUE PROTOCOL</p>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar px-4">
        <div className="p-6 rounded-3xl shadow-neu-flat bg-neu-base">
          <label className="block text-[10px] font-bold mb-4 text-emerald-400 uppercase tracking-wider ml-1">Market Context / Niche</label>
          <textarea 
            className="w-full bg-neu-base shadow-neu-pressed rounded-2xl p-4 text-sm text-neu-text outline-none focus:border focus:border-emerald-500/30 transition-colors resize-none"
            rows={3}
            placeholder="e.g. 'React developers looking for productivity tools' or 'Home automation enthusiasts'"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-6 w-full py-4 bg-neu-base shadow-neu-flat active:shadow-neu-pressed rounded-xl font-bold text-emerald-400 flex items-center justify-center gap-2 disabled:opacity-50 hover:text-emerald-300 transition-all"
          >
            {loading ? <Zap className="animate-pulse" /> : <TrendingUp />}
            {loading ? 'Analyzing Market Data...' : 'Generate Strategy'}
          </button>
        </div>

        {strategy && (
          <div className="p-8 rounded-3xl shadow-neu-pressed bg-neu-base border border-neu-light/5">
            <h3 className="text-sm font-bold text-emerald-400 mb-6 border-b border-emerald-500/20 pb-2 uppercase tracking-wider">Strategic Output</h3>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-light text-neu-text leading-relaxed">
              {strategy}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
