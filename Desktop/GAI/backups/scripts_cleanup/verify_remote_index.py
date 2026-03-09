import os
from ftplib import FTP_TLS
import json

def verify_index():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_path = '/public_html/kimsondreams/articles.json'

    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=30)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        
        print(f'Downloading {remote_path}...')
        content = []
        ftps.retrbinary(f'RETR {remote_path}', content.append)
        full_content = b''.join(content).decode('utf-8')
        
        data = json.loads(full_content)
        # Check if it's an array or object with articles property
        articles = data if isinstance(data, list) else data.get('articles', [])
        
        target_id = 'pixel-10a-vs-iphone-se-4-comparison'
        found = any(a.get('id') == target_id for a in articles)
        
        if found:
            print(f'SUCCESS: Article {target_id} found in remote index.')
        else:
            print(f'FAILURE: Article {target_id} NOT found in remote index.')
            # Print last 3 articles for context
            print('Last 3 articles in index:')
            for a in articles[-3:]:
                print(f"- {a.get('id')} ({a.get('date')})")

    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    verify_index()