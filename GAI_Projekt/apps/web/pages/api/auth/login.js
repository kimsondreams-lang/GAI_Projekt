import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    const rawSecret = process.env.GAI_PANEL_PASSWORD ?? process.env.NEXT_PUBLIC_GAI_PANEL_PASSWORD ?? process.env.AUTH_PASSWORD ?? "";
    const secret = String(rawSecret).trim();

    if (!secret) {
      return res.status(500).json({ error: "Auth not configured" });
    }

    if (!password || String(password).trim() !== secret) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const hash = crypto.createHash("sha256").update(secret).digest("hex");

    const isProd = process.env.NODE_ENV === "production";
    const cookie = [
      `gai_session=${hash}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${7 * 24 * 60 * 60}`,
      isProd ? `Secure` : undefined,
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
