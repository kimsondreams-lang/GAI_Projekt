const fs = require('fs');
const https = require('https');

function checkUrlStatus(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 5000 }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 || res.statusCode === 503 });
    }).on('error', (err) => resolve({ status: 0, ok: false, error: err.message }));
  });
}

async function validateFile(path) {
  console.log(`Validating links in: ${path}`);
  const content = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(content);
  
  const links = [];
  const regex = /href=\"(https:\/\/www\.amazon\.com\/[^\"]+)\"/g;
  let match;
  while ((match = regex.exec(data.content)) !== null) {
    links.push(match[1]);
  }
  
  if (data.affiliateLinks) {
    data.affiliateLinks.forEach(l => links.push(l.url));
  }

  const uniqueLinks = [...new Set(links)];
  console.log(`Found ${uniqueLinks.length} unique Amazon links.`);

  let allOk = true;
  for (const link of uniqueLinks) {
    const result = await checkUrlStatus(link);
    if (result.ok) {
      console.log(`[OK] ${link} (Status: ${result.status})`);
    } else {
      console.error(`[FAIL] ${link} (Error: ${result.error || result.status})`);
      allOk = false;
    }
    if (!link.includes('tag=kimsondreams-21')) {
      console.error(`[MISSING TAG] ${link}`);
      allOk = false;
    }
  }
  return allOk;
}

const filePath = process.argv[2];
validateFile(filePath).then(ok => process.exit(ok ? 0 : 1)).catch(err => {
  console.error(err);
  process.exit(1);
});