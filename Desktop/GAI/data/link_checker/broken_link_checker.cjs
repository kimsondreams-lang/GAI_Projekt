const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ARTICLES_DIR = path.join(__dirname, '../data/articles');
const IMAGES_DIR = path.join(__dirname, '../data/images/articles');
const OUTPUT_DIR = path.join(__dirname, '../data');
const AFFILIATE_TAG = 'kimsondreams-21';

const results = {
  scanDate: new Date().toISOString(),
  totalArticles: 0,
  totalLinks: 0,
  validLinks: 0,
  missingTag: 0,
  brokenLinks: 0,
  missingImages: 0,
  articles: []
};

function extractAmazonLinks(content) {
  const links = [];
  let start = 0;
  while (true) {
    const idx = content.indexOf('amazon.com', start);
    if (idx === -1) break;
    let urlStart = content.lastIndexOf('http', idx);
    if (urlStart === -1) { start = idx + 1; continue; }
    let urlEnd = content.length;
    const chars = [' ', '"', '<', '>', '\\n', '\\r'];
    for (const c of chars) {
      const pos = content.indexOf(c, urlStart);
      if (pos !== -1 && pos < urlEnd) urlEnd = pos;
    }
    const url = content.substring(urlStart, urlEnd);
    if (url.includes('amazon.com')) {
      links.push({
        url: url,
        hasTag: url.includes('tag=' + AFFILIATE_TAG),
        type: url.includes('/dp/') ? 'product' : 'search'
      });
    }
    start = idx + 1;
  }
  return links;
}

function extractImages(content) {
  const images = [];
  const imgRegex = /<img[^>]+src=[\"']([^\"']+)[\"'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1]);
  }
  return images;
}

function checkUrlStatus(url, timeout = 5000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', () => resolve({ status: 0, ok: false, error: true }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false, timeout: true }); });
  });
}

function checkImageExists(imagePath) {
  const fullPath = path.join(IMAGES_DIR, path.basename(imagePath));
  return fs.existsSync(fullPath);
}

async function scanArticles() {
  console.log('Amazon Link & Image Checker - Starting scan...');
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  results.totalArticles = files.length;
  console.log('Found ' + files.length + ' articles to scan');
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
      const article = JSON.parse(content);
      const links = extractAmazonLinks(article.content || '');
      const images = extractImages(article.content || '');
      const issues = [];
      
      results.totalLinks += links.length;
      
      for (const link of links) {
        if (!link.hasTag) {
          issues.push('Missing affiliate tag: ' + link.url);
          results.missingTag++;
        } else {
          const status = await checkUrlStatus(link.url);
          if (!status.ok) {
            issues.push('Broken link (' + status.status + '): ' + link.url);
            results.brokenLinks++;
          } else {
            results.validLinks++;
          }
        }
      }
      
      for (const img of images) {
        if (!img.startsWith('http') && !checkImageExists(img)) {
          issues.push('Missing image: ' + img);
          results.missingImages++;
        }
      }
      
      results.articles.push({
        id: article.id,
        file: file,
        linkCount: links.length,
        imageCount: images.length,
        issues: issues
      });
      
      if (issues.length > 0) {
        console.log('WARNING: ' + article.id + ': ' + issues.length + ' issue(s)');
        issues.forEach(i => console.log('  - ' + i));
      } else {
        console.log('OK: ' + article.id + ': ' + links.length + ' links, ' + images.length + ' images');
      }
    } catch (e) {
      console.log('ERROR: ' + file + ' - ' + e.message);
    }
  }
  
  return results;
}

(async () => {
  const scanResults = await scanArticles();
  
  const reportPath = path.join(OUTPUT_DIR, 'amazon_link_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(scanResults, null, 2));
  console.log('');
  console.log('===============================================================');
  console.log('SUMMARY');
  console.log('===============================================================');
  console.log('Total Articles: ' + scanResults.totalArticles);
  console.log('Total Links: ' + scanResults.totalLinks);
  console.log('Valid Links: ' + scanResults.validLinks);
  console.log('Missing Tag: ' + scanResults.missingTag);
  console.log('Broken Links: ' + scanResults.brokenLinks);
  console.log('Missing Images: ' + scanResults.missingImages);
  console.log('Articles with Issues: ' + scanResults.articles.filter(a => a.issues.length > 0).length);
  console.log('');
  console.log('Report saved to: ' + reportPath);
})();