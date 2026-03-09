import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const RECOVERY_DIR = path.join(ROOT_DIR, '.gaios', 'recovery');
const MANIFEST_PATH = path.join(RECOVERY_DIR, 'manifest.json');

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.includes('=') ? arg.split('=') : [arg, ''];
  args.set(key, value);
}

const url = args.get('--url') || 'http://localhost:1234/api/ping';
const intervalMs = Number(args.get('--interval') || 5000);
const cmd = args.get('--cmd') || 'node server.js';
const cwd = args.get('--cwd') || ROOT_DIR;
const maxCrashLoop = 3;
const crashLoopWindowMs = 60000;

let child = null;
let crashes = [];
let restarting = false;

const log = (msg) => console.log(`[SmartWatchdog] ${msg}`);

const performRollback = () => {
    try {
        if (!fs.existsSync(MANIFEST_PATH)) {
            log('No recovery manifest found. Cannot rollback.');
            return false;
        }
        
        const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        if (!manifest.changes || manifest.changes.length === 0) {
            log('No changes recorded in manifest.');
            return false;
        }

        // Get the most recent change
        const lastChange = manifest.changes[manifest.changes.length - 1];
        const { originalPath, backupPath, timestamp } = lastChange;

        // Only rollback if the change was recent (e.g., last 5 minutes)
        if (Date.now() - timestamp > 300000) {
            log('Last change is too old to be the cause of this crash. Skipping rollback.');
            return false;
        }

        if (fs.existsSync(backupPath)) {
            log(`🚨 DETECTED CRASH LOOP! Rolling back ${path.basename(originalPath)}...`);
            fs.copyFileSync(backupPath, originalPath);
            log(`✅ Restored ${originalPath} from ${backupPath}`);
            
            // Remove this entry from manifest to prevent infinite rollback loops of the same file if it's not the cause
            // OR keep it to allow stepping back further?
            // Let's remove it for now to "consume" the rollback
            manifest.changes.pop();
            fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
            
            return true;
        }
    } catch (e) {
        console.error('Rollback failed:', e);
    }
    return false;
};

const startBackend = () => {
  if (child) return;
  
  log('Starting backend...');
  const startObj = { time: Date.now() };
  
  child = spawn(cmd, { cwd, stdio: 'inherit', shell: true });
  
  child.on('exit', (code) => {
    const uptime = Date.now() - startObj.time;
    child = null;
    log(`Backend exited with code ${code} (uptime: ${uptime}ms)`);

    // Record crash
    const now = Date.now();
    crashes.push(now);
    crashes = crashes.filter(t => now - t < crashLoopWindowMs);

    if (code !== 0 && crashes.length >= maxCrashLoop) {
        log(`⚠️ Crash loop detected (${crashes.length} crashes in ${crashLoopWindowMs/1000}s)`);
        const rolledBack = performRollback();
        if (rolledBack) {
            // Reset crash counter after rollback to give it a chance
            crashes = [];
        }
    }

    // Restart with delay
    setTimeout(startBackend, 1000);
  });
};

// Start
startBackend();

// Optional: Ping health check (if process is running but stuck)
setInterval(async () => {
    if (!child) return;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
            // If healthy, we can maybe clear crash counter slowly?
            if (crashes.length > 0) crashes.shift();
        }
    } catch (e) {
        // Ping failed, but let the process exit naturally or handle its own timeout
    }
}, intervalMs);
