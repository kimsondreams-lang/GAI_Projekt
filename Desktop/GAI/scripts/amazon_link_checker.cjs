// Link checker active
const http = require('http');
const https = require('https');

function checkUrlStatus(url, timeout = 5000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    try {
      const req = protocol.get(url, { timeout }, (res) => {
        const is503 = res.statusCode === 503;
        if (is503) console.warn(`[AMAZON_CHECKER] 503 Service Unavailable for ${url}`);
        resolve({ 
          status: res.statusCode, 
          ok: (res.statusCode >= 200 && res.statusCode < 400) || is503,
          is503
        });
      });
      req.on('error', (err) => resolve({ status: 0, ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false, timeout: true }); });
    } catch (e) {
      resolve({ status: 0, ok: false, error: e.message });
    }
  });
}

module.exports = { checkUrlStatus };
