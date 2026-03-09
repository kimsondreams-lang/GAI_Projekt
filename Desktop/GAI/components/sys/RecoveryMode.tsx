
import React, { useState, useEffect } from 'react';
import { db } from '../../services/memoryService';
import { HardDrive, RotateCcw, Play, AlertTriangle, Terminal } from 'lucide-react';

interface RecoveryModeProps {
    onReboot: () => void;
}

export const RecoveryMode: React.FC<RecoveryModeProps> = ({ onReboot }) => {
    const [snapshots, setSnapshots] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [message, setMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | null }>({ type: null });

    useEffect(() => {
        const load = async () => {
            const snaps = await db.listSnapshots();
            setSnapshots([...snaps].reverse());
            const sysLogs = db.getLogs().slice(0, 10);
            setLogs(sysLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`));
        };
        load();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (confirmAction.type) {
                if (e.key === 'y' || e.key === 'Y') {
                    handleConfirm();
                } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
                    setConfirmAction({ type: null });
                    setMessage("ABORTED.");
                }
                return;
            }

            if (e.key === 'ArrowUp') setSelectedIndex(prev => Math.max(0, prev - 1));
            if (e.key === 'ArrowDown') setSelectedIndex(prev => Math.min(snapshots.length + 1, prev + 1));
            if (e.key === 'Enter') handleBoot();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [snapshots, confirmAction]);

    const handleConfirm = () => {
        if (confirmAction.type === 'reset') {
            setMessage("FORMATTING...");
            setConfirmAction({ type: null });
            db.factoryReset();
        }
    };

    const handleBoot = () => {
        if (selectedIndex === 0) {
            // Boot Current
            setMessage("BOOTING KERNEL...");
            setTimeout(onReboot, 1000);
        } else if (selectedIndex <= snapshots.length) {
            // Boot Snapshot
            const snapId = snapshots[selectedIndex - 1];
            setMessage(`MOUNTING IMAGE: ${snapId}...`);
            db.restoreSnapshot(snapId).then(success => {
                if (success) {
                    setMessage('IMAGE LOADED. REBOOTING...');
                    setTimeout(onReboot, 500);
                } else {
                    setMessage('ERROR: CORRUPT IMAGE.');
                }
            });
        } else {
            // Factory Reset Selection
            setConfirmAction({ type: 'reset' });
        }
    };

    return (
        <div className="w-screen h-screen bg-black text-gray-300 font-mono p-10 flex flex-col select-none">
            <div className="border-2 border-gray-500 p-8 max-w-4xl mx-auto w-full relative shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-4 text-xl font-bold text-white">
                    GNU GAI BOOTLOADER v2.5
                </div>

                {confirmAction.type === 'reset' ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-red-500 animate-pulse">
                        <AlertTriangle size={64} className="mb-4" />
                        <h2 className="text-2xl font-bold mb-4">WARNING: IRREVERSIBLE ACTION</h2>
                        <p className="mb-8 text-center max-w-md">
                            You are about to perform a FACTORY RESET.<br/>
                            All user data, settings, and files will be permanently erased.
                        </p>
                        <div className="text-white bg-red-900/50 px-4 py-2 border border-red-500">
                            PRESS [Y] TO CONFIRM / [N] TO ABORT
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-8 h-[400px]">
                        {/* Boot Menu */}
                        <div className="w-2/3 border-r border-gray-700 pr-4">
                            <div className="mb-4 text-white">Use the &uarr; and &darr; keys to select which entry is highlighted.<br/>Press enter to boot the selected OS.</div>
                            
                            <div className="bg-gray-900 border border-gray-600 p-2 h-64 overflow-y-auto">
                                <div 
                                    className={`px-2 py-1 cursor-pointer ${selectedIndex === 0 ? 'bg-white text-black' : 'hover:text-white'}`}
                                    onClick={() => setSelectedIndex(0)}
                                >
                                    GAI OS (Current State)
                                </div>
                                
                                {snapshots.map((snap, i) => (
                                    <div 
                                        key={snap}
                                        className={`px-2 py-1 cursor-pointer flex justify-between ${selectedIndex === i + 1 ? 'bg-white text-black' : 'hover:text-white'}`}
                                        onClick={() => setSelectedIndex(i + 1)}
                                    >
                                        <span>Snapshot: {snap.replace('gai_snapshot_', '')}</span>
                                        <span>{new Date(parseInt(snap.split('_')[2])).toLocaleDateString()}</span>
                                    </div>
                                ))}

                                <div 
                                    className={`px-2 py-1 cursor-pointer text-red-500 mt-4 border-t border-gray-700 ${selectedIndex === snapshots.length + 1 ? 'bg-red-600 text-white' : 'hover:bg-red-900/30'}`}
                                    onClick={() => setSelectedIndex(snapshots.length + 1)}
                                >
                                    [FACTORY RESET] Wipe All Data
                                </div>
                            </div>
                        </div>

                        {/* Details Panel */}
                        <div className="w-1/3 flex flex-col text-xs">
                            <div className="mb-2 text-yellow-500 font-bold">SYSTEM LOGS</div>
                            <div className="flex-1 bg-gray-900 p-2 overflow-y-auto mb-4 border border-gray-700 text-gray-400">
                                {logs.map((l, i) => <div key={i} className="truncate">{l}</div>)}
                            </div>
                            
                            <div className="border-t border-gray-700 pt-2">
                                <div className="text-blue-400 font-bold mb-1">STATUS</div>
                                <div className="animate-pulse text-white">{message || "READY TO BOOT"}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-between text-xs text-gray-500">
                   <div>
                       <span className="text-white font-bold">e</span> to edit commands
                       <span className="ml-4 text-white font-bold">c</span> for command-line
                   </div>
                   <div>GAI-Systems-2025</div>
                </div>
            </div>
        </div>
    );
};
