import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import ftp from 'basic-ftp';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '74XBWsMZCXd7UoPB5qmBbnUu1INFPZI4YUliyxZIUYKWgtuA5l3ohEEX';

// Helper to validate URL
async function isUrlValid(url) {
    try {
        if (!url) return false;
        // Allow local relative paths if they exist (Standard GAI OS convention)
        if (!url.startsWith('http')) {
             // Check in public directory
             const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
             // Check both raw path and public/ path
             if (fs.existsSync(cleanUrl)) return true;
             if (fs.existsSync(path.join(process.cwd(), 'public', cleanUrl))) return true;
             // If neither, it's invalid
             return false;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return res.ok;
    } catch (e) {
        return false;
    }
}

const clampInt = (value, fallback, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
};

async function searchPexelsImage(query, opts = {}) {
    const q = String(query || '').trim();
    if (!q) return '';
    const orientationRaw = String(opts.orientation || '').trim();
    const orientation = ['landscape', 'portrait', 'square'].includes(orientationRaw) ? orientationRaw : 'landscape';
    const perPage = clampInt(opts.perPage, 3, 1, 10);
    if (!PEXELS_API_KEY) return '';
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', q);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('orientation', orientation);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(url.toString(), { headers: { Authorization: String(PEXELS_API_KEY).trim() }, signal: controller.signal });
        if (!res.ok) return '';
        const data = await res.json();
        const photos = Array.isArray(data?.photos) ? data.photos : [];
        const pick = photos.find(p => p?.src?.large2x || p?.src?.large || p?.src?.medium) || photos[0];
        const src = pick?.src?.large2x || pick?.src?.large || pick?.src?.medium || '';
        return String(src || '').trim();
    } catch {
        return '';
    } finally {
        clearTimeout(timeout);
    }
}

