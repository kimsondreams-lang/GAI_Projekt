import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrape() {
    try {
        const url = 'https://www.gsmarena.com/samsung_galaxy_s26_ultra_5g-pictures-14320.php';
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const images = [];
        $('.section-gallery img').each((i, el) => {
            const src = $(el).attr('src');
            if (src) images.push(src);
        });
        console.log(JSON.stringify({ success: true, images }));
    } catch (e) {
        console.log(JSON.stringify({ success: false, error: e.message }));
    }
}

scrape();