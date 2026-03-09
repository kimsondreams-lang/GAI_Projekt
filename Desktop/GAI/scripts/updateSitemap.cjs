const fs = require('fs');
const path = require('path');

const articlesDir = path.resolve(__dirname, '../data/articles');
const outPath = path.resolve(__dirname, '../dist/sitemap.xml');

function genUrls() {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json') && !f.includes('index') && !f.includes('affiliate'));
  const urls = [{
    loc: 'https://kimsondreams.com/',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0'
  }];
  
  for (const f of files) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(articlesDir, f), 'utf8'));
      if (a.id && a.date) {
        urls.push({
          loc: 'https://kimsondreams.com/article/' + a.id,
          lastmod: a.date,
          changefreq: 'monthly',
          priority: '0.8'
        });
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
  return urls;
}

function genSitemap() {
  const urls = genUrls();
  let xml = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n';
  xml += '<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n';
  
  for (const u of urls) {
    xml += '  <url>\n';
    xml += '    <loc>' + u.loc + '</loc>\n';
    xml += '    <lastmod>' + u.lastmod + '</lastmod>\n';
    xml += '    <changefreq>' + u.changefreq + '</changefreq>\n';
    xml += '    <priority>' + u.priority + '</priority>\n';
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('Generated sitemap with ' + urls.length + ' URLs');
  return urls.length;
}

module.exports = { updateSitemap: genSitemap };
if (require.main === module) {
  genSitemap();
}
