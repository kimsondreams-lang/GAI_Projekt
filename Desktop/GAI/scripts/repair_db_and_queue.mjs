
import fs from 'fs';
import path from 'path';

const DB_PATH = 'data/gai_db.json';
const ARTICLES_DIR = 'data/articles';

// Lista uszkodzonych plików (znaleziona wcześniej)
const corruptedFiles = [
    'best-4k-monitors-2025.json',
    'best-smart-home-devices-2025.json',
    'best-portable-monitors-2025.json',
    'best-eco-friendly-products-amazon-2025.json',
    'best-gaming-headsets-2025.json',
    'summer-2025-laptop-buying-guide.json',
    'iphone-17-vs-samsung-s25.json',
    'best-budget-tech-gadgets-2024.json',
    'dji-mini-4-pro-review.json',
    'top-10-smart-home-gadgets-amazon-2025.json',
    'revolutionary-ai-tech-products-amazon-2025.json',
    'ai-assistants-comparison-2025.json',
    'best-wireless-earbuds-2025.json'
];

try {
    console.log('Reading DB...');
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);

    // 1. Cleanup History & Notifications
    console.log(`Original Chat History: ${db.chatHistory?.length || 0}`);
    if (db.chatHistory && db.chatHistory.length > 50) {
        db.chatHistory = db.chatHistory.slice(-50);
    }
    console.log(`New Chat History: ${db.chatHistory?.length || 0}`);

    console.log(`Original Notifications: ${db.notifications?.length || 0}`);
    db.notifications = []; // Clear all notifications
    console.log('Notifications cleared.');

    // 2. Clear Old Tasks
    console.log(`Original Tasks: ${db.tasks?.length || 0}`);
    db.tasks = []; // Clear all tasks
    console.log('Tasks cleared.');

    // 3. Create New Repair Task
    const repairTask = {
        id: `task_${Date.now()}`,
        title: 'Regeneracja Uszkodzonych Artykułów Blogowych',
        status: 'pending',
        priority: 'high',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: 'Automatyczna naprawa plików JSON, które uległy uszkodzeniu (rozmiar < 1KB). Zadanie polega na ponownym wygenerowaniu pełnej treści artykułów na podstawie ich tytułów.',
        subtasks: corruptedFiles.map((file, index) => ({
            id: `subtask_${index + 1}`,
            title: `Regenerate: ${file}`,
            status: 'pending'
        })),
        logs: ['[SYSTEM] Task created by repair script.']
    };

    db.tasks.push(repairTask);
    console.log('Added repair task with', repairTask.subtasks.length, 'subtasks.');

    // 4. Save DB
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log('Database saved successfully.');

} catch (err) {
    console.error('Error repairing DB:', err);
    process.exit(1);
}
