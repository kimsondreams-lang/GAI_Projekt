/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshot(url, outputPath) {
    console.log(`Launching browser (Mobile)...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        // Set viewport to mobile size (iPhone X/12/13/14/15/16 standard)
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`Capturing mobile screenshot to ${outputPath}...`);
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log('Mobile screenshot saved.');
    } finally {
        await browser.close();
    }
}

const url = process.argv[2] || 'https://technova.buzz';
const outputDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'technova-buzz-mobile-' + new Date().toISOString().replace(/[:.]/g, '-') + '.png');

captureScreenshot(url, outputPath).then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});