
import fs from 'fs';
const dbPath = './data/gai_db.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Update activeModel just in case
// db.settings.activeModel = 'gemini-3-flash-preview:cloud'; // User seems to want this as Brain

// 2. Clean up ModelRoles - remove deepseek
const roles = db.settings.modelRoles || {};
for (const key in roles) {
    if (roles[key].includes('deepseek')) {
        console.log(`Replacing deepseek in role ${key} with ${db.settings.activeModel}`);
        roles[key] = db.settings.activeModel;
    }
}
db.settings.modelRoles = roles;

// 3. Update Agentic System Master Model
if (db.settings.agenticSystem) {
    // Ensure masterModel matches activeModel or specific choice
    // db.settings.agenticSystem.masterModel = 'gemini-3-flash-preview:cloud';
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Database cleaned of deepseek roles.');
