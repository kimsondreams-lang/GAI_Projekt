import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.join(process.cwd(), 'data', 'articles');
const INDEX_PATH = path.join(ARTICLES_DIR, 'index.json');

const CONFIG = {
  minTagMatch: 1,
  maxLinksPerArticle: 5,
  excludeSelfLinks: true,
  linkThreshold: 0.3,
  contentMinLength: 200
};

export async function loadArticles() {
  try {
    const indexData = fs.readFileSync(INDEX_PATH, 'utf-8');
    const articleFiles = JSON.parse(indexData);
    const articles = [];
    for (const file of articleFiles) {
      const filePath = path.join(ARTICLES_DIR, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          const article = JSON.parse(content);
          articles.push(article);
        } catch (e) {
          console.warn(`Failed to parse ${file}: ${e.message}`);
        }
      }
    }
    return articles;
  } catch (error) {
    console.error('Error loading articles:', error);
    return [];
  }
}

export function extractKeywords(htmlContent) {
  const text = htmlContent.replace(/<[^>]*>/g, ' ').toLowerCase();
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','must','shall','can','need','it','its','this','that','these','those','you','he','she','we','they','what','which','who','where','when','why','how','i']);
  const words = text.match(/\b[a-z]{3,}\b/g) || [];
  const freq = {};
  for (const word of words) {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

export function calculateRelevance(article1, article2) {
  let score = 0;
  const maxScore = 3;
  const tags1 = new Set(article1.tags?.map(t => t.toLowerCase()) || []);
  const tags2 = new Set(article2.tags?.map(t => t.toLowerCase()) || []);
  const matchingTags = [...tags1].filter(t => tags2.has(t));
  if (matchingTags.length >= CONFIG.minTagMatch) {
    score += 1.5 * (matchingTags.length / Math.max(tags1.size, tags2.size));
  }
  if (article1.category === article2.category) {
    score += 0.5;
  }
  const keywords1 = new Set(extractKeywords(article1.content || ''));
  const keywords2 = new Set(extractKeywords(article2.content || ''));
  const matchingKeywords = [...keywords1].filter(k => keywords2.has(k));
  if (matchingKeywords.length > 0) {
    score += 1.0 * (matchingKeywords.length / Math.max(keywords1.size, keywords2.size));
  }
  return Math.min(score / maxScore, 1);
}

export async function findRelatedArticles(articleId, limit) {
  const articles = await loadArticles();
  const sourceArticle = articles.find(a => a.id === articleId);
  if (!sourceArticle) return [];
  const suggestions = [];
  for (const article of articles) {
    if (CONFIG.excludeSelfLinks && article.id === articleId) continue;
    const relevance = calculateRelevance(sourceArticle, article);
    if (relevance >= CONFIG.linkThreshold) {
      suggestions.push({
        id: article.id,
        title: article.title,
        relevance: relevance,
        tags: article.tags || [],
        category: article.category,
        url: '/articles/' + article.id
      });
    }
  }
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit || CONFIG.maxLinksPerArticle);
}

export function generateLinkHTML(suggestion, anchorText) {
  const text = anchorText || suggestion.title;
  return `<a href="/articles/${suggestion.id}" class="internal-link" data-article-id="${suggestion.id}">${text}</a>`;
}

export function insertLinksIntoContent(content, suggestions) {
  if (!suggestions || suggestions.length === 0) return content;
  const relatedSection = `
    <div class="related-articles-section">
      <h3>Related Articles</h3>
      <ul class="related-articles-list">
        ${suggestions.map(s => `<li>${generateLinkHTML(s)}</li>`).join('\n        ')}
      </ul>
    </div>
  `;
  return content + relatedSection;
}

export async function processArticle(articleId) {
  const articles = await loadArticles();
  const article = articles.find(a => a.id === articleId);
  if (!article) return { success: false, error: 'Article not found' };
  if ((article.content || '').length < CONFIG.contentMinLength) {
    return { success: false, error: 'Content too short' };
  }
  const suggestions = await findRelatedArticles(articleId);
  if (suggestions.length === 0) {
    return { success: true, linksAdded: 0, message: 'No related articles found' };
  }
  const modifiedContent = insertLinksIntoContent(article.content, suggestions);
  return {
    success: true,
    linksAdded: suggestions.length,
    suggestions,
    modifiedContent
  };
}

export async function processAllArticles() {
  const articles = await loadArticles();
  const results = [];
  for (const article of articles) {
    const result = await processArticle(article.id);
    results.push({ id: article.id, title: article.title, ...result });
  }
  return {
    total: articles.length,
    processed: results.filter(r => r.success).length,
    results
  };
}

export default {
  loadArticles,
  extractKeywords,
  calculateRelevance,
  findRelatedArticles,
  generateLinkHTML,
  insertLinksIntoContent,
  processArticle,
  processAllArticles,
  CONFIG
};