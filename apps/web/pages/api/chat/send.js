export default async function handler(req, res) {
  const body = JSON.parse(req.body || "{}");
  const msg = body.message || "";
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const resp = await fetch(`${backendUrl}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": req.headers.authorization || "" },
    body: JSON.stringify({ message: msg })
  });
  const data = await resp.json();
  res.status(200).json(data);
}
