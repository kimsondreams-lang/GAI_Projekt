#!/usr/bin/env node
/**
 * Affiliate Link Health Monitoring System
 * Checks all Amazon affiliate links in articles for:
 * - HTTP 200 status
 * - Correct affiliate tag (kimsondreams-21)
 * - Product availability
 * 
 * Usage: node scripts/affiliate_link_monitor.cjs [--weekly-report]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG = {
  articlesDir: path.join(__dirname, '..', 'data', 'articles'),
  reportsDir: path.join(__dirname, '..', 'data', 'link_checker'),
  affiliateTag: 'kimsondreams-21',
  timeout: 10000,
  maxConcurrent: 5,
  retryAttempts: 2
};

// Ensure reports directory exists
if (!fs.existsSync(CONFIG.reportsDir)) {
  fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
}

/**
 * Check URL status with retry logic
 */
function checkUrlStatus(url, attempt = 1) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    try {
      const req = protocol.request(options, (res) => {
        const status = res.statusCode;
        const isRedirect = status >= 300 && status < 400;
        const isOk = status >= 200 && status < 400;
        
        resolve({
          url,
          status,
          ok: isOk,
          isRedirect,
          redirectLocation: res.headers.location || null,
          error: null
        });
      });

      req.on('error', (err) => {
        if (attempt < CONFIG.retryAttempts) {
          setTimeout(() => {
            checkUrlStatus(url, attempt + 1).then(resolve);
          }, 1000 * attempt);
        } else {
          resolve({ url, status: 0, ok: false, isRedirect: false, redirectLocation: null, error: err.message });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ url, status: 0, ok: false, isRedirect: false, redirectLocation: null, error: 'Timeout' });
      });

      req.end();
    } catch (e) {
      resolve({ url, status: 0, ok: false, isRedirect: false, redirectLocation: null, error: e.message });
    }
  });
}

/**
 * Verify affiliate tag presence
 */
function verifyAffiliateTag(url) {
  try {
    const urlObj = new URL(url);
    const tag = urlObj.searchParams.get('tag');
    return {
      hasTag: !!tag,
      correctTag: tag === CONFIG.affiliateTag,
      actualTag: tag
    };
  } catch (e) {
    return { hasTag: false, correctTag: false, actualTag: null };
  }
}

/**
 * Extract Amazon URLs from article content
 */
