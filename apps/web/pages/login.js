import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Logowanie nieudane");
      }
      // Przekieruj do dashboardu po udanym logowaniu
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neo">
      <div className="w-full max-w-md neo-card p-8">
        <h1 className="text-2xl font-semibold text-neo-fg mb-6 text-center">GAI Dashboard — Logowanie</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neo-muted mb-2">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input w-full"
              placeholder="Wpisz hasło"
              required
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-primary w-full py-2.5 font-medium"
          >
            {loading ? "Logowanie..." : "Zaloguj"}
          </button>
        </form>
        <p className="mt-4 text-center text-neo-muted text-sm">
          Wymagane hasło systemowe skonfigurowane w <code>GAI_PANEL_PASSWORD</code>.
        </p>
      </div>
    </div>
  );
}
