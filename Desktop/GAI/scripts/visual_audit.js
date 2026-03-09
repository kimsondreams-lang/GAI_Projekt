import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  port: 4001,
  publicDir: process.env.AUDIT_PUBLIC_DIR || path.resolve(process.cwd(), 'public'),
  outputDir: path.resolve(process.cwd(), 'data', 'snapshots'),
  viewports: [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 667 }
  ],
  affiliateTag: 'kimsondreams-21'
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function runAudit() {
  console.log('[VISUAL_AUDIT] Starting audit from: ' + CONFIG.publicDir);
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const app = express();
  
  // Logging & Debug Middleware
  app.use((req, res, next) => {
    const cleanPath = req.path.split('?')[0];
    const fullPath = path.join(CONFIG.publicDir, cleanPath);
    const exists = fs.existsSync(fullPath);
    console.log(`[AUDIT_SERVER] ${req.method} ${req.url} -> ${fullPath} (Exists: ${exists})`);
    
    if (!exists && cleanPath.includes('/data/articles/')) {
        console.error(`[AUDIT_SERVER] CRITICAL MISSING FILE: ${fullPath}`);
    }
    next();
  });

  app.use('/api', (req, res) => res.status(200).json({ status: 'ok' }));
  app.use(express.static(CONFIG.publicDir));

  let server;
  let browser;
  try {
    server = app.listen(CONFIG.port, '127.0.0.1', () => {
      console.log('[VISUAL_AUDIT] Server running on http://127.0.0.1:' + CONFIG.port);
    });

    const baseUrl = 'http://127.0.0.1:' + CONFIG.port;
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = { errors: [], warnings: [], screenshots: [], articlesAudited: 0, timestamp: new Date().toISOString() };
    const page = await browser.newPage();

    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      if (status >= 400 && !url.includes('analytics') && !url.includes('/api/analytics/collect')) {
        results.errors.push(`[${status}] ${url}`);
      }
    });

    let articles = [];
    try {
      const indexPath = path.join(CONFIG.publicDir, 'data', 'articles', 'index.json');
      articles = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
      results.errors.push('Index Load Error: ' + e.message);
    }

    const urls = [
      { name: 'index', url: baseUrl + '/' },
      ...articles.slice(0, 3).map(a => ({ name: 'article_' + a.id, url: baseUrl + '/article.html?id=' + a.id }))
    ];

    for (const item of urls) {
      for (const vp of CONFIG.viewports) {
        await page.setViewport(vp);
        try {
          await page.goto(item.url, { waitUntil: 'networkidle0', timeout: 30000 });
          await autoScroll(page);
          const shotPath = path.join(CONFIG.outputDir, `${item.name}_${vp.name}.png`);
          await page.screenshot({ path: shotPath });
          results.screenshots.push(shotPath);
        } catch (err) {
          results.errors.push(`[NAV_ERROR] ${item.name}: ${err.message}`);
        }
      }
      results.articlesAudited++;
    }

    fs.writeFileSync(path.join(CONFIG.outputDir, 'audit_results.json'), JSON.stringify(results, null, 2));
    console.log(`[VISUAL_AUDIT] Finished with ${results.errors.length} errors.`);
    const exitCode = results.errors.length > 0 ? 1 : 0;
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(exitCode);
  } catch (err) {
    console.error(err);
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(1);
  }
}

runAudit().catch(err => { console.error(err); process.exit(1); });
