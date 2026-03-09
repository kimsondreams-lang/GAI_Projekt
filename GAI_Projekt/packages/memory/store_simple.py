from packages.memory.db import db

def append_message(role: str, content: str):
    with db() as cur:
        cur.execute("SELECT id FROM conversations ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if not row:
            cur.execute("INSERT INTO conversations DEFAULT VALUES RETURNING id")
            conv_id = cur.fetchone()[0]
        else:
            conv_id = row[0]
        cur.execute("INSERT INTO messages (conversation_id, role, content) VALUES (%s, %s, %s)", (conv_id, role, content))

def get_recent_context(limit: int = 12) -> str:
    with db() as cur:
        cur.execute("SELECT id FROM conversations ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if not row:
            return ""
        conv_id = row[0]
        cur.execute("SELECT role, content FROM messages WHERE conversation_id = %s ORDER BY id DESC LIMIT %s", (conv_id, limit))
        msgs = cur.fetchall()
        msgs = list(reversed(msgs))
        return "\n".join([f"{m[0].capitalize()}: {m[1]}" for m in msgs])

def save_cycle_report(plan_summary: str, result_summary: str):
    with db() as cur:
        cur.execute("INSERT INTO pins (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ("last_plan", plan_summary))
        cur.execute("INSERT INTO pins (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ("last_result", result_summary))
