const fs = require('fs');
const path = require('path');

const articlesDir = path.resolve(__dirname, '../data/articles');
const outDir = path.resolve(__dirname, '../data/articles');

function extractProductName(title) {
  return title
    .replace(/Review/gi, '')
    .replace(/Comparison/gi, '')
    .replace(/Best/gi, '')
    .replace(/Top/gi, '')
    .replace(/2025/gi, '')
    .replace(/2024/gi, '')
    .trim();
}

function generateSchema(article) {
  const productName = extractProductName(article.title);
  
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": article.author || "Technova Team"
    },
    "datePublished": article.date,
    "dateModified": article.date,
    "itemReviewed": {
      "@type": "Product",
      "name": productName,
      "image": article.image || "",
      "description": article.subtitle || ""
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5",
      "bestRating": "5"
    },
    "reviewBody": article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 500) : "",
    "publisher": {
      "@type": "Organization",
      "name": "Technova",
      "url": "https://kimsondreams.com"
    }
  };
}

function processArticles() {
  const files = fs.readdirSync(articlesDir).filter(f => 
    f.endsWith('.json') && !f.includes('index') && !f.includes('affiliate')
  );
  
  let count = 0;
  
  for (const file of files) {
    try {
      const filePath = path.join(articlesDir, file);
      const article = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (article.category === 'REVIEWS' || article.category === 'COMPARISONS') {
        const schema = generateSchema(article);
        article.schema = schema;
        fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf8');
        console.log('Added schema to: ' + file + ' (' + article.title + ')');
        count++;
      }
    } catch (e) {
      console.error('Error processing ' + file + ': ' + e.message);
    }
  }
  
  console.log('\nSummary: Processed ' + count + ' articles with Schema.org Review markup');
  return count;
}

function generateSchemaIndex() {
  const files = fs.readdirSync(articlesDir).filter(f => 
    f.endsWith('.json') && !f.includes('index') && !f.includes('affiliate')
  );
  
  const schemas = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(articlesDir, file);
      const article = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if ((article.category === 'REVIEWS' || article.category === 'COMPARISONS') && article.schema) {
        schemas.push(article.schema);
      }
    } catch (e) {
      console.error('Error reading ' + file + ': ' + e.message);
    }
  }
  
  const indexPath = path.join(outDir, 'schema-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(schemas, null, 2), 'utf8');
  console.log('Generated schema-index.json with ' + schemas.length + ' schemas');
}

if (require.main === module) {
  console.log('Starting Schema.org Review markup generation...\n');
  processArticles();
  generateSchemaIndex();
  console.log('Done!');
}

module.exports = { processArticles, generateSchemaIndex, generateSchema };
