const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '../data/backups');
const MAX_BACKUPS = 10;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function createBackup(filePath, reason) {
  ensureBackupDir();
  if (!fs.existsSync(filePath)) {
    console.log('[BACKUP] File does not exist, skipping:', filePath);
    return null;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = path.basename(filePath, path.extname(filePath));
  const extname = path.extname(filePath);
  const backupName = basename + '_' + timestamp + extname;
  const backupPath = path.join(BACKUP_DIR, backupName);
  try {
    fs.copyFileSync(filePath, backupPath);
    const checksum = calculateChecksum(backupPath);
    const size = fs.statSync(backupPath).size;
    const metaPath = backupPath + '.meta.json';
    const meta = {
      originalPath: filePath,
      backupPath: backupPath,
      timestamp: new Date().toISOString(),
      reason: reason || 'manual',
      checksum: checksum,
      size: size
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log('[BACKUP] Created:', backupName, '| Size:', size);
    cleanupOldBackups(basename);
    return meta;
  } catch (e) {
    console.error('[BACKUP ERROR]', e.message);
    return null;
  }
}

function cleanupOldBackups(basename) {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(basename + '_') && f.endsWith('.json'))
    .sort().reverse();
  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      const meta = path.join(BACKUP_DIR, f + '.meta.json');
      if (fs.existsSync(meta)) fs.unlinkSync(meta);
    });
  }
}

function verifyBackup(backupPath) {
  const metaPath = backupPath + '.meta.json';
  if (!fs.existsSync(metaPath)) return { valid: false, error: 'No metadata' };
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const currentChecksum = calculateChecksum(backupPath);
  if (currentChecksum !== meta.checksum) {
    return { valid: false, error: 'Checksum mismatch' };
  }
  return { valid: true, size: meta.size, checksum: meta.checksum };
}

function safeWriteFile(filePath, content, options) {
  const backup = createBackup(filePath, (options || {}).reason || 'pre-write');
  try {
    fs.writeFileSync(filePath, content, (options || {}).encoding || 'utf8');
    console.log('[WRITE] Success:', filePath);
    return { success: true, backup: backup };
  } catch (e) {
    console.error('[WRITE ERROR]', e.message);
    return { success: false, error: e.message, backup: backup };
  }
}

function restoreBackup(backupPath, targetPath) {
  const verification = verifyBackup(backupPath);
  if (!verification.valid) {
    console.error('[RESTORE ERROR] Invalid backup:', verification.error);
    return { success: false, error: verification.error };
  }
  try {
    fs.copyFileSync(backupPath, targetPath);
    console.log('[RESTORE] Success:', targetPath);
    return { success: true };
  } catch (e) {
    console.error('[RESTORE ERROR]', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  createBackup,
  verifyBackup,
  safeWriteFile,
  restoreBackup,
  calculateChecksum,
  BACKUP_DIR
};