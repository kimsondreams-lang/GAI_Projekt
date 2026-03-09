const https = require('https');

const urls = [
    'https://www.amazon.com/s?k=rtx+5090&tag=kimsondreams-21',
    'https://www.amazon.com/s?k=AI+gaming+laptop+rtx+50&tag=kimsondreams-21',
    'https://www.amazon.com/s?k=macbook+pro+m5&tag=kimsondreams-21',
    'https://www.amazon.com/s?k=iphone+18+pro+max&tag=kimsondreams-21',
    'https://www.amazon.com/s?k=nintendo+switch+2&tag=kimsondreams-21'
];

function checkUrl(url) {
    return new Promise((resolve) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            timeout: 10000
        };

        https.get(url, options, (res) => {
            resolve({ url, status: res.statusCode });
        }).on('error', (e) => {
            resolve({ url, status: 'ERROR: ' + e.message });
        }).on('timeout', () => {
            resolve({ url, status: 'TIMEOUT' });
        });
    });
}

async function run() {
    console.log('Starting link verification...');
    const results = await Promise.all(urls.map(checkUrl));
    console.log(JSON.stringify(results, null, 2));
}

run();