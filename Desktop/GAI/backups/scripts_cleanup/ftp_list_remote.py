#!/usr/bin/env python3
import os
from ftplib import FTP

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    env[k] = v.strip('"').strip("'")
    return env

env = load_env('.env.local')
FTP_HOST = env.get('FTP_HOST')
FTP_USER = env.get('FTP_USER')
FTP_PASS = env.get('FTP_PASS')

ftp = FTP(FTP_HOST)
ftp.login(FTP_USER, FTP_PASS)

print("=== ROOT (/public_html/kimsondreams/) ===")
ftp.cwd('/public_html/kimsondreams/')
for line in ftp.retrlines('LIST'):
    print(line)

print("\n=== /articles/ ===")
try:
    ftp.cwd('/public_html/kimsondreams/articles/')
    for line in ftp.retrlines('LIST'):
        print(line)
except Exception as e:
    print(f"Error: {e}")

print("\n=== /data/ ===")
try:
    ftp.cwd('/public_html/kimsondreams/data/')
    for line in ftp.retrlines('LIST'):
        print(line)
except Exception as e:
    print(f"Error: {e}")

print("\n=== /data/articles/ ===")
try:
    ftp.cwd('/public_html/kimsondreams/data/articles/')
    for line in ftp.retrlines('LIST'):
        print(line)
except Exception as e:
    print(f"Error: {e}")

ftp.quit()
print("\nDone.")
