import fs from 'fs';
import path from 'path';

const ARTICLES_DIR = path.join(process.cwd(), 'data', 'articles');
const INDEX_PATH = path.join(ARTICLES_DIR, 'index.json');
const AFFILIATE_TAG = 'kimsondreams-21';
const AMAZON_DOMAIN = 'https://www.amazon.com';

function loadIndex() {
  try {
    const data = fs.readFileSync(INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load index:', e.message);
    return [];
  }
}

function loadArticle(filename) {
  const filePath = path.join(ARTICLES_DIR, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function extractAmazonLinks(content) {
  const regex = /https:\/\/www\.amazon\.com\/(dp|s)\/([^"'\s]+)/gi;
  const links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[0]);
  }
  return links;
}

function hasAffiliateTag(url) {
  return url.includes(`/tag=${AFFILIATE_TAG}`);
}

function addAffiliateTag(url) {
  if (hasAffiliateTag(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tag=${AFFILIATE_TAG}`;
}

function fixLinksInContent(content) {
  return content.replace(
    /https:\/\/www\.amazon\.com\/(dp|s)\/([^"'\s]*)/g,
    (match, type, path) => {
      const fullPath = `${type}/${path}`;
      const newUrl = addAffiliateTag(fullPath);
      return https://www.amazon.com/${newUrl};
    }
  );
}

async function main() {
  console.log('Starting Amazon Link Audit...');
  const files = loadIndex();
  console.log(`Found ${files.length} articles`);
  
  const report = {
    totalArticles: files.length,
    processed: 0,
    withLinks: 0,
    missingTag: 0,
    fixed: 0,
    articles: []
  };
  
  for (const file of files) {
    const article = loadArticle(file);
    if (!article || !article.content) continue;
    
    const links = extractAmazonLinks(article.content);
    if (links.length === 0) continue;
    
    report.withLinks++;
    const missingTagLinks = links.filter(l => !hasAffiliateTag(l));
    
    if (missingTagLinks.length > 0) {
      report.missingTag++;
      console.warn(`[${file}] Missing tag in ${missingTagLinks.length} links`);
      
      const fixedContent = fixLinksInContent(article.content);
      if (fixedContent !== article.content) {
        report.fixed++;
        console.log(`[${file}] Fixed links`);
        
        const filePath = path.join(ARTICLES_DIR, file);
        article.content = fixedContent;
        fs.writeFileSync(filePath, JSON.stringify(article, null, 2));
      }
    }
    
    report.processed++;
    report.articles.push({
      file,
      id: article.id,
      linksFound: links.length,
      missingTags: missingTagLinks.length
    });
  }
  
  console.log('\nReport:');
  console.log(`Processed: ${report.processed}/${report.totalArticles}`);
  console.log(`With Links: ${report.withLinks}`);
  console.log(`Missing Tag: ${report.missingTag}`);
  console.log(`Fixed: ${report.fixed}`);
  
  const reportPath = path.join(process.cwd(), 'data', 'amazon_link_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch(console.error);