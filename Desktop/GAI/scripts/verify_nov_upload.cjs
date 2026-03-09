const ftp = require('basic-ftp');

async function verify() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: '89.116.53.41',
            user: 'u866168581.coolkee.fun',
            password: 'cedIMA098!',
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });
        console.log('Connected to FTP');

        console.log('\nChecking Article JSON:');
        const articles = await client.list('/public_html/kimsondreams/data/articles');
        const articleFound = articles.find(f => f.name === 'black-friday-2026-ai-gaming-laptop-rtx-50-deal-guide.json');
        console.log(articleFound ? `✅ Found: ${articleFound.name} (${articleFound.size} bytes)` : '❌ Article JSON NOT found');

        console.log('\nChecking Article Image:');
        const images = await client.list('/public_html/kimsondreams/images/articles');
        const imageFound = images.find(f => f.name === 'black-friday-2026-main.jpg');
        console.log(imageFound ? `✅ Found: ${imageFound.name} (${imageFound.size} bytes)` : '❌ Article Image NOT found');

        console.log('\nChecking Root Index:');
        const rootFiles = await client.list('/public_html');
        const indexFound = rootFiles.find(f => f.name === 'articles.json');
        console.log(indexFound ? `✅ Found: ${indexFound.name} (${indexFound.size} bytes)` : '❌ Root articles.json NOT found');

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        client.close();
    }
}
verify();
