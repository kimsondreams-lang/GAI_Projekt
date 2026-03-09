import { spawn } from 'child_process';

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

let child = null;

const startBackend = () => {
  if (child) return;
  child = spawn(cmd, { cwd, stdio: 'inherit', shell: true });
  child.on('exit', () => {
    child = null;
  });
};

const check = async () => {
  let ok = false;
  try {
    const res = await fetch(url, { method: 'GET' });
    ok = res.status < 500;
  } catch {
    ok = false;
  }
  if (!ok) startBackend();
  if (once) setTimeout(() => process.exit(0), 50);
};

setInterval(check, intervalMs);
check();
