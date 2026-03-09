import ftplib
from ftplib import FTP_TLS
import io

h, u, p = '89.116.53.41', 'u866168581.coolkee.fun', 'cedIMA098!'

def verify():
    try:
        ftps = FTP_TLS(timeout=60)
        ftps.connect(h, 21)
        ftps.login(u, p)
        ftps.prot_p()
        ftps.set_pasv(True)
        
        print('Connected to FTP.')
        
        # Check articles.json in public_html
        ftps.cwd('public_html')
        bio_idx = io.BytesIO()
        ftps.retrbinary('RETR articles.json', bio_idx.write)
        idx_content = bio_idx.getvalue().decode('utf-8')
        
        # Check specific article in public_html/articles
        ftps.cwd('articles')
        bio_art = io.BytesIO()
        ftps.retrbinary('RETR best-tech-gadgets-amazon-2025.json', bio_art.write)
        art_content = bio_art.getvalue().decode('utf-8')
        
        s25_in_idx = 'S25 Ultra' in idx_content
        s24_in_art = 'S24 Ultra' in art_content
        webp_in_art = '.webp' in art_content
        jpg_in_art = '.jpg' in art_content
        
        print(f'Verification Results:')
        print(f'- S25 Ultra in index: {s25_in_idx}')
        print(f'- S24 Ultra in article: {s24_in_art}')
        print(f'- WebP in article: {webp_in_art}')
        print(f'- JPG in article: {jpg_in_art}')
        
        if s24_in_art and webp_in_art and not s25_in_idx and not jpg_in_art:
            print('REMOTE_VERIFICATION_SUCCESS')
        else:
            print('REMOTE_VERIFICATION_FAILURE')
            
        ftps.quit()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    verify()
