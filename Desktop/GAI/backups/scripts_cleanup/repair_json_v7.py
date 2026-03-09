import os

path = '/Users/jakubnetza/Desktop/GAI/data/articles/best-mechanical-keyboards-2025.json'
if os.path.exists(path):
    with open(path, 'rb') as f:
        content = f.read()
    
    # The error is 'Invalid \\escape' at line 16. 
    # We saw in sed: href=\\\"\\1\\\" (after some previous perl/sed attempts)
    # Or href='\\1' originally.
    # We will look for the byte sequence for backslash (\) followed by 1.
    # Backslash is 0x5c, '1' is 0x31.
    
    target = b'\\1' 
    replacement = b'https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21'
    
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'wb') as f:
            f.write(new_content)
        print('SUCCESS: Replaced literal \\1 with URL')
    else:
        # Try finding it with double backslash if previous attempts escaped it
        target2 = b'\\\\1'
        if target2 in content:
            new_content = content.replace(target2, replacement)
            with open(path, 'wb') as f:
                f.write(new_content)
            print('SUCCESS: Replaced literal \\\\1 with URL')
        else:
            print('ERROR: Target sequence not found in binary mode')
else:
    print('ERROR: File not found')
