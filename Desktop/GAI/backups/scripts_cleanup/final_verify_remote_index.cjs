const ftp = require('basic-ftp');
const fs = require('fs');

async function verify() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });
        console.log('Connected to FTP');

        const remotePath = '/public_html/articles.json';
        const localPath = 'temp_remote_index.json';
        
        await client.downloadTo(localPath, remotePath);
        const content = fs.readFileSync(localPath, 'utf8');
        const index = JSON.parse(content);
        
        const targetId = 'black-friday-2026-ai-gaming-laptop-rtx-50-deal-guide.json';
        const found = index.includes(targetId);
        
        console.log(`Remote index check for ${targetId}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        
        if (found) {
            console.log('Verification successful. The article is indexed on the production server.');
        }

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        client.close();
    }
}
verify();
