const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const snapshotsDir = path.join(__dirname, 'snapshots');
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

    const targets = [
        { name: 'live_index', url: 'https://coolkee.fun/kimsondreams/index.html' },
        { name: 'live_article_stress', url: 'https://coolkee.fun/kimsondreams/index.html?id=stress-test-2025' }
    ];

    try {
        for (const target of targets) {
            console.log(`Capturing ${target.name} from ${target.url}...`);
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
            // Wait for dynamic content and scroll to trigger lazy loading
            await autoScroll(page);
            await new Promise(r => setTimeout(r, 2000)); // Final settle time
            await page.screenshot({ path: path.join(snapshotsDir, `${target.name}.png`), fullPage: true });
        }
        console.log('Screenshots saved successfully to data/snapshots/');
    } catch (err) {
        console.error('Capture failed:', err.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();