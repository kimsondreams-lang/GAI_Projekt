
import ftp from 'basic-ftp';
import path from 'path';

async function checkImages() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    const config = {
        host: process.env.FTP_HOST || "89.116.53.41",
        user: process.env.FTP_USER || "u866168581.coolkee.fun",
        password: process.env.FTP_PASS || "cedIMA098!",
        secure: false
    };

    try {
        await client.access(config);
        console.log("✅ FTP Connected");

        const remoteDir = "/public_html/kimsondreams/images/articles";
        const list = await client.list(remoteDir);
        
        console.log(`Found ${list.length} files in ${remoteDir}:`);
        list.forEach(f => console.log(`- ${f.name} (${f.size} bytes)`));

    } catch (err) {
        console.error("❌ FTP Check Failed:", err);
    } finally {
        client.close();
    }
}

checkImages();