async function downloadImageToFile(url, dir) {
    const targetDir = dir || path.join(process.cwd(), 'data', 'out', 'bloghealer-images');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const contentLength = Number(res.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) return null;
        const contentType = String(res.headers.get('content-type') || '').toLowerCase();
        const ext = contentType.includes('png') ? 'png' : (contentType.includes('webp') ? 'webp' : (contentType.includes('gif') ? 'gif' : 'jpg'));
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 8 * 1024 * 1024) return null;
        const name = `img_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
        const filePath = path.join(targetDir, name);
        fs.writeFileSync(filePath, buf);
        return { filePath, ext, contentType };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// Helper to find replacement image
async function findReplacementImage(query, affiliateLink) {
    const pexels = await searchPexelsImage(query, { orientation: 'landscape', perPage: 3 });
    if (pexels) return pexels;

    // Strategy 1: If affiliate link exists, try to scrape it (risky but worth a shot)
    if (affiliateLink && await isUrlValid(affiliateLink)) {
        try {
            const res = await fetch(affiliateLink, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
            const html = await res.text();
            const $ = cheerio.load(html);
            // Try standard OG image
            let img = $('meta[property="og:image"]').attr('content');
            if (img) return img;
            // Try Amazon specific
            img = $('#landingImage').attr('src');
            if (img) return img;
        } catch (e) {
            console.log(`Failed to scrape affiliate link: ${e.message}`);
        }
    }

    // Strategy 2: Web Research & Remix (The "Real Object" Strategy)
    // If we have a query (e.g. "iPhone 17 Pro Max"), try to find a real image first to remix
    if (query && query.length > 3) {
        try {
             // 1. Search for image URL via DuckDuckGo (HTML scraping)
             const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' product photo')}&iax=images&ia=images`;
             const res = await fetch(searchUrl, {
                 headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
             });
             const html = await res.text();
             const $ = cheerio.load(html);
             
             // Extract first valid image URL
             let realImgUrl = '';
             $('.result__image').each((i, el) => {
                 if (realImgUrl) return;
                 const url = $(el).attr('data-src') || $(el).attr('src');
                 if (url && url.startsWith('http')) realImgUrl = url;
             });

             if (realImgUrl) {
                 // 2. Download the real image
                 const tmpDir = path.join(process.cwd(), 'data', 'tmp_vision');
                 if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                 const localPath = path.join(tmpDir, `ref_${Date.now()}.jpg`);
                 
                 const imgRes = await fetch(realImgUrl);
                 if (imgRes.ok) {
                     const buf = await imgRes.arrayBuffer();
                     fs.writeFileSync(localPath, Buffer.from(buf));
                     
                     // 3. Vision Analysis (What does it look like?)
                     // We need to call Ollama here. Assuming global OLLAMA_BASE_URL is not available in this module,
                     // we'll try to use a default or pass it in constructor. For now hardcode localhost default.
                     const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
                     
                     const imageBuffer = fs.readFileSync(localPath);
                     const base64Image = imageBuffer.toString('base64');
                     
                     const visionRes = await fetch(`${ollamaUrl}/api/generate`, {
                         method: 'POST',
                         body: JSON.stringify({
                             model: 'llava',
                             prompt: "Describe this product image in high detail (colors, shape, features, material) so an artist can recreate it. Focus on visual attributes.",
                             images: [base64Image],
                             stream: false
                         })
                     });
                     
                     if (visionRes.ok) {
                         const vData = await visionRes.json();
                         const description = vData.response;
                         
                         // 4. Generate with Pollinations using the description
                         // We add "product photography, 4k, cinematic lighting" to make it look good for a blog
                         const finalPrompt = `Product photography of ${query}: ${description}. Cinematic lighting, 4k, hyperrealistic, detailed.`;
                         console.log(`[BlogHealer] Remixing real image for "${query}"`);
                         return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1600&height=900&nologo=true`;
                     }
                 }
             }
        } catch (e) {
            console.warn(`[BlogHealer] Remix strategy failed for ${query}: ${e.message}`);
        }
    }

    // Strategy 3: Fallback Pollinations (Pure Imagination)
    // Using 1600x900 for blog headers
    const prompt = `high quality realistic photo of ${query}, tech, modern, 4k, detailed`;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1600&height=900&nologo=true`;
}

export class BlogHealer {
    constructor(ftpConfig, localArticlesPath) {
        this.ftpConfig = ftpConfig;
        this.localArticlesPath = localArticlesPath;
    }

    getImagesRemoteDir() {
        const root = String(this.ftpConfig?.rootPath || '').replace(/\/+$/g, '');
        if (!root) return '/images/articles';
        return `${root}/images/articles`.replace(/\/{2,}/g, '/');
    }

    getArticlesRemoteDir() {
        const root = String(this.ftpConfig?.rootPath || '').replace(/\/+$/g, '');
        if (!root) return '/data/articles';
        return `${root}/data/articles`.replace(/\/{2,}/g, '/');
    }

    async runDiagnostics(opts = {}) {
        const report = { checked: 0, fixedImages: 0, fixedLinks: 0, errors: [] };
        
        if (!fs.existsSync(this.localArticlesPath)) {
            report.errors.push(`Local articles path not found: ${this.localArticlesPath}`);
            return report;
        }

        const onlyFiles = Array.isArray(opts.onlyFiles) ? opts.onlyFiles.map(f => String(f || '').trim()).filter(Boolean) : null;
        const files = fs
            .readdirSync(this.localArticlesPath)
            .filter(f => f.endsWith('.json') && !f.includes('index.json'))
            .filter(f => {
                if (!onlyFiles) return true;
                return onlyFiles.includes(f);
            });
        
        for (const file of files) {
            report.checked++;
            const filePath = path.join(this.localArticlesPath, file);
            let article;
            try {
                article = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                report.errors.push(`Failed to parse ${file}`);
                continue;
            }

            let modified = false;
            const isGenericImageUrl = (url) => {
                const u = String(url || '').toLowerCase();
                if (!u) return false;
                return u.includes('source.unsplash.com') || u.includes('unsplash.com') || u.includes('image.pollinations.ai') || u.includes('via.placeholder.com');
            };

            // 1. Check Main Image
            if (!await isUrlValid(article.image) || isGenericImageUrl(article.image)) {
                console.log(`[BlogHealer] Broken image in ${article.title}. Finding replacement...`);
                // Find affiliate link in content if available
                const $ = cheerio.load(article.content || '');
                const affiliateLink = $('a[href*="amazon"]').attr('href');
                
                const newImage = await findReplacementImage(article.title, affiliateLink);
                if (newImage) {
                    const uploaded = await this.maybeUploadImage(newImage, `cover_${file.replace(/\.json$/i,'')}`);
                    article.image = uploaded || newImage;
                    modified = true;
                    report.fixedImages++;
                }
            }

            // 2. Check Content Images (img src)
            const $ = cheerio.load(article.content || '', null, false); // false = fragment
            const images = $('img');
            let contentModified = false;
            const seenSrc = new Map();
            
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const src = $(img).attr('src');
                const alt = $(img).attr('alt') || 'tech gadget';
                const currentKey = `${String(src || '').trim()}::${String(alt || '').trim()}`;
                const prev = seenSrc.get(String(src || '').trim());
                if (prev && prev !== currentKey) {
                    $(img).attr('data-gai-dup', '1');
                } else if (src) {
                    seenSrc.set(String(src || '').trim(), currentKey);
                }

                const invalid = !await isUrlValid(src);
                const generic = isGenericImageUrl(src);
                const duplicated = $(img).attr('data-gai-dup') === '1';
                if (invalid || generic || duplicated) {
                    const replacement = await findReplacementImage(alt, '');
                    const uploaded = replacement ? await this.maybeUploadImage(replacement, `content_${file.replace(/\.json$/i,'')}_${i}`) : '';
                    const finalSrc = uploaded || replacement || (invalid ? `https://source.unsplash.com/800x600/?${encodeURIComponent(alt)}` : (src || ''));
                    if (finalSrc) {
                        $(img).attr('src', finalSrc);
                        $(img).removeAttr('data-gai-dup');
                        contentModified = true;
                        report.fixedImages++;
                    }
                }
            }

            const slots = $('div[id^="img_slot_"]');
            if (slots.length > 0) {
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    const slotId = $(slot).attr('id') || '';
                    const query = `${article.title || ''}`.trim() || 'tech gadget';
                    const replacement = await findReplacementImage(query, '');
                    if (!replacement) continue;
                    const uploaded = await this.maybeUploadImage(replacement, `slot_${file.replace(/\.json$/i,'')}_${i}`);
                    const finalSrc = uploaded || replacement;
                    const imgTag = `<img src="${finalSrc}" alt="${query}" class="technova-featured-img" />`;
                    $(slot).replaceWith(imgTag);
                    contentModified = true;
                    report.fixedImages++;
                    if (slotId) console.log(`[BlogHealer] Filled image slot ${slotId} in ${article.title}.`);
                }
            }

            if (contentModified) {
                article.content = $.html();
                modified = true;
            }

            // 3. Save and Upload if modified
            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(article, null, 2));
                await this.uploadToFtp(filePath, file);
            }
        }

        return report;
    }

    async maybeUploadImage(imageUrl, namePrefix) {
        const canUpload = this.ftpConfig && this.ftpConfig.host && this.ftpConfig.user;
        if (!canUpload) return '';
        if (!String(imageUrl || '').startsWith('http')) return '';
        const downloaded = await downloadImageToFile(imageUrl, path.join(process.cwd(), 'data', 'out', 'bloghealer-images'));
        if (!downloaded) return '';
        const ext = downloaded.ext || 'jpg';
        const safePrefix = String(namePrefix || 'img').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
        const remoteName = `${safePrefix}_${Date.now()}.${ext}`;
        const remoteDir = this.getImagesRemoteDir();
        const remotePath = `${remoteDir}/${remoteName}`.replace(/\/{2,}/g, '/');
        const ok = await this.uploadBinaryToFtp(downloaded.filePath, remotePath);
        if (!ok) return '';
        return `images/articles/${remoteName}`;
    }

    async uploadBinaryToFtp(localPath, remotePath) {
        const client = new ftp.Client();
        try {
            await client.access({
                host: this.ftpConfig.host,
                user: this.ftpConfig.user,
                password: this.ftpConfig.pass,
                port: parseInt(this.ftpConfig.port || '21'),
                secure: false
            });
            const remoteDir = path.posix.dirname(remotePath);
            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, remotePath);
            return true;
        } catch (e) {
            console.error(`[BlogHealer] FTP Error: ${e.message}`);
            return false;
        } finally {
            client.close();
        }
    }

    async uploadToFtp(localPath, fileName) {
        if (!this.ftpConfig || !this.ftpConfig.host || !this.ftpConfig.user) {
            console.log('[BlogHealer] FTP upload skipped (disabled or missing config).');
            return;
        }
        const client = new ftp.Client();
        try {
            await client.access({
                host: this.ftpConfig.host,
                user: this.ftpConfig.user,
                password: this.ftpConfig.pass,
                port: parseInt(this.ftpConfig.port || '21'),
                secure: false
            });
            const remoteDir = this.getArticlesRemoteDir();
            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, path.posix.join(remoteDir, fileName));
            console.log(`[BlogHealer] Uploaded fixed ${fileName} to FTP.`);
        } catch (e) {
            console.error(`[BlogHealer] FTP Error: ${e.message}`);
        } finally {
            client.close();
        }
    }
}
