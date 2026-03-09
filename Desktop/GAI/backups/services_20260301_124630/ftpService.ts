
import { db } from './memoryService';

const HEADERS = () => {
    return {
        'Content-Type': 'application/json'
    };
};

export interface FTPFile {
    name: string;
    type: 1 | 2; // 1=File, 2=Dir (basic-ftp convention roughly) or we map it
    size: number;
    rawModifiedAt: string;
    isDirectory: boolean;
}

export const ftpService = {
    
    // NEW: List files on the actual server disk (bypassing VFS cache)
    listLocal: async (path: string): Promise<any[]> => {
        const res = await fetch('/api/fs/list', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FS List Failed');
        return await res.json();
    },

    listFiles: async (path: string): Promise<FTPFile[]> => {
        const res = await fetch('/api/ftp/list', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP List Failed');
        const data = await res.json();
        // Map basic-ftp FileInfo to our interface
        return data.map((f: any) => ({
            name: f.name,
            size: f.size,
            rawModifiedAt: f.rawModifiedAt,
            isDirectory: f.type === 2 // basic-ftp type 2 is directory
        }));
    },

    upload: async (localPath: string, remotePath: string) => {
        const res = await fetch('/api/ftp/upload', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ localPath, remotePath })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP Upload Failed');
        return await res.json();
    },

    download: async (remotePath: string, localDir: string, isDirectory: boolean = false) => {
        const res = await fetch('/api/ftp/download', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ remotePath, localDir, isDirectory })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP Download Failed');
        return await res.json();
    },

    createDir: async (path: string) => {
        const res = await fetch('/api/ftp/mkdir', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP Mkdir Failed');
        return await res.json();
    },

    delete: async (path: string) => {
        const res = await fetch('/api/ftp/delete', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP Delete Failed');
        return await res.json();
    },
    
    rename: async (path: string, newPath: string) => {
        const res = await fetch('/api/ftp/rename', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path, newPath })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'FTP Rename Failed');
        return await res.json();
    }
};
