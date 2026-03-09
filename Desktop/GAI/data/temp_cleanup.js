const ftp = require('basic-ftp');
require('dotenv').config({ path: '.env.local' });

async function cleanup() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_HOST || 'kimsondreams.fun',
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: false
        });
        console.log('✅ Connected');
        const remoteDir = '/public_html/kimsondreams/data/articles';
        await client.cd(remoteDir);
        const list = await client.list();
        const stale = list.filter(f => f.name.startsWith('.in.'));
        console.log('Found ' + stale.length + ' stale files');
        for (const f of stale) {
            console.log('Deleting ' + f.name);
            await client.remove(f.name);
        }
        console.log('✅ Cleanup Done');
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}
cleanup();