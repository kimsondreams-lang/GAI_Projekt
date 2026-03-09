import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractKeywords, calculateRelevance, insertLinksIntoContent, generateLinkHTML, findRelatedArticles, loadArticles, CONFIG } from '../internalLinkService.js';

describe('internalLinkService', () => {
  describe('extractKeywords', () => {
    it('should extract top keywords from HTML content', () => {
      const html = '<p>The best gaming keyboard for professional gamers. This keyboard features mechanical switches.</p>';
      const keywords = extractKeywords(html);
      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should filter out stop words', () => {
      const html = '<p>The quick brown fox jumps over the lazy dog</p>';
      const keywords = extractKeywords(html);
      expect(keywords).notToContain('the');
      expect(keywords).notToContain('over');
    });

    it('should handle empty content', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  describe('calculateRelevance', () => {
    it('should return higher score for matching tags', () => {
      const article1 = { tags: ['Gaming', 'Keyboards'], category: 'REVIEWS', content: 'Gaming keyboard' };
      const article2 = { tags: ['Gaming', 'Keyboards'], category: 'REVIEWS', content: 'Gaming setup' };
      const score = calculateRelevance(article1, article2);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should return lower score for no matching tags', () => {
      const article1 = { tags: ['Gaming'], category: 'REVIEWS', content: 'Gaming' };
      const article2 = { tags: ['Audio'], category: 'NEWS', content: 'Headphones' };
      const score = calculateRelevance(article1, article2);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('generateLinkHTML', () => {
    it('should generate valid HTML link', () => {
      const suggestion = { id: 'test-article', title: 'Test Article' };
      const html = generateLinkHTML(suggestion);
      expect(html).toContain('<a href="/articles/test-article"');
      expect(html).toContain('Test Article');
    });
  });

  describe('insertLinksIntoContent', () => {
    it('should append related articles section', () => {
      const content = '<p>Original content</p>';
      const suggestions = [
        { id: 'art1', title: 'Article 1', relevance: 0.8 },
        { id: 'art2', title: 'Article 2', relevance: 0.6 }
      ];
      const result = insertLinksIntoContent(content, suggestions);
      expect(result).toContain('Related Articles');
      expect(result).toContain('Article 1');
    });

    it('should return unchanged content if no suggestions', () => {
      const content = '<p>Original</p>';
      const result = insertLinksIntoContent(content, []);
      expect(result).toEqual(content);
    });
  });

  describe('CONFIG', () => {
    it('should have valid configuration values', () => {
      expect(CONFIG.maxLinksPerArticle).toBeGreaterThan(0);
      expect(CONFIG.linkThreshold).toBeGreaterThan(0);
      expect(CONFIG.excludeSelfLinks).toBeTrue();
    });
  });
});