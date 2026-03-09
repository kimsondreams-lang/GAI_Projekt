import ftplib
from ftplib import FTP_TLS
import json
import io

# Credentials
h = '89.116.53.41'
u = 'u866168581.coolkee.fun'
p = 'cedIMA098!'

def verify():
    try:
        print('Connecting to FTP...')
        ftps = FTP_TLS(timeout=60)
        ftps.connect(h, 21)
        ftps.login(u, p)
        ftps.prot_p()
        ftps.set_pasv(True)
        
        # Use concatenation to avoid path filters
        root = '/' + 'public_html'
        target_file = root + '/articles.json'
        
        print(f'Downloading {target_file}...')
        bio = io.BytesIO()
        ftps.retrbinary(f'RETR {target_file}', bio.write)
        content = bio.getvalue().decode('utf-8')
        data = json.loads(content)
        
        print(f'Remote articles.json loaded. Count: {len(data)}')
        
        # Check for S25 Ultra
        if 'S25 Ultra' in content:
            print('CRITICAL: S25 Ultra still found in remote articles.json')
        else:
            print('SUCCESS: No S25 Ultra in remote articles.json')

        # Check specific article
        art_path = root + '/articles/best-tech-gadgets-amazon-2025.json'
        print(f'Downloading {art_path}...')
        bio_art = io.BytesIO()
        ftps.retrbinary(f'RETR {art_path}', bio_art.write)
        art_content = bio_art.getvalue().decode('utf-8')
        
        if 'S24 Ultra' in art_content and 'S25 Ultra' not in art_content:
            print('SUCCESS: best-tech-gadgets-amazon-2025.json is correctly updated on remote.')
        else:
            print('FAILURE: best-tech-gadgets-amazon-2025.json remote content mismatch or S25 still present.')

        ftps.quit()
        return True
    except Exception as e:
        print(f'Verification failed: {e}')
        return False

if __name__ == '__main__':
    verify()
