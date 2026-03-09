import ftp from 'basic-ftp';

async function fix() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: false
        });
        console.log('Connected to FTP');
        const fileToDelete = '/public_html/kimsondreams/articles/.in.iphone-17-vs-samsung-s25.json.';
        console.log('Attempting to delete:', fileToDelete);
        await client.remove(fileToDelete);
        console.log('Successfully deleted blocking file');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        client.close();
    }
}