function extractAmazonUrls(content) {
  const amazonRegex = /https?:\/\/www\.amazon\.com\/[^\s"<>]+/g;
  const matches = content.match(amazonRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Scan all articles and extract links
 */
async function scanArticles() {
  const articlesPath = CONFIG.articlesDir;
  const files = fs.readdirSync(articlesPath).filter(f => f.endsWith('.json'));
  
  const results = {
    scanned: 0,
    totalLinks: 0,
    articles: []
  };

  for (const file of files) {
    try {
      const filePath = path.join(articlesPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const article = JSON.parse(content);
      
      if (!article.content) continue;
      
      const links = extractAmazonUrls(article.content);
      
      if (links.length > 0) {
        results.articles.push({
          id: article.id,
          title: article.title,
          file: file,
          links: links.map(url => ({
            url,
            ...verifyAffiliateTag(url)
          }))
        });
        results.totalLinks += links.length;
      }
      
      results.scanned++;
    } catch (e) {
      console.error(`[ERROR] Failed to parse ${file}: ${e.message}`);
    }
  }

  return results;
}

/**
 * Check all links with concurrency control
 */
async function checkAllLinks(articlesData) {
  const allLinks = [];
  articlesData.articles.forEach(article => {
    article.links.forEach(link => {
      allLinks.push({
        articleId: article.id,
        articleFile: article.file,
        ...link
      });
    });
  });

  const results = {
    healthy: [],
    broken: [],
    missingTag: [],
    wrongTag: [],
    redirects: [],
    checkedAt: new Date().toISOString()
  };

  // Process in batches
  for (let i = 0; i < allLinks.length; i += CONFIG.maxConcurrent) {
    const batch = allLinks.slice(i, i + CONFIG.maxConcurrent);
    const batchPromises = batch.map(link => checkUrlStatus(link.url));
    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((statusResult, idx) => {
      const link = batch[idx];
      const result = {
        url: link.url,
        articleId: link.articleId,
        articleFile: link.articleFile,
        status: statusResult.status,
        hasCorrectTag: link.correctTag,
        actualTag: link.actualTag,
        error: statusResult.error,
        checkedAt: new Date().toISOString()
      };

      // Categorize results
      if (!link.hasTag) {
        results.missingTag.push(result);
      } else if (!link.correctTag) {
        results.wrongTag.push(result);
      }

      if (!statusResult.ok) {
        results.broken.push(result);
      } else if (statusResult.isRedirect) {
        results.redirects.push({
          ...result,
          redirectLocation: statusResult.redirectLocation
        });
        results.healthy.push(result);
      } else {
        results.healthy.push(result);
      }
    });

    // Rate limiting
    if (i + CONFIG.maxConcurrent < allLinks.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

/**
 * Generate weekly report
 */
function generateReport(results) {
  const report = {
    generatedAt: new Date().toISOString(),
    period: 'weekly',
    summary: {
      totalChecked: results.healthy.length + results.broken.length,
      healthy: results.healthy.length,
      broken: results.broken.length,
      missingTag: results.missingTag.length,
      wrongTag: results.wrongTag.length,
      redirects: results.redirects.length
    },
    details: {
      healthy: results.healthy,
      broken: results.broken,
      missingTag: results.missingTag,
      wrongTag: results.wrongTag,
      redirects: results.redirects
    }
  };

  // Save report
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.reportsDir, `link_health_report_${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Save latest summary
  const summaryPath = path.join(CONFIG.reportsDir, 'latest_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report.summary, null, 2));

  return { report, reportPath };
}

/**
 * Print console summary
 */
function printSummary(report) {
  console.log('\n========================================');
  console.log('AFFILIATE LINK HEALTH REPORT');
  console.log('========================================');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Total Checked: ${report.summary.totalChecked}`);
  console.log(`✓ Healthy: ${report.summary.healthy}`);
  console.log(`✗ Broken: ${report.summary.broken}`);
  console.log(`⚠ Missing Tag: ${report.summary.missingTag}`);
  console.log(`⚠ Wrong Tag: ${report.summary.wrongTag}`);
  console.log(`→ Redirects: ${report.summary.redirects}`);
  console.log('========================================\n');

  if (report.summary.broken > 0) {
    console.log('BROKEN LINKS:');
    report.details.broken.slice(0, 10).forEach(link => {
      console.log(`  - ${link.url} (Status: ${link.status}, Article: ${link.articleId})`);
    });
    if (report.details.broken.length > 10) {
      console.log(`  ... and ${report.details.broken.length - 10} more`);
    }
    console.log('');
  }

  if (report.summary.missingTag > 0) {
    console.log('LINKS MISSING AFFILIATE TAG:');
    report.details.missingTag.slice(0, 5).forEach(link => {
      console.log(`  - ${link.url} (Article: ${link.articleId})`);
    });
    console.log('');
  }
}

/**
 * Main execution
 */
async function main() {
  const isWeeklyReport = process.argv.includes('--weekly-report');
  
  console.log('[AFFILIATE MONITOR] Starting link health check...');
  console.log(`[AFFILIATE MONITOR] Articles directory: ${CONFIG.articlesDir}`);
  
  // Step 1: Scan articles
  console.log('[AFFILIATE MONITOR] Scanning articles...');
  const articlesData = await scanArticles();
  console.log(`[AFFILIATE MONITOR] Found ${articlesData.totalLinks} links in ${articlesData.articles.length} articles`);

  if (articlesData.totalLinks === 0) {
    console.log('[AFFILIATE MONITOR] No Amazon links found.');
    return;
  }

  // Step 2: Check all links
  console.log('[AFFILIATE MONITOR] Checking link health...');
  const checkResults = await checkAllLinks(articlesData);

  // Step 3: Generate report
  console.log('[AFFILIATE MONITOR] Generating report...');
  const { report, reportPath } = generateReport(checkResults);

  // Step 4: Print summary
  printSummary(report);

  console.log(`[AFFILIATE MONITOR] Report saved to: ${reportPath}`);

  // Exit with error code if broken links found (for CI/CD)
  if (report.summary.broken > 0 && isWeeklyReport) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('[AFFILIATE MONITOR] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scanArticles, checkAllLinks, verifyAffiliateTag, extractAmazonUrls };
