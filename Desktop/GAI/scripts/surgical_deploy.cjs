const ftp = require('basic-ftp');
const path = require('path');

async function surgicalDeploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: process.env.FTP_HOST || '89.116.53.41',
            user: process.env.FTP_USER || 'u866168581.coolkee.fun',
            password: process.env.FTP_PASS || 'cedIMA098!',
            secure: false
        });
        
        console.log('✅ FTP Connected');

        const filesToUpload = [
            {
                local: 'public/data/articles/index.json',
                remote: '/public_html/kimsondreams/data/articles/index.json'
            },
            {
                local: 'public/data/articles/iphone-16-pro-max-review.json',
                remote: '/public_html/kimsondreams/data/articles/iphone-16-pro-max-review.json'
            },
            {
                local: 'public/images/articles/cover_iphone-16-pro-max-review_1772533819702.jpg',
                remote: '/public_html/kimsondreams/images/articles/cover_iphone-16-pro-max-review_1772533819702.jpg'
            }
        ];

        for (const file of filesToUpload) {
            console.log(`Uploading ${file.local} to ${file.remote}...`);
            await client.uploadFrom(file.local, file.remote);
        }

        console.log('🚀 Surgical Deployment Complete!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

surgicalDeploy();