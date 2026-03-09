import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Power, AlertTriangle, Server, Activity } from 'lucide-react';
import { db } from '../../services/memoryService';

interface LoginScreenProps {
  onLogin: () => void;
  initialMessage?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, initialMessage }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialMessage || '');
  const [serverOnline, setServerOnline] = useState(false);

  useEffect(() => {
      // Check server liveness using lightweight ping
      const checkServer = async () => {
          try {
              const res = await fetch('/api/ping'); 
              if (res.ok) setServerOnline(true);
          } catch (e) {
              // ignore
          }
      };
      checkServer();
      
      // Poll every 2 seconds until online
      const interval = setInterval(() => {
          if (!serverOnline) checkServer();
      }, 2000);
      
      return () => clearInterval(interval);
  }, [serverOnline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setStatus('INITIATING HANDSHAKE...');

    try {
        // Secure Server-Side Validation
        const res = await fetch('/api/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }) 
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error('Access Denied: Invalid Credentials');
            if (res.status === 404) throw new Error('Server Endpoint Not Found (Deploying?)');
            throw new Error(`Server Error: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.sessionId) {
            setStatus('WAKING UP CORE SYSTEM (This may take 60s)...');
            db.setSessionId(data.sessionId);
            
            // Attempt sync with visual updates
            // MemoryService retries for ~30s internally
            await db.init();
            
            if (db.isInitialized) {
                setStatus('ACCESS GRANTED.');
                setTimeout(onLogin, 500);
            } else {
                throw new Error("System Sync Failed: Core DB Unreachable. Please try again.");
            }
        } else {
            throw new Error("Invalid Protocol");
        }
    } catch (e: any) {
            console.error(e);
            setError(true);
            // Customize message based on error type
            if (e.message && e.message.includes('Failed to fetch DB state')) {
                setStatus('SYNC TIMEOUT: SERVER IS BUSY/COLD');
            } else {
                setStatus(e.message || 'CONNECTION FAILED');
            }
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-neu-base text-neu-text font-mono relative overflow-hidden">
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neu-light opacity-5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-black opacity-20 rounded-full blur-3xl"></div>

      <div className="z-10 w-full max-w-sm p-8 bg-neu-base rounded-3xl shadow-neu-flat border border-neu-border relative">
        
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-neu-base shadow-neu-flat flex items-center justify-center border border-neu-border group">
             <div className="w-16 h-16 rounded-full bg-neu-base shadow-neu-pressed flex items-center justify-center transition-all group-hover:scale-95">
                <ShieldCheck size={32} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
             </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2 tracking-widest text-neu-text-strong">GAI OS</h2>
        <p className="text-xs text-center text-neu-text-sub mb-8 font-light tracking-[0.2em] opacity-70">UNIVERSAL AI KERNEL v2.2.3</p>

        {status && (
            <div className={`mb-6 p-3 rounded-xl text-xs font-bold text-center tracking-wide border ${
                error ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-500'
            } animate-fade-in`}>
                {status}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-neu-muted" size={16} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-neu-base shadow-neu-pressed rounded-xl py-3 pl-12 pr-4 text-neu-text outline-none transition-all border border-transparent focus:border-blue-500/30
                    ${error || status ? 'text-red-400 border-red-500/30' : ''}`}
                placeholder="ACCESS CODE"
                autoFocus
              />
            </div>
            {(error || status) && (
              <div className="absolute w-full text-center text-[10px] font-bold mt-3 flex justify-center gap-2 items-center animate-in fade-in slide-in-from-top-1">
                 {error && <AlertTriangle size={12} className="text-red-500" />}
                 <span className={error || status.includes('Terminated') ? 'text-red-400' : 'text-blue-400'}>
                    {status}
                 </span>
              </div>
            )}
            {!error && !status && loading && (
                <div className="absolute w-full text-center text-blue-400 text-[10px] font-bold mt-3 flex justify-center gap-2 items-center">
                    <Activity className="animate-spin" size={12} /> {status}
                </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all duration-200 flex items-center justify-center gap-2 border border-transparent
              ${loading 
                ? 'shadow-neu-pressed text-blue-400 scale-95' 
                : 'shadow-neu-flat hover:text-blue-400 active:shadow-neu-pressed text-neu-text hover:border-neu-border'
              }`}
          >
            {loading ? 'ESTABLISHING LINK...' : 'CONNECT TO CORE'}
            {!loading && <Power size={14} />}
          </button>
        </form>

        <div className="mt-10 text-center opacity-40">
           <div className="text-[9px] tracking-widest flex justify-center gap-2 items-center">
                <Server size={10}/> HOST: {window.location.hostname}
           </div>
           <div className="text-[9px] tracking-widest mt-1">
               SECURE TUNNEL REQUIRED
           </div>
        </div>
      </div>
    </div>
  );
};
