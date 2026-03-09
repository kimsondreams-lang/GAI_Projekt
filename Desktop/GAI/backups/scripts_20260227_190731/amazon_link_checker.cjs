const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '../data/articles');
const OUTPUT_DIR = path.join(__dirname, '../data');
const AFFILIATE_TAG = 'kimsondreams-21';

const results = {
  scanDate: new Date().toISOString(),
  totalArticles: 0,
  totalLinks: 0,
  validLinks: 0,
  missingTag: 0,
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
    const chars = [' ', '\"', '<', '>', '\n', '\r'];
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

function scanArticles() {
  console.log('Amazon Link Checker - Starting scan...');
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  results.totalArticles = files.length;
  console.log('Found ' + files.length + ' articles to scan');
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
      const article = JSON.parse(content);
      const links = extractAmazonLinks(article.content || '');
      results.totalLinks += links.length;
      const issues = [];
      
      links.forEach(link => {
        if (!link.hasTag) {
          issues.push('Missing tag: ' + link.url);
          results.missingTag++;
        } else {
          results.validLinks++;
        }
      });
      
      results.articles.push({
        id: article.id,
        file: file,
        linkCount: links.length,
        issues: issues
      });
      
      if (issues.length > 0) {
        console.log('WARNING: ' + article.id + ': ' + issues.length + ' issue(s)');
      } else {
        console.log('OK: ' + article.id + ': ' + links.length + ' links');
      }
    } catch (e) {
      console.log('ERROR: ' + file + ' - ' + e.message);
    }
  });
  
  return results;
}

const scanResults = scanArticles();

// Save report to file
const reportPath = path.join(OUTPUT_DIR, 'amazon_link_report.json');
fs.writeFileSync(reportPath, JSON.stringify(scanResults, null, 2));
console.log('');
console.log('==================================================');
console.log('SUMMARY');
console.log('==================================================');
console.log('Total Articles: ' + scanResults.totalArticles);
console.log('Total Links: ' + scanResults.totalLinks);
console.log('Valid Links: ' + scanResults.validLinks);
console.log('Missing Tag: ' + scanResults.missingTag);
console.log('Articles with Issues: ' + scanResults.articles.filter(a => a.issues.length > 0).length);
console.log('');
console.log('Report saved to: ' + reportPath);
