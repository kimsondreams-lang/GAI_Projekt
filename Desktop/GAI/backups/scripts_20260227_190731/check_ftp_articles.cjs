const ftp = require('basic-ftp');
require('dotenv').config();

async function checkArticles() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: process.env.FTP_PASSWORD || '###',
            secure: false
        });
        console.log('✅ FTP Connected');
        const list = await client.list('/public_html/kimsondreams/articles');
        console.log('Files in articles directory:', list.length);
        list.forEach(f => console.log(f.name, f.size));
        if (list.length === 0) {
            console.log('⚠️ Directory is empty!');
        }
    } catch(e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.close();
    }
}

checkArticles();
