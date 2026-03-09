const HEADERS = () => {
    return {
        'Content-Type': 'application/json'
    };
};
export const ftpService = {
    // NEW: List files on the actual server disk (bypassing VFS cache)
    listLocal: async (path) => {
        const res = await fetch('/api/fs/list', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FS List Failed');
        return await res.json();
    },
    listFiles: async (path) => {
        const res = await fetch('/api/ftp/list', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP List Failed');
        const data = await res.json();
        // Map basic-ftp FileInfo to our interface
        return data.map((f) => ({
            name: f.name,
            size: f.size,
            rawModifiedAt: f.rawModifiedAt,
            isDirectory: f.type === 2 // basic-ftp type 2 is directory
        }));
    },
    upload: async (localPath, remotePath) => {
        const res = await fetch('/api/ftp/upload', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ localPath, remotePath })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP Upload Failed');
        return await res.json();
    },
    download: async (remotePath, localDir, isDirectory = false) => {
        const res = await fetch('/api/ftp/download', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ remotePath, localDir, isDirectory })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP Download Failed');
        return await res.json();
    },
    createDir: async (path) => {
        const res = await fetch('/api/ftp/mkdir', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP Mkdir Failed');
        return await res.json();
    },
    delete: async (path) => {
        const res = await fetch('/api/ftp/delete', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP Delete Failed');
        return await res.json();
    },
    rename: async (path, newPath) => {
        const res = await fetch('/api/ftp/rename', {
            method: 'POST',
            headers: HEADERS(),
            body: JSON.stringify({ path, newPath })
        });
        if (!res.ok)
            throw new Error((await res.json()).error || 'FTP Rename Failed');
        return await res.json();
    }
};
