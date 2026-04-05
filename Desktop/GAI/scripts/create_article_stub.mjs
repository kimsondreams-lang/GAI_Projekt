import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'data', 'articles');

const rawSlug = String(process.argv[2] || '').trim().toLowerCase();
const rawTitle = String(process.argv.slice(3).join(' ') || '').trim();

if (!rawSlug || !rawTitle) {
  console.error('Usage: node scripts/create_article_stub.mjs <slug> <title>');
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(rawSlug)) {
  console.error('Slug must match ^[a-z0-9-]+$');
  process.exit(1);
}

fs.mkdirSync(ARTICLES_DIR, { recursive: true });

const filePath = path.join(ARTICLES_DIR, `${rawSlug}.json`);
if (fs.existsSync(filePath)) {
  console.error(`Article stub already exists: ${path.relative(ROOT, filePath)}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const article = {
  id: rawSlug,
  title: rawTitle,
  subtitle: 'Add a concise subtitle that explains the article angle.',
  author: 'GAIOS',
  date: today,
  category: 'NEWS',
  tags: ['Tech'],
  image: `images/articles/${rawSlug}.jpg`,
  content: `<p>Start with a clear introduction that explains why this topic matters now and what the reader will learn.</p>

<h2>Main angle</h2>
<p>Develop the core argument with concrete, current and verifiable information. Keep the writing useful, specific and aligned with the final title.</p>

<h2>What matters in practice</h2>
<p>Explain the real-world implications, trade-offs and buying or usage context. Replace this starter text before publishing.</p>`
};

fs.writeFileSync(filePath, `${JSON.stringify(article, null, 2)}\n`, 'utf8');
console.log(`Created article stub: ${path.relative(ROOT, filePath)}`);
