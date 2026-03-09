import os
import json
import pytest
from unittest.mock import patch
from scripts.persistence_utils import atomic_write_json, atomic_write_text

def test_atomic_write_json_failure_cleanup(tmp_path):
    test_file = tmp_path / "failure.json"
    data = {"test": "data"}
    
    # Mock os.replace to fail
    with patch('os.replace', side_effect=OSError("Disk full")):
        with pytest.raises(OSError):
            atomic_write_json(str(test_file), data)
    
    # Verify target file does not exist
    assert not test_file.exists()
    
    # Verify no temp files left behind (starting with .tmp_)
    temp_files = [f for f in os.listdir(tmp_path) if f.startswith('.tmp_')]
    assert len(temp_files) == 0

def test_atomic_write_text_preserves_original_on_failure(tmp_path):
    test_file = tmp_path / "original.txt"
    original_content = "Safe content"
    test_file.write_text(original_content)
    
    # Mock os.replace to fail
    with patch('os.replace', side_effect=OSError("Permission denied")):
        with pytest.raises(OSError):
            atomic_write_text(str(test_file), "New corrupted content")
            
    # Verify original content is still there
    assert test_file.read_text() == original_content

def test_atomic_write_json_failure_during_dump(tmp_path):
    test_file = tmp_path / "dump_fail.json"
    
    # Mock json.dump to fail
    with patch('json.dump', side_effect=TypeError("Object not serializable")):
        with pytest.raises(TypeError):
            atomic_write_json(str(test_file), {"set": {1, 2, 3}}) # Sets are not JSON serializable
            
    # Verify no temp files left behind
    temp_files = [f for f in os.listdir(tmp_path) if f.startswith('.tmp_')]
    assert len(temp_files) == 0
