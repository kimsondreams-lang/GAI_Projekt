import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

const WATCH_DIR = './data/articles';
const GENERATOR_SCRIPT = 'python3 scripts/generate_article_index.py';
const EXCLUDE_FILES = ['index.json'];

let timeout = null;

function triggerReindex(filename) {
    if (EXCLUDE_FILES.includes(filename)) return;

    // Debounce to prevent multiple executions during rapid saves
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log(`[Watcher] Change detected in ${filename}. Running index generator...`);
        exec(GENERATOR_SCRIPT, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Watcher] Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`[Watcher] Stderr: ${stderr}`);
            }
            console.log(`[Watcher] Success: ${stdout.trim()}`);
        });
    }, 500);
}

console.log(`[Watcher] Starting watcher on ${WATCH_DIR}...`);

try {
    fs.watch(WATCH_DIR, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
            triggerReindex(filename);
        }
    });
    console.log('[Watcher] Active and waiting for changes.');
} catch (err) {
    console.error(`[Watcher] Failed to start: ${err.message}`);
    process.exit(1);
}