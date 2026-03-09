import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKUP_DIR = path.join(__dirname, '../data/backups');
const MAX_BACKUPS = 10;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function createBackup(filePath, reason) {
  ensureBackupDir();
  if (!fs.existsSync(filePath)) {
    console.log('[BACKUP] File does not exist, skipping:', filePath);
    return null;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = path.basename(filePath, path.extname(filePath));
  const extname = path.extname(filePath);
  const backupName = `${basename}_${timestamp}${extname}`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  try {
    fs.copyFileSync(filePath, backupPath);
    const checksum = calculateChecksum(backupPath);
    const size = fs.statSync(backupPath).size;
    const metaPath = `${backupPath}.meta.json`;
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
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(basename + '_') && f.endsWith('.meta.json'))
      .map(f => {
        const fullMetaPath = path.join(BACKUP_DIR, f);
        const backupPath = fullMetaPath.replace('.meta.json', '');
        return {
          meta: fullMetaPath,
          backup: backupPath,
          mtime: fs.statSync(fullMetaPath).mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_BACKUPS) {
      files.slice(MAX_BACKUPS).forEach(f => {
        if (fs.existsSync(f.backup)) fs.unlinkSync(f.backup);
        if (fs.existsSync(f.meta)) fs.unlinkSync(f.meta);
      });
    }
  } catch (e) {
    console.error('[BACKUP CLEANUP ERROR]', e.message);
  }
}

export function verifyBackup(backupPath) {
  const metaPath = `${backupPath}.meta.json`;
  if (!fs.existsSync(metaPath)) return { valid: false, error: 'No metadata' };
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const currentChecksum = calculateChecksum(backupPath);
    if (currentChecksum !== meta.checksum) {
      return { valid: false, error: 'Checksum mismatch' };
    }
    return { valid: true, size: meta.size, checksum: meta.checksum };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

export async function safeWriteFile(filePath, content, options = {}) {
  const backup = createBackup(filePath, options.reason || 'pre-write');
  try {
    const encoding = options.encoding || 'utf8';
    fs.writeFileSync(filePath, content, encoding);
    console.log('[WRITE] Success:', filePath);
    return { success: true, backup: backup };
  } catch (e) {
    console.error('[WRITE ERROR]', e.message);
    return { success: false, error: e.message, backup: backup };
  }
}

export function restoreBackup(backupPath, targetPath) {
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
