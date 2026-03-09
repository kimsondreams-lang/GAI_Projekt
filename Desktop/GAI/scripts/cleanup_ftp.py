#!/usr/bin/env python3
"""Clean up stale .in. files from FTP server using manual env parsing."""
import os
from ftplib import FTP

def load_env_manual(filepath):
    env_vars = {}
    if not os.path.exists(filepath):
        return env_vars
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    return env_vars

def cleanup_ftp():
    env = load_env_manual('.env.local')
    host = env.get('FTP_HOST', '89.116.53.41')
    user = env.get('FTP_USER')
    password = env.get('FTP_PASS')
    
    if not user or not password:
        print("Error: FTP_USER or FTP_PASS not found in .env.local.")
        return

    print(f"Connecting to FTP {host} as {user}...")
    try:
        ftp = FTP(host)
        ftp.login(user, password)
        print("Connected successfully")
        
        target_dir = '/public_html/kimsondreams/data/articles'
        try:
            ftp.cwd(target_dir)
            print(f"Navigated to {target_dir}")
        except:
            print(f"Could not navigate to {target_dir}")
            return
        
        files = ftp.nlst()
        stale_files = [f for f in files if f.startswith('.in.')]
        print(f"Found {len(stale_files)} stale .in. files")
        
        for filename in stale_files:
            print(f"Deleting: {filename}")
            try:
                ftp.delete(filename)
                print("  Deleted successfully")
            except Exception as e:
                print(f"  Error deleting {filename}: {e}")
        
        print("Cleanup complete")
        ftp.quit()
    except Exception as e:
        print(f"FTP Error: {e}")

if __name__ == '__main__':
    cleanup_ftp()
