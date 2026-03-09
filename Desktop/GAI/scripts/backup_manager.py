import os
import shutil
import time
from datetime import datetime

BACKUP_DIR = 'backups/articles_rolling'
MAX_BACKUPS = 5

def create_rolling_backup(source_dir='data/articles'):
    """Creates a timestamped zip backup of the source directory and removes old ones."""
    if not os.path.exists(source_dir):
        print(f"Source directory {source_dir} does not exist.")
        return None

    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f"articles_backup_{timestamp}"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    # Create zip archive
    shutil.make_archive(backup_path, 'gztar', source_dir)
    full_backup_path = f"{backup_path}.tar.gz"
    print(f"Backup created: {full_backup_path}")

    # Rotate backups
    rotate_backups()
    return full_backup_path

def rotate_backups():
    """Keeps only the MAX_BACKUPS most recent files in the backup directory."""
    backups = [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith('.tar.gz')]
    backups.sort(key=os.path.getmtime, reverse=True)

    if len(backups) > MAX_BACKUPS:
        for old_backup in backups[MAX_BACKUPS:]:
            os.remove(old_backup)
            print(f"Removed old backup: {old_backup}")

if __name__ == '__main__':
    create_rolling_backup()
