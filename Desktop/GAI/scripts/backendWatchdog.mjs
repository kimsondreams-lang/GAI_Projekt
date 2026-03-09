import { spawn } from 'child_process';
import fs from 'fs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.includes('=') ? arg.split('=') : [arg, ''];
  args.set(key, value);
}

const url = args.get('--url') || 'http://localhost:8080/api/ping';
const intervalMs = Number(args.get('--interval') || 5000);
const once = args.has('--once');
const cmd = args.get('--cmd') || 'node server.js';
const cwd = args.get('--cwd') || process.cwd();
const pidfile = args.get('--pidfile') || '';
const timeoutMs = Number(args.get('--timeout') || 4000);
const failuresLimit = Number(args.get('--failures') || 3);
const restartDelayMs = Number(args.get('--restartDelay') || 1000);

let child = null;
let consecutiveFailures = 0;
let restarting = false;

const startBackend = () => {
  if (child) return;
  child = spawn(cmd, { cwd, stdio: 'inherit', shell: true });
  if (pidfile) {
    try { fs.writeFileSync(pidfile, String(child.pid)); } catch {}
  }
  child.on('exit', () => {
    const exitedPid = child?.pid;
    child = null;
    if (pidfile) {
      try {
        const current = fs.readFileSync(pidfile, 'utf8').trim();
        if (!current || current === String(exitedPid || '')) fs.unlinkSync(pidfile);
      } catch {}
    }
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const readPid = () => {
  if (!pidfile) return null;
  try {
    const raw = fs.readFileSync(pidfile, 'utf8').trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
const stopPid = async (pid) => {
  try { process.kill(pid, 'SIGTERM'); } catch {}
  await sleep(1500);
  if (isAlive(pid)) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
};
const ping = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};
const restartBackend = async () => {
  if (restarting) return;
  restarting = true;
  const pid = readPid();
  if (pid && isAlive(pid)) await stopPid(pid);
  if (child?.pid && isAlive(child.pid)) await stopPid(child.pid);
  if (pidfile) {
    try { fs.unlinkSync(pidfile); } catch {}
  }
  if (restartDelayMs > 0) await sleep(restartDelayMs);
  startBackend();
  restarting = false;
};
const check = async () => {
  const ok = await ping();
  if (ok) {
    consecutiveFailures = 0;
  } else {
    consecutiveFailures += 1;
    if (consecutiveFailures >= failuresLimit) {
      consecutiveFailures = 0;
      await restartBackend();
    }
  }
  if (once) setTimeout(() => process.exit(0), 50);
};

setInterval(check, intervalMs);
check();
