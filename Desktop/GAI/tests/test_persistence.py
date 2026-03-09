import os
import json
import pytest
from scripts.persistence_utils import atomic_write_json, atomic_write_text

def test_atomic_write_json_success(tmp_path):
    test_file = tmp_path / "test.json"
    data = {"key": "value", "nested": [1, 2, 3]}
    
    atomic_write_json(str(test_file), data)
    
    assert test_file.exists()
    with open(test_file, 'r', encoding='utf-8') as f:
        loaded_data = json.load(f)
    assert loaded_data == data

def test_atomic_write_text_success(tmp_path):
    test_file = tmp_path / "test.txt"
    content = "Hello, Atomic World!"
    
    atomic_write_text(str(test_file), content)
    
    assert test_file.exists()
    assert test_file.read_text(encoding='utf-8') == content

def test_atomic_write_json_overwrite(tmp_path):
    test_file = tmp_path / "overwrite.json"
    test_file.write_text("initial content")
    
    new_data = {"status": "updated"}
    atomic_write_json(str(test_file), new_data)
    
    with open(test_file, 'r', encoding='utf-8') as f:
        loaded_data = json.load(f)
    assert loaded_data == new_data

def test_atomic_write_fails_on_invalid_dir():
    # Testing behavior when directory doesn't exist
    with pytest.raises(Exception):
        atomic_write_text("/non/existent/path/file.txt", "content")
