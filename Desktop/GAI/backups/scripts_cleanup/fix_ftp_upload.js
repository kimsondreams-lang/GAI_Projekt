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
        
        console.log('✅ FTP Connected');
        
        // Remove temporary file
        await client.cd('/public_html/kimsondreams/images/articles');
        try {
            await client.remove('.in.apple-airpods-pro-2.jpg.');
            console.log('✅ Removed temp file');
        } catch (e) {
            console.log('⚠️ Temp file not found or already removed');
        }
        
        // Upload index.json
        await client.cd('/public_html/kimsondreams/data/articles');
        await client.uploadFrom('/Users/jakubnetza/Desktop/GAI/temp_blog_fix/data/articles/index.json', 'index.json');
        console.log('✅ index.json uploaded');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.close();
    }
}

fixAndUpload();
