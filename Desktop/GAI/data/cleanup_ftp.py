#!/usr/bin/env python3
import ftplib
import os
import sys

def cleanup_ftp():
    host = os.environ.get('FTP_HOST', 'kimsondreams.fun')
    user = os.environ.get('FTP_USER')
    password = os.environ.get('FTP_PASS')
    
    if not user or not password:
        print("❌ FTP credentials missing!")
        sys.exit(1)
    
    try:
        ftp = ftplib.FTP(host)
        ftp.login(user, password)
        print("✅ FTP Connected")
        
        # Navigate to articles directory
        ftp.cwd('/public_html/kimsondreams/data/articles')
        print("📁 In articles directory")
        
        # List files
        files = ftp.nlst()
        in_files = [f for f in files if f.startswith('.in.')]
        
        print(f"Found {len(in_files)} stale .in.* files")
        
        for f in in_files:
            try:
                ftp.delete(f)
                print(f"✅ Removed: {f}")
            except Exception as e:
                print(f"❌ Failed to remove {f}: {e}")
        
        print("🧹 Cleanup complete!")
        ftp.quit()
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    cleanup_ftp()
