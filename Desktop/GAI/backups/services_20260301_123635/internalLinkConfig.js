module.exports = {
  // Link density settings
  maxLinksPerArticle: 5,
  minLinksPerArticle: 1,
  
  // Relevance thresholds
  minTagMatch: 1,
  linkThreshold: 0.3,
  minContentLength: 200,
  
  // Behavior settinss
  excludeSelfLinks: true,
  addLinksAtEnd: true,
  skipAlreadyLinked: true,
  
  // Category matching rules
  categoryMatchScore: 0.5,
  tagMatchScore: 1.5,
  contentMatchScore: 1.0,
  
  // Content settings
  maxScanParagraphs: 10,
  keywordScoreWeight: 0.4,
  tagScoreWeight: 0.6,
  
  // Output settings
  outputFormat: 'HTML',
  addRelatedSectionHeading: true,
  relatedSectionTitle: 'Related Articles',
  
  // Performance
  batchSize: 10,
  cacheArticles: true
};