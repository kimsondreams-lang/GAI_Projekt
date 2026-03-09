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
        const localFile = path.join(process.cwd(), 'temp_ftp_blog/articles.json');
        await client.uploadFrom(localFile, '/public_html/articles.json');
        console.log('Upload successful');
    } catch (err) {
        console.error('FTP Error:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}
upload();
