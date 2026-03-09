# Internal Linking Module Documentation

## Overview

The Internal LinÚng Module automatically analyzes article content and suggests/inserts relevant internal links between posts. This improves SEO, reduces bounce rate, and increases page views per session.

## File Locations

- Service: `services/internalLinkService.js`
- Config: `services/internalLinkConfig.js`
- Tests: `services/__tests__/internalLinkService.test.js`

## Configuration Options
```jsconst CONFIG = {
  maxLinksPerArticle: 5,       // Max recommended links
  minTagMatch: 1,                // Min matching tags
  linkThreshold: 0.3,            // Min relevance score
  excludeSelfLinks: true,        // Don't link to self
};
```

## API Reference

### `loadArticles()`

Loads all articles from the `data/articles/` directory.

```js
const articles = await loadArticles();
```

### `extractKeywords(htmlContent)`

Extracts top keywords from HTML content, filtering stop words.

```js
const keywords = extractKeywords(content);
```

### `calculateRelevance(article1, article2)`

Calculates relevance score (0-1) based on tags, category, and keyword match.

### `findRelatedArticles(articleId, limit)`

Finds related articles for a given article ID.

 ```js
const suggestions = await findRelatedArticles('best-gaming-accessories-2025', 5);
```

### `generateLinkHTML(suggestion)`

Generates HTML link for a suggestion.

### `insertLinksIntoContent(content, suggestions)`

Appends a "Related Articles" section to content.

## Usage Example

```js
import { processArticle, processAllArticles } from './services/internalLinkService.js';

// Process single article
const result = await processArticle('best-gaming-accessories-2025');
console.log(`Added ${result.linksAdded} links`);

// Process all articles
const summary = await processAllArticles();
console.log(`Processed ${summary.processed}/${summary.total} articles`);
```

## Running the Module

```bash
# Process single article
node -e 'import { processArticle } from './services/internalLinkService.js'; processArticle('best-gaming-accessories-2025')'

# Process all articles
node -e 'import { processAllArticles } from './services/internalLinkService.js'; processAllArticles();'
```

## Testing

```bash
# Run unit tests
npm test services/__tests__/internalLinkService.test.js
```

## Best Practices

1. Run before publishing new articles
2. Review suggested links before approving
3. Avoid over-linking (max 5 links per article)
4. Ensure linked articles are relevant

## Troubleshooting

- **No links found**: Check if article has sufficient content (200+ chars)
- **Low relevance**: Adjust `linkThreshold` in config
- **Duplicate links**: Enable `skipAlreadyLinked` in config

## License

Internal tool for GAIOS blog system.