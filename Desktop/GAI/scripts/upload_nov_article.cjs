const ftp = require('basic-ftp');
const path = require('path');

async function upload() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });
        console.log('Connected to FTP');

        // 1. Upload Article JSON
        const localArticle = path.join(process.cwd(), 'data/articles/black-friday-2026-ai-gaming-laptop-rtx-50-deal-guide.json');
        const remoteArticleDir = '/public_html/kimsondreams/data/articles';
        await client.ensureDir(remoteArticleDir);
        await client.uploadFrom(localArticle, 'black-friday-2026-ai-gaming-laptop-rtx-50-deal-guide.json');
        console.log('Article JSON uploaded');

        // 2. Upload Image
        const localImage = path.join(process.cwd(), 'data/images/articles/black-friday-2026-main.jpg');
        const remoteImageDir = '/public_html/kimsondreams/images/articles';
        await client.ensureDir(remoteImageDir);
        await client.uploadFrom(localImage, 'black-friday-2026-main.jpg');
        console.log('Article Image uploaded');

        console.log('Full upload successful');
    } catch (err) {
        console.error('FTP Error:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}
upload();
