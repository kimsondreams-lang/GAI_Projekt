import os
import shutil
import pytest
import time
from unittest.mock import patch, MagicMock
from datetime import datetime
from scripts.backup_manager import create_rolling_backup, rotate_backups

@pytest.fixture
def backup_env(tmp_path):
    source_dir = tmp_path / "data"
    source_dir.mkdir()
    (source_dir / "file1.json").write_text("{}")
    
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    
    with patch('scripts.backup_manager.BACKUP_DIR', str(backup_dir)), \
         patch('scripts.backup_manager.MAX_BACKUPS', 3):
        yield source_dir, backup_dir

def test_create_rolling_backup(backup_env):
    source_dir, backup_dir = backup_env
    backup_path = create_rolling_backup(str(source_dir))
    assert backup_path is not None
    assert os.path.exists(backup_path)
    assert len(os.listdir(backup_dir)) == 1

def test_backup_rotation(backup_env):
    source_dir, backup_dir = backup_env
    
    # Mock datetime to provide unique timestamps for each call
    with patch('scripts.backup_manager.datetime') as mock_datetime:
        for i in range(5):
            mock_datetime.now.return_value = datetime(2025, 1, 1, 12, 0, i)
            create_rolling_backup(str(source_dir))

    backups = [f for f in os.listdir(backup_dir) if f.endswith('.tar.gz')]
    assert len(backups) == 3

def test_rotate_backups_directly(backup_env):
    source_dir, backup_dir = backup_env
    
    # Manually create 10 dummy backup files with different mtimes
    now = time.time()
    for i in range(10):
        path = backup_dir / f"dummy_{i}.tar.gz"
        path.write_text("dummy content")
        os.utime(path, (now + i, now + i))
    
    rotate_backups()
    
    backups = [f for f in os.listdir(backup_dir) if f.endswith('.tar.gz')]
    assert len(backups) == 3
