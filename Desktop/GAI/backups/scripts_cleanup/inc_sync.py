import os, ftplib, time, sys
from ftplib import FTP_TLS
def up(ld, rd, ex):
 try:
  ftps = FTP_TLS('89.116.53.41', timeout=60)
  ftps.connect('89.116.53.41', 21)
  ftps.login('u866168581.coolkee.fun', 'cedIMA098!')
  ftps.prot_p()
  ftps.cwd(rd)
  rem = set(ftps.nlst())
  loc = [x for x in os.listdir(ld) if x.endswith(ex) and x != 'index.json']
  print(f'Syncing {rd}: {len(loc)} local, {len(rem)} remote')
  for f in loc:
   if f not in rem:
    with open(os.path.join(ld, f), 'rb') as fp: ftps.storbinary('STOR '+f, fp)
    print('Uploaded: '+f); sys.stdout.flush(); time.sleep(0.1)
  ftps.quit()
 except Exception as e: print(f'Error in {rd}: {e}')
up('data/articles', '/public_html/articles', '.json')
up('data/images/articles', '/public_html/images/articles', '.webp')
# Final Index
try:
 ftps = FTP_TLS('89.116.53.41')
 ftps.login('u866168581.coolkee.fun', 'cedIMA098!')
 ftps.prot_p()
 ftps.cwd('/public_html')
 with open('data/articles/index.json', 'rb') as f: ftps.storbinary('STOR articles.json', f)
 print('Index updated.'); ftps.quit()
except Exception as e: print(f'Index error: {e}')
