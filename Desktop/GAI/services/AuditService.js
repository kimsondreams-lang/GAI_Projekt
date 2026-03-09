import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

export class AuditService {
  static affiliateTag = 'kimsondreams-21';
  static articlesDir = path.join(process.cwd(), 'data', 'articles');
  static reportsDir = path.join(process.cwd(), 'data', 'link_checker');

  static async runFullAudit() {
    console.log('🔍 Starting Full Audit...');
    const links = await this.auditLinks();
    const images = await this.auditImages();
    const result = {
      links,
      images,
      checkedAt: new Date().toISOString()
    };
    
    await this.saveReport(result);
    return result;
  }

  static async saveReport(result) {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportsDir, `audit_report_${timestamp}.json`);
    const latestPath = path.join(this.reportsDir, 'latest_audit.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(result, null, 2));
    console.log(`✅ Audit report saved to ${reportPath}`);
  }

  static async auditLinks() {
    const files = fs.readdirSync(this.articlesDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    let total = 0;
    const broken = [];
    const missingTag = [];
    const wrongTag = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.articlesDir, file), 'utf8');
        const article = JSON.parse(content);
        const $ = cheerio.load(article.content || '');
        const amazonLinks = $('a[href*=\"amazon.com\"]').map((i, el) => $(el).attr('href')).get();

        for (const link of amazonLinks) {
          total++;
          try {
            const url = new URL(link);
            const tag = url.searchParams.get('tag');
            if (!tag) {
              missingTag.push({ file, link });
            } else if (tag !== this.affiliateTag) {
              wrongTag.push({ file, link, actualTag: tag });
            }
          } catch (e) {
            broken.push({ file, link, error: 'Invalid URL' });
          }
        }
      } catch (e) {
        console.error(`Failed to process ${file}: ${e}`);
      }
    }

    return { total, broken, missingTag, wrongTag };
  }

  static async auditImages() {
    const indexPath = path.join(this.articlesDir, 'index.json');
    if (!fs.existsSync(indexPath)) return { total: 0, duplicates: [], mismatches: [] };
    
    const articles = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const imageCounts = new Map();
    const mismatches = [];

    articles.forEach((article) => {
      const img = article.image;
      if (img) {
        const count = imageCounts.get(img) || [];
        count.push(article.id);
        imageCounts.set(img, count);
      }

      const title = (article.title || '').toLowerCase();
      const imgName = path.basename(img || '').toLowerCase();
      const keywords = title.split(/\\s+/).filter((w) => w.length > 3);
      const hasMatch = keywords.some((k) => imgName.includes(k));
      
      if (!hasMatch && keywords.length > 0 && img) {
        mismatches.push({ id: article.id, title: article.title, image: img });
      }
    });

    const duplicates = Array.from(imageCounts.entries())
      .filter(([img, ids]) => ids.length > 1)
      .map(([img, ids]) => ({ image: img, ids }));

    return { total: articles.length, duplicates, mismatches };
  }
}
