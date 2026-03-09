
import React, { useEffect, useState } from 'react';
import { db } from '../../services/memoryService';

interface BootLoaderProps {
    onComplete: () => void;
    onRecovery: () => void;
}

export const BootLoader: React.FC<BootLoaderProps> = ({ onComplete, onRecovery }) => {
    const [lines, setLines] = useState<string[]>([]);
    const bootedRef = React.useRef(false);

    useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;

        const boot = async () => {
            // Start Async DB Init immediately
            const dbInitPromise = db.init();

            const seq = [
                "GAI BIOS v4.0.2 Release 09/2025",
                "Copyright (C) 2025 GAI Systems Inc.",
                "CPU: Neural Core X1 @ 128THz",
                "Memory Test: 64TB OK",
                "Detecting Primary Master ... VFS_DRIVE_01",
                "Connecting to Cloud Volume...", 
            ];

            for (const line of seq) {
                // Reduced delay significantly: 20ms to 50ms (was 100ms-400ms)
                await new Promise(r => setTimeout(r, Math.random() * 30 + 20));
                setLines(prev => [...prev, line]);
            }

            // Wait for DB to actually be ready, but with a timeout
            setLines(prev => [...prev, "Syncing Persistent State..."]);
            
            // Create a timeout promise that resolves after 5 seconds
            const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve('timeout'), 5000));
            
            // Race the DB init against the timeout
            const result = await Promise.race([dbInitPromise, timeoutPromise]);

            if (result === 'timeout') {
                 setLines(prev => [...prev, "Warning: Sync Timeout. Connectivity Issues Detected.", "Skipping Persistence Sync..."]);
            } else {
                 setLines(prev => [...prev, "State Synced."]);
            }

            setLines(prev => [...prev, "Mounting /system read-only...", "Starting OS..."]);

            setTimeout(onComplete, 200); // Reduced final delay
        };

        boot();

        // F2 Interrupt listener
        const handleKey = (e: KeyboardEvent) => {
            if(e.key === 'F2' || e.key === 'Delete') {
                db.logSystem('warn', 'User interrupt: Entering Recovery Mode');
                onRecovery();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    return (
        <div className="w-screen h-screen bg-black text-white font-mono p-10 flex flex-col cursor-none">
            <div className="w-full max-w-3xl">
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-white rounded-sm flex items-center justify-center font-bold text-xs">
                        GAI
                    </div>
                    <div className="text-xl font-bold tracking-wider">GAI OS <span className="text-xs font-normal opacity-70">BIOS</span></div>
                </div>
                
                {lines.map((l, i) => <div key={i}>{l}</div>)}
                
                <div className="mt-10 text-white animate-pulse">
                    Press <span className="font-bold text-yellow-500">F2</span> to enter Setup
                </div>
                
                <div className="fixed bottom-2 right-2 text-xs text-gray-600">
                    0098-0000-1111-9999-33
                </div>
            </div>
        </div>
    );
};
