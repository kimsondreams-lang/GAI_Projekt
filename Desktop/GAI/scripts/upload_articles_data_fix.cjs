const ftp = require('basic-ftp');

async function upload() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: false
        });
        console.log('FTP Connected');
        await client.uploadFrom('public/js/articles-data.js', '/public_html/kimsondreams/js/articles-data.js');
        console.log('FTP_UPLOAD_SUCCESS: js/articles-data.js');
    } catch (e) {
        console.error('FTP Error:', e);
    } finally {
        client.close();
    }
}

upload();