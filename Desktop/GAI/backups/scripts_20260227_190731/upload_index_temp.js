const ftp = require('basic-ftp');
const path = require('path');

async function uploadIndex() {
  const client = new ftp.Client();
  try {
    await client.access({
      host: '89.116.53.41',
      user: 'u866168581.coolkee.fun',
      password: 'cedIMA098!'
    });
    
    const localPath = path.join(process.cwd(), 'data/articles/index.json');
    const remotePath = '/public_html/kimsondreams/data/articles/index.json';
    
    console.log('Uploading index.json to FTP...');
    await client.uploadFrom(localPath, remotePath);
    console.log('✅ index.json uploaded successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  }
  client.close();
}

uploadIndex();
