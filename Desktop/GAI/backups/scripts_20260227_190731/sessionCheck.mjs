const base = process.env.GAI_BASE_URL || 'http://localhost:8080';
const password = process.env.GAI_PASSWORD || 'claUDE098!';

const asJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
};

const main = async () => {
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const login = await asJson(loginRes);
  console.log('login', loginRes.status, login);
  if (!login?.sessionId) process.exit(2);

  const h = { 'Content-Type': 'application/json', 'x-session-id': login.sessionId };

  const db1Res = await fetch(`${base}/api/db`, { headers: h });
  const db1 = await asJson(db1Res);
  console.log('db1', db1Res.status, { taskbarOpacity: db1?.settings?.taskbarOpacity });

  const newOpacity = Number(db1?.settings?.taskbarOpacity || 0.8) + 0.01;
  const syncRes = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ settings: { ...db1.settings, taskbarOpacity: newOpacity } })
  });
  console.log('sync', syncRes.status, await asJson(syncRes));

  const db2Res = await fetch(`${base}/api/db`, { headers: h });
  const db2 = await asJson(db2Res);
  console.log('db2', db2Res.status, { taskbarOpacity: db2?.settings?.taskbarOpacity });

  const tickWrong = await fetch(`${base}/api/tick`, { method: 'POST', headers: { 'x-cron-secret': 'wrong' } });
  console.log('tick.wrong', tickWrong.status, await asJson(tickWrong));

  const tickOk = await fetch(`${base}/api/tick`, { method: 'POST', headers: { 'x-cron-secret': process.env.GAI_CRON_SECRET || '' } });
  console.log('tick.ok', tickOk.status, await asJson(tickOk));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
