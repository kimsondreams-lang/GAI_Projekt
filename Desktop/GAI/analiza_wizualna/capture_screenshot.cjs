/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshot(url, outputPath) {
    console.log(`Launching browser...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        // Set viewport to desktop size
        await page.setViewport({ width: 1920, height: 1080 });
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait a bit for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Capturing screenshot to ${outputPath}...`);
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log('Screenshot saved.');
    } finally {
        await browser.close();
    }
}

const url = process.argv[2] || 'https://technova.buzz';
const customPath = process.argv[3];
const outputDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = customPath || path.join(outputDir, 'technova-buzz-' + new Date().toISOString().replace(/[:.]/g, '-') + '.png');

captureScreenshot(url, outputPath).then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
