const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

async function uploadIndex() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: '89.116.53.41',
            port: 21,
            user: 'u866168581.coolkee.fun',
            password: 'Kubaweb12!@'
        });
        
        console.log('✅ FTP Connected');
        
        // Navigate to articles directory
        await client.ensureDir('/public_html/kimsondreams/data/articles');
        
        // Upload index.json
        const localPath = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/data/articles/index.json';
        await client.uploadFrom(localPath, 'index.json');
        console.log('✅ index.json uploaded successfully');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.close();
    }
}

uploadIndex();
