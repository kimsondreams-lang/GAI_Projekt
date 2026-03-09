import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/gai_db.json');

try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    let modified = false;

    if (db.tasks) {
        db.tasks.forEach(task => {
            if ((task.retryCount > 0 && task.status !== 'completed') || task.status === 'failed') {
                console.log(`Resetting task: ${task.title} (Retry: ${task.retryCount}, Status: ${task.status})`);
                task.retryCount = 0;
                if (task.status === 'failed' || task.status === 'in_progress') {
                    task.status = 'pending';
                }
                task.logs = task.logs || [];
                task.logs.push(`[SYSTEM] Manual reset of retry count and status to clear IDLE state.`);
                modified = true;
            }
        });
    }

    if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        console.log('Database updated successfully.');
    } else {
        console.log('No tasks needed resetting.');
    }

} catch (e) {
    console.error('Error:', e.message);
}
