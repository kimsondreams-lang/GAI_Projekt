
import fs from 'fs';
const db = JSON.parse(fs.readFileSync('./data/gai_db.json', 'utf8'));
console.log('ActiveModel:', db.settings.activeModel);
console.log('ModelRoles:', db.settings.modelRoles);
console.log('AgenticSystem:', db.settings.agenticSystem);
console.log('AutonomyConfig:', db.settings.autonomyConfig);
