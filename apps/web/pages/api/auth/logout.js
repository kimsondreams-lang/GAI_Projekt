export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const isProd = process.env.NODE_ENV === "production";
    const cookie = [
      `gai_session=`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=0`,
      isProd ? `Secure` : undefined,
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

