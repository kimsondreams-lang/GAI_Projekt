import json
import os
import re

articles_dir = '/Users/jakubnetza/Desktop/GAI/data/articles'

# Em-dash UTF-8 bytes: E2 80 94
# When corrupted, shows as M-^@M-^T which is 0xE2 0x80 0x94 but interpreted wrongly
# We need to find and replace the corrupted pattern

def fix_file(filepath):
    with open(filepath, 'rb') as f:
        raw_bytes = f.read()
    
    # Try to decode as UTF-8 first
    try:
        content = raw_bytes.decode('utf-8')
        json.loads(content)
        print(f'OK: {os.path.basename(filepath)}')
        return True
    except:
        pass
    
    # The corrupted em-dash shows as \xe2\x80\x94 but might be double-encoded
    # Let's try to fix common patterns
    
    # Pattern 1: Replace raw em-dash bytes that got corrupted
    # M-^@M-^T in cat -v is actually 0xE2 0x80 0x94 (proper UTF-8 em-dash)
    # But if it's showing as garbage, it might be latin-1 interpreted
    
    # Try decoding as latin-1 and look for the pattern
    try:
        content_latin = raw_bytes.decode('latin-1')
        # Replace the corrupted em-dash pattern
        # The pattern M-^@M-^T is \xe2\x80\x94 in latin-1
        fixed = content_latin.replace('\xe2\x80\x94', '—')
        
        # Also fix other common issues
        fixed = fixed.replace('\xe2\x80\x9c', '"')  # left double quote
        fixed = fixed.replace('\xe2\x80\x9d', '"')  # right double quote
        fixed = fixed.replace('\xe2\x80\x99', "'")  # right single quote
        
        # Try to parse as JSON
        json.loads(fixed)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'FIXED: {os.path.basename(filepath)}')
        return True
    except Exception as e:
        pass
    
    # Try another approach - find the actual bad bytes
    try:
        content = raw_bytes.decode('utf-8', errors='replace')
        # Look for replacement character followed by specific patterns
        fixed = content.replace('', '')
        json.loads(fixed)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'FIXED (cleaned): {os.path.basename(filepath)}')
        return True
    except Exception as e:
        print(f'FAILED: {os.path.basename(filepath)} - {e}')
        return False

failed = []
for f in os.listdir(articles_dir):
    if f.endswith('.json') and f != 'index.json':
        filepath = os.path.join(articles_dir, f)
        if not fix_file(filepath):
            failed.append(f)

print(f'\nSummary: {len(failed)} files still broken')
for f in failed:
    print(f'  - {f}')
