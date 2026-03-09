import os
from ftplib import FTP_TLS

def verify():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_root = '/public_html/kimsondreams/'

    ftps = FTP_TLS(timeout=60)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)

        print(f"Checking root for articles.json...")
        ftps.cwd(remote_root)
        files = ftps.nlst()
        if 'articles.json' in files:
            print("SUCCESS: articles.json found in root.")
        else:
            print("FAILURE: articles.json NOT found in root.")

        print(f"Checking data/articles/ for June article...")
        ftps.cwd(f"{remote_root}data/articles/")
        files = ftps.nlst()
        if 'june-2026-tech-guide-wwdc-rumors.json' in files:
            print("SUCCESS: June article JSON found.")
        else:
            print("FAILURE: June article JSON NOT found.")

        print(f"Checking images/articles/ for June image...")
        ftps.cwd(f"{remote_root}images/articles/")
        files = ftps.nlst()
        if 'june-2026-tech-guide-main.jpg' in files:
            print("SUCCESS: June article image found.")
        else:
            print("FAILURE: June article image NOT found.")

    except Exception as e:
        print(f"Verification Error: {e}")
    finally:
        try: ftps.quit()
        except: pass

if __name__ == '__main__':
    verify()