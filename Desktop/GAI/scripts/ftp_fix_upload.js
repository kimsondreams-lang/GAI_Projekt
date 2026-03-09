const ftp = require('basic-ftp');

async function fixAndUpload() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: '89.116.53.41',
            port: 21,
            user: 'u866168581.coolkee.fun',
            password: 'Kubaweb12!@'
        });
        
        console.log('FTP Connected');
        
        // Try to remove temp file
        try {
            await client.cd('/public_html/kimsondreams/images/articles');
            await client.remove('.in.apple-airpods-pro-2.jpg.');
            console.log('Removed temp file');
        } catch (e) {
            console.log('Temp file not found:', e.message);
        }
        
        // Upload index.json
        await client.ensureDir('/public_html/kimsondreams/data/articles');
        const localIndex = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/data/articles/index.json';
        await client.uploadFrom(localIndex, 'index.json');
        console.log('index.json uploaded successfully');
        
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

fixAndUpload();
