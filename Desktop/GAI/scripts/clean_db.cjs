const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/gai_db.json');

if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found:', DB_PATH);
    process.exit(1);
}

try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let changes = 0;

    // 1. Clean Tasks
    if (db.tasks) {
        db.tasks.forEach(task => {
            if (task.logs && Array.isArray(task.logs)) {
                const originalLen = task.logs.length;
                task.logs = task.logs.filter(log => {
                    const s = String(log);
                    // Usuń logi STAGE, Retrying, oraz dziwne JSON-owe śmieci
                    if (s.includes('[STAGE/')) return false;
                    if (s.includes('Retrying...')) return false;
                    if (s.startsWith('"') && s.endsWith('"')) return false; // JSON fragmenty
                    if (s.includes('TOOLYETIMMAY')) return false;
                    return true;
                });
                if (task.logs.length !== originalLen) {
                    changes += (originalLen - task.logs.length);
                    console.log(`Cleaned logs in task ${task.id}: -${originalLen - task.logs.length}`);
                }
            }
        });
    }

    // 2. Clean Chat History
    if (db.chatHistory) {
        const originalLen = db.chatHistory.length;
        db.chatHistory = db.chatHistory.filter(msg => {
            // Zachowaj user/model messages (chyba że model to halucynacje z STAGE)
            if (msg.role === 'user') return true;
            
            // Usuń systemowe logi STAGE
            if (msg.role === 'system' && msg.text && msg.text.includes('STAGE:')) return false;
            if (msg.role === 'system' && msg.text && msg.text.includes('[STAGE/')) return false;
            
            // Usuń zepsute myśli modelu
            if (msg.role === 'model' && msg.logType === 'thought') {
                if (msg.text.includes('[STAGE/') || msg.text.includes('Retrying...')) {
                    // Możemy wyczyścić tekst zamiast usuwać całą wiadomość
                    msg.text = '(Cleaned corrupted thought)';
                    return true; 
                }
            }
            
            return true;
        });
        
        if (db.chatHistory.length !== originalLen) {
            changes += (originalLen - db.chatHistory.length);
            console.log(`Removed chat messages: -${originalLen - db.chatHistory.length}`);
        }
    }

    if (changes > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log(`Database cleaned! Total changes: ${changes}`);
    } else {
        console.log('No garbage found.');
    }

} catch (e) {
    console.error('Error cleaning DB:', e);
}
