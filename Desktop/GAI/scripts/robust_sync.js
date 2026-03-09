import ftp from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_ROOT = path.resolve(__dirname, '../temp_ftp_blog');

async function sync() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    client.ftp.timeout = 120000;
    
    try {
        console.log('Connecting to FTP server...');
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: false
        });

        console.log('Connected. Starting upload from ' + LOCAL_ROOT + ' to /public_html/kimsondreams');
        
        // uploadFromDir is atomic-like and handles directory creation
        await client.uploadFromDir(LOCAL_ROOT, '/public_html/kimsondreams');
        
        console.log('Sync completed successfully');
    } catch (err) {
        console.error('FTP Sync Error:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

sync().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
