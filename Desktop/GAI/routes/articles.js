import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import SearchService from '../services/searchService.js';
import { authenticateToken } from '../services/authService.js';

const router = express.Router();
const articlesDir = path.join(process.cwd(), 'data/articles');
const indexFile = path.join(articlesDir, 'index.json');

// Initialize SearchService with the index path
const searchService = new SearchService(indexFile);

/**
 * @openapi
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - author
 *         - date
 *         - category
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier (slug) for the article
 *         title:
 *           type: string
 *         subtitle:
 *           type: string
 *         author:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         category:
 *           type: string
 *           enum: [NEWS, REVIEWS, COMPARISONS, PROMOTIONS, ANNOUNCEMENTS]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         image:
 *           type: string
 *           description: URL to the main image
 *         content:
 *           type: string
 *           description: HTML content of the article
 */

/**
 * Helper to rebuild the index.json from individual article files
 * ensuring consistency after CUD operations.
 */
async function rebuildIndex() {
    try {
        const files = await fs.readdir(articlesDir);
        const articleFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
        
        const articles = [];
        for (const file of articleFiles) {
            try {
                const content = await fs.readFile(path.join(articlesDir, file), 'utf8');
                const data = JSON.parse(content);
                // Extract metadata for the index (exclude full content for performance)
                const { content: _, ...meta } = data;
                articles.push(meta);
            } catch (e) {
                console.error(`[ArticlesRouter] Error processing ${file}:`, e.message);
            }
        }
        
        // Sort by date descending
        articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        await fs.writeFile(indexFile, JSON.stringify(articles, null, 2));
        searchService.loadIndex(); // Refresh search service memory
        return articles;
    } catch (err) {
        console.error('[ArticlesRouter] Failed to rebuild index:', err);
        throw err;
    }
}

/**
 * @openapi
 * /api/articles:
 *   get:
 *     summary: List all articles
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: A list of article metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 */
router.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(indexFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to load articles index' });
    }
});

/**
 * @openapi
 * /api/articles/search:
 *   get:
 *     summary: Advanced search for articles
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: terms
 *         schema:
 *           type: string
 *         description: Search terms
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 */
router.get('/search', (req, res) => {
    try {
        const results = searchService.search(req.query);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /api/articles/{id}:
 *   get:
 *     summary: Get full article content
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full article data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 */
router.get('/:id', async (req, res) => {
    try {
        const filePath = path.join(articlesDir, `${req.params.id}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(404).json({ error: 'Article not found' });
    }
});

/**
 * @openapi
 * /api/articles:
 *   post:
 *     summary: Create or update an article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Article'
 *     responses:
 *       201:
 *         description: Article saved successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', authenticateToken, express.json(), async (req, res) => {
    try {
        const article = req.body;
        if (!article.id || !article.title) {
            return res.status(400).json({ error: 'Article ID and Title are required' });
        }

        const filePath = path.join(articlesDir, `${article.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(article, null, 2));
        
        await rebuildIndex();
        res.status(201).json({ message: 'Article saved successfully', id: article.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /api/articles/{id}:
 *   delete:
 *     summary: Remove an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *       404:
 *         description: Article not found
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const filePath = path.join(articlesDir, `${req.params.id}.json`);
        await fs.unlink(filePath);
        
        await rebuildIndex();
        res.json({ message: 'Article deleted successfully' });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Article not found' });
        res.status(500).json({ error: err.message });
    }
});

export default router;
