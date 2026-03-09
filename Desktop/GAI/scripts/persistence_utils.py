import os
import json
import tempfile
import shutil

def atomic_write_json(path, data, indent=2):
    """Writes JSON data to a file atomically using a temporary file and os.replace()."""
    dir_name = os.path.dirname(path) or '.'
    fd, temp_path = tempfile.mkstemp(dir=dir_name, prefix='.tmp_', suffix='.json')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        # Atomic replacement
        os.replace(temp_path, path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e

def atomic_write_text(path, content):
    """Writes text content to a file atomically."""
    dir_name = os.path.dirname(path) or '.'
    fd, temp_path = tempfile.mkstemp(dir=dir_name, prefix='.tmp_')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e
