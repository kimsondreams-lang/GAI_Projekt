import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const DB_PATH = path.join(process.cwd(), 'data', 'click_tracking.db');

async function getDb() {
  return open({ filename: DB_PATH, driver: sqlite3.Database });
}

async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      country TEXT,
      city TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      is_bot BOOLEAN DEFAULT 0,
      session_id TEXT
    );
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      category TEXT,
      article_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      click_count INTEGER DEFAULT 0,
      last_clicked DATETIME
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_links_product_id ON links(product_id);
    CREATE INDEX IF NOT EXISTS idx_links_article_id ON links(article_id);
  `);
  await db.close();
}

function parseUserAgent(ua) {
  const deviceType = /Mobile|Android|iPhone|iPad|iPod/.test(ua) ? 'mobile' : 'desktop';
  let browser = 'unknown';
  let os = 'unknown';
  if (/Chrome/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua)) browser = 'Safari';
  else if (/Edge/.test(ua)) browser = 'Edge';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac/.test(ua)) os = 'MacOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/.test(ua)) os = 'iOS';
  return { deviceType, browser, os };
}

function isBot(ua) {
  const botPatterns = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu/i;
  return botPatterns.test(ua);
}

router.post('/api/track', async (req, res) => {
  try {
    const { linkId, url, productId, productName, category, articleId } = req.body;
    const db = await getDb();
    if (linkId) {
      const existingLink = await db.get('SELECT * FROM links WHERE id = ?', [linkId]);
      if (!existingLink && url) {
        await db.run(
          'INSERT INTO links (url, product_id, product_name, category, article_id) VALUES (?, ?, ?, ?, ?)',
          [url, productId, productName, category, articleId]
        );
      }
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || '';
    const { deviceType, browser, os } = parseUserAgent(ua);
    const bot = isBot(ua);
    const sessionId = req.session?.id || req.cookies?.sessionId || 'anonymous';
    await db.run(
      `INSERT INTO clicks (link_id, ip_address, user_agent, referrer, device_type, browser, os, is_bot, session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [linkId, ip, ua, referrer, deviceType, browser, os, bot ? 1 : 0, sessionId]
    );
    if (linkId) {
      await db.run(
        'UPDATE links SET click_count = click_count + 1, last_clicked = CURRENT_TIMESTAMP WHERE id = ?',
        [linkId]
      );
    }
    await db.close();
    res.json({ status: 'ok', tracked: true, bot: bot });
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/api/track/stats', async (req, res) => {
  try {
    const db = await getDb();
    const { days = 30, linkId, articleId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT session_id) as unique_visitors,
        SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_clicks,
        COUNT(DISTINCT device_type) as device_types,
        COUNT(DISTINCT browser) as browsers
      FROM clicks
      WHERE timestamp >= datetime('now', '-${days} days')
    `;
    if (linkId) {
      query += ` AND link_id = ${linkId}`;
    }
    const stats = await db.get(query);
    const topLinks = await db.all(`
      SELECT l.*, COUNT(c.id) as recent_clicks
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id 
        AND c.timestamp >= datetime('now', '-${days} days')
      GROUP BY l.id
      ORDER BY recent_clicks DESC
      LIMIT 20
    `);
    await db.close();
    res.json({
      status: 'ok',
      period: `${days} days`,
      stats,
      topLinks
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

initDb().catch(console.error);

export { router as trackClicksRouter, initDb };
export default router;
