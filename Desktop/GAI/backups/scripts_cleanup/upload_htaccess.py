import ftplib
from ftplib import FTP_TLS

host = '89.116.53.41'
user = 'u866168581.coolkee.fun'
password = 'cedIMA098!'

print(f"Connecting to {host}...")
ftps = FTP_TLS(timeout=90)
ftps.connect(host, 21)
ftps.login(user, password)
ftps.prot_p()
ftps.set_pasv(True)

# Navigate to data/articles
print("Navigating to /public_html/kimsondreams/data/articles")
ftps.cwd('/public_html/kimsondreams/data/articles')

# Upload .htaccess
htaccess_path = 'temp_blog_fix/.htaccess'
print(f"Uploading {htaccess_path}...")
with open(htaccess_path, 'rb') as f:
    ftps.storbinary('STOR .htaccess', f)
    print('.htaccess uploaded successfully')

ftps.quit()
print("Done.")
