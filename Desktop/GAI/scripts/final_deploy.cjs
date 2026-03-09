const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    client.ftp.timeout = 300000;

    const config = {
        host: process.env.FTP_HOST || '89.116.53.41',
        user: process.env.FTP_USER || 'u866168581.coolkee.fun',
        password: process.env.FTP_PASS || 'cedIMA098!',
        secure: false
    };

    try {
        await client.access(config);
        console.log('✅ FTP Connected');

        const remoteRoot = '/public_html/kimsondreams';
        const localRoot = path.resolve(__dirname, '..', 'public');

        console.log(`🚀 Deploying from ${localRoot} to ${remoteRoot}`);

        // 1. Upload CSS (Critical for the task)
        await client.ensureDir(`${remoteRoot}/css`);
        await client.uploadFromDir(path.join(localRoot, 'css'), `${remoteRoot}/css`);
        console.log('✅ CSS Uploaded');

        // 2. Upload JS
        await client.ensureDir(`${remoteRoot}/js`);
        await client.uploadFromDir(path.join(localRoot, 'js'), `${remoteRoot}/js`);
        console.log('✅ JS Uploaded');

        // 3. Upload Articles Data
        await client.ensureDir(`${remoteRoot}/data/articles`);
        await client.uploadFromDir(path.join(localRoot, 'data/articles'), `${remoteRoot}/data/articles`);
        console.log('✅ Articles Data Uploaded');

        // 4. Upload HTML Files
        await client.uploadFrom(path.join(localRoot, 'index.html'), `${remoteRoot}/index.html`);
        await client.uploadFrom(path.join(localRoot, 'article.html'), `${remoteRoot}/article.html`);
        console.log('✅ HTML Files Uploaded');

        // 5. Upload Root articles.json if exists
        if (fs.existsSync(path.join(localRoot, 'articles.json'))) {
            await client.uploadFrom(path.join(localRoot, 'articles.json'), `${remoteRoot}/articles.json`);
            console.log('✅ Root articles.json Uploaded');
        }

        console.log('🚀 FULL DEPLOYMENT COMPLETE!');
    } catch (err) {
        console.error('❌ Deployment Failed:', err.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();