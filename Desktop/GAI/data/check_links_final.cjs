const { checkUrlStatus } = require('../scripts/amazon_link_checker.cjs');
const links = [
  'https://www.amazon.com/dp/B0BCR39S5F?tag=kimsondreams-21',
  'https://www.amazon.com/dp/B09XS7JWHH?tag=kimsondreams-21',
  'https://www.amazon.com/dp/B09HMKMM93?tag=kimsondreams-21',
  'https://www.amazon.com/s?k=iphone+18+pro&tag=kimsondreams-21',
  'https://www.amazon.com/s?k=sony+wh-1000xm6&tag=kimsondreams-21',
  'https://www.amazon.com/s?k=logitech+mx+master+4&tag=kimsondreams-21'
];

async function run() {
  console.log('Starting link verification...');
  for (const url of links) {
    const res = await checkUrlStatus(url);
    console.log(`URL: ${url} | Status: ${res.status} | OK: ${res.ok}`);
  }
}

run().catch(console.error);