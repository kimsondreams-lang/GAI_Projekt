const base = process.env.GAI_BASE_URL || 'http://localhost:8080';
const token = process.env.GAI_SESSION_TOKEN;

if (!token) {
  console.error('Missing GAI_SESSION_TOKEN');
  process.exit(2);
}

const main = async () => {
  const r = await fetch(`${base}/api/db`, { headers: { 'x-session-id': token } });
  console.log('db', r.status);
  const text = await r.text();
  console.log(text.slice(0, 200));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

