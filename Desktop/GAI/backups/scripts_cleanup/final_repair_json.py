import ast
import json
import os

path = 'data/articles/apple-watch-ultra-2-review.json'
def repair():
    if not os.path.exists(path):
        print(f'File {path} not found')
        return
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        data = None
        # Method 1: Standard JSON
        try:
            data = json.loads(content)
        except:
            pass
            
        # Method 2: Python Literal (Single Quotes)
        if data is None:
            try:
                data = ast.literal_eval(content)
            except:
                pass
        
        # Method 3: Double Encoded String
        if data is None:
            try:
                data = json.loads(json.loads(content))
            except:
                pass
                
        if data is not None:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f'Successfully repaired {path}')
        else:
            print(f'Could not parse {path} with any method')
            # Emergency: if it looks like a string, just write it out
            if content.startswith('{') and content.endswith('}'):
                 print('Content looks like JSON but failed parsing. Check manually.')

    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    repair()
