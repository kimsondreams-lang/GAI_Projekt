import SearchService from '../services/searchService.js';
import path from 'path';

const indexPath = path.resolve('data/articles/index.json');
const searcher = new SearchService(indexPath);

console.log('--- Test 1: Full-text search for "Samsung" ---');
const res1 = searcher.search({ terms: 'Samsung' });
console.log(`Found ${res1.length} results. Top result: ${res1[0]?.title}`);

console.log('\n--- Test 2: Boolean Tags (+Tech, -Gaming) ---');
const res2 = searcher.search({ tags: ['+Tech', '-Gaming'] });
console.log(`Found ${res2.length} results.`);
res2.slice(0, 3).forEach(a => console.log(`- ${a.title} (Tags: ${a.tags.join(', ')})`));

console.log('\n--- Test 3: Date Range (2025-01-01 to 2025-03-31) ---');
const res3 = searcher.search({ dateFrom: '2025-01-01', dateTo: '2025-03-31' });
console.log(`Found ${res3.length} results.`);

console.log('\n--- Test 4: Combined Query (terms: "AI", category: "REVIEWS") ---');
const res4 = searcher.search({ terms: 'AI', category: 'REVIEWS' });
res4.forEach(a => console.log(`- ${a.title} [Score: ${a.score}]`));
