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

  const writeRes = await fetch(`${base}/api/fs/write`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ path: '/home/documents/test.txt', content: 'hello', encoding: 'utf8' })
  });
  console.log('fs.write', writeRes.status, await asJson(writeRes));

  const readRes = await fetch(`${base}/api/fs/read`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ path: '/home/documents/test.txt' })
  });
  console.log('fs.read', readRes.status, await asJson(readRes));

  const dbRes = await fetch(`${base}/api/db`, { headers: h });
  const db = await asJson(dbRes);
  console.log('db', dbRes.status, {
    keys: typeof db === 'object' && db ? Object.keys(db) : typeof db,
    vfsCount: db?.vfs?.length,
    tasksCount: db?.tasks?.length,
    installedAppsCount: db?.installedApps?.length,
    desktopLayoutCount: db?.desktopLayout?.length
  });

  const taskCreate = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ title: 'Audit Task', description: 'test', status: 'pending', progress: 0 })
  });
  const task = await asJson(taskCreate);
  console.log('tasks.create', taskCreate.status, task);

  const taskUpdate = await fetch(`${base}/api/tasks/${task.id}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({ status: 'completed', progress: 100 })
  });
  console.log('tasks.update', taskUpdate.status, await asJson(taskUpdate));

  const snapCreate = await fetch(`${base}/api/snapshot/create`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ type: 'manual' })
  });
  console.log('snapshot.create', snapCreate.status, await asJson(snapCreate));

  const snapList = await fetch(`${base}/api/snapshot/list`);
  console.log('snapshot.list', snapList.status, await asJson(snapList));

  const statusRes = await fetch(`${base}/api/system/status`, { headers: h });
  const status = await asJson(statusRes);
  console.log('system.status', statusRes.status, status);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
