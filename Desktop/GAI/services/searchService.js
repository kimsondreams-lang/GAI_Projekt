import fs from 'fs';

class SearchService {
    constructor(indexPath) {
        this.indexPath = indexPath;
        this.articles = [];
        this.loadIndex();
    }

    loadIndex() {
        try {
            const data = fs.readFileSync(this.indexPath, 'utf8');
            this.articles = JSON.parse(data);
        } catch (err) {
            console.error(`[SearchService] Failed to load index: ${err.message}`);
            this.articles = [];
        }
    }

    /**
     * Advanced Search
     * @param {Object} query 
     * @param {string} query.terms - Full-text search terms
     * @param {string[]} query.tags - Tags with +/- prefixes (e.g., ['+Tech', '-Gaming'])
     * @param {string} query.category - Filter by category
     * @param {string} query.dateFrom - YYYY-MM-DD
     * @param {string} query.dateTo - YYYY-MM-DD
     * @param {number} query.limit - Max results
     */
    search(query = {}) {
        const { terms, tags, category, dateFrom, dateTo, limit = 50 } = query;
        const normalizedTerms = typeof terms === 'string' ? terms.trim() : '';
        const parsedLimit = Number(limit);
        const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;
        const normalizedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];
        
        let results = this.articles.map(article => ({
            ...article,
            score: 0
        }));

        // 1. Category Filter
        if (category) {
            results = results.filter(a => a.category === category);
        }

        // 2. Date Range Filter
        if (dateFrom) {
            results = results.filter(a => a.date >= dateFrom);
        }
        if (dateTo) {
            results = results.filter(a => a.date <= dateTo);
        }

        // 3. Boolean Tag Logic
        if (normalizedTags.length > 0) {
            results = results.filter(article => {
                const articleTags = article.tags || [];
                return normalizedTags.every(tagQuery => {
                    if (tagQuery.startsWith('+')) {
                        const required = tagQuery.slice(1);
                        return articleTags.includes(required);
                    } else if (tagQuery.startsWith('-')) {
                        const forbidden = tagQuery.slice(1);
                        return !articleTags.includes(forbidden);
                    } else {
                        return articleTags.includes(tagQuery);
                    }
                });
            });
        }

        // 4. Full-text Search & Scoring
        if (normalizedTerms) {
            const normalizedTermsLower = normalizedTerms.toLowerCase();
            const searchTerms = normalizedTermsLower.split(/\s+/).filter(Boolean);
            results = results.filter(article => {
                let score = 0;
                const title = (article.title || '').toLowerCase();
                const subtitle = (article.subtitle || '').toLowerCase();
                
                searchTerms.forEach(term => {
                    if (title.includes(term)) score += 10;
                    if (subtitle.includes(term)) score += 5;
                    if (title.includes(normalizedTermsLower)) score += 20;
                });

                article.score = score;
                return score > 0;
            });
        }

        // Sort by score (desc) then date (desc)
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.date) - new Date(a.date);
        });

        return results.slice(0, safeLimit);
    }
}

export default SearchService;
