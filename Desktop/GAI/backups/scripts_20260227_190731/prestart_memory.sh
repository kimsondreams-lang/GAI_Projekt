#!/usr/bin/env bash
set -euo pipefail

ts() { date '+%Y-%m-%d %H:%M:%S'; }

echo "GAIOS_PRESTART: $(ts) start"

os="$(uname -s || echo unknown)"
echo "GAIOS_PRESTART: os=${os}"

ROOT_DIR="${GAIOS_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_DIR="${GAIOS_STATE_DIR:-$ROOT_DIR/.gaios}"
mkdir -p "$STATE_DIR"

DATA_DIR="${GAI_DATA_DIR:-${DATA_DIR:-$ROOT_DIR/data}}"
DB_PATH="${DATA_DIR%/}/gai_db.json"

print_mem() {
  if [[ "$os" == "Darwin" ]]; then
    if command -v memory_pressure >/dev/null 2>&1; then
      echo "GAIOS_PRESTART: memory_pressure"
      memory_pressure 2>/dev/null | head -n 25 || true
    fi
    if command -v vm_stat >/dev/null 2>&1; then
      echo "GAIOS_PRESTART: vm_stat"
      vm_stat 2>/dev/null | head -n 12 || true
    fi
    if command -v top >/dev/null 2>&1; then
      echo "GAIOS_PRESTART: top PhysMem"
      top -l 1 -n 0 2>/dev/null | egrep -m 1 'PhysMem|MemRegions|VM:' || true
    fi
  else
    if command -v free >/dev/null 2>&1; then
      echo "GAIOS_PRESTART: free -m"
      free -m || true
    fi
    if [[ -r /proc/meminfo ]]; then
      echo "GAIOS_PRESTART: /proc/meminfo"
      egrep '^(MemTotal|MemFree|MemAvailable|Buffers|Cached):' /proc/meminfo || true
    fi
  fi
}

print_mem

warm_models() {
  if [[ "${GAIOS_OLLAMA_WARMUP:-1}" != "1" ]]; then
    return
  fi
  if ! command -v curl >/dev/null 2>&1; then
    return
  fi
  local base_url="${OLLAMA_BASE_URL:-http://localhost:11434}"
  local keep_alive="${GAIOS_OLLAMA_KEEPALIVE:-15m}"
  local max_b="${GAIOS_OLLAMA_WARMUP_MAX_B:-14}"
  local include_latest="${GAIOS_OLLAMA_WARMUP_INCLUDE_LATEST:-0}"
  if [[ -f "$DB_PATH" ]] && command -v python3 >/dev/null 2>&1; then
    enabled_from_settings="$(python3 - <<PY 2>/dev/null || true
import json, os
p=os.environ.get("DB_PATH","")
try:
  j=json.load(open(p))
except Exception:
  print("")
  raise SystemExit(0)
s=j.get("settings",{}) or {}
v=s.get("ollamaWarmup", None)
print("0" if v is False else "1")
PY
)"
    if [[ "${enabled_from_settings:-}" == "0" ]]; then
      echo "GAIOS_PRESTART: warming models disabled by settings"
      return
    fi
    keep_alive_from_settings="$(python3 - <<PY 2>/dev/null || true
import json, os
p=os.environ.get("DB_PATH","")
try:
  j=json.load(open(p))
except Exception:
  print("")
  raise SystemExit(0)
s=j.get("settings",{}) or {}
print(str(s.get("ollamaKeepAlive","") or "").strip())
PY
)"
    if [[ -n "${keep_alive_from_settings:-}" ]]; then
      keep_alive="$keep_alive_from_settings"
    fi
    max_b_from_settings="$(python3 - <<PY 2>/dev/null || true
import json, os
p=os.environ.get("DB_PATH","")
try:
  j=json.load(open(p))
except Exception:
  print("")
  raise SystemExit(0)
s=j.get("settings",{}) or {}
v=s.get("ollamaWarmupMaxB", "")
try:
  n=int(v)
  print(n)
except Exception:
  print("")
PY
)"
    if [[ "${max_b_from_settings:-}" =~ ^[0-9]+$ ]]; then
      max_b="$max_b_from_settings"
    fi
  fi
  local models_raw="${GAIOS_OLLAMA_WARMUP_MODELS:-}"
  if [[ -z "${models_raw}" ]] && [[ -f "$DB_PATH" ]] && command -v python3 >/dev/null 2>&1; then
    models_raw="$(python3 - <<PY 2>/dev/null || true
import json, os
p=os.environ.get("DB_PATH","")
try:
  j=json.load(open(p))
except Exception:
  print("")
  raise SystemExit(0)
s=j.get("settings",{}) or {}
roles=(s.get("modelRoles",{}) or {})
warm=(s.get("ollamaWarmupModels",[]) or [])
models=[]
def add(x):
  x=str(x or "").strip()
  if x and x not in models:
    models.append(x)
if isinstance(warm, list) and len([w for w in warm if str(w or "").strip()]) > 0:
  for w in warm:
    add(w)
else:
  add(s.get("activeModel",""))
  add(roles.get("chat",""))
  add(roles.get("writing",""))
  add(roles.get("coding",""))
print(" ".join(models))
PY
)"
  fi
  if [[ -z "${models_raw}" ]]; then
    return
  fi

  is_heavy_model() {
    local name="$1"
    if echo "$name" | grep -qi 'thinking'; then
      return 0
    fi
    if echo "$name" | grep -qi ':latest$'; then
      if [[ "$include_latest" == "1" ]]; then
        return 1
      fi
      return 0
    fi
    local b=""
    b="$(echo "$name" | sed -nE 's/.*:([0-9]+)b.*/\1/p' | head -n 1 || true)"
    if [[ -z "$b" ]]; then
      return 1
    fi
    if [[ "$b" -gt "$max_b" ]]; then
      return 0
    fi
    return 1
  }

  filtered=""
  for m in $models_raw; do
    [[ -z "${m}" ]] && continue
    if is_heavy_model "$m"; then
      continue
    fi
    case " $filtered " in
      *" $m "*) ;;
      *) filtered="${filtered} ${m}" ;;
    esac
  done
  filtered="$(echo "$filtered" | xargs || true)"
  if [[ -z "${filtered}" ]]; then
    echo "GAIOS_PRESTART: warming models skipped (all candidates considered heavy)"
    return
  fi

  echo "GAIOS_PRESTART: warming models (${filtered})"
  : > "$STATE_DIR/prestart_ollama_models.txt"
  for m in $filtered; do
    [[ -z "${m}" ]] && continue
    echo "$m" >> "$STATE_DIR/prestart_ollama_models.txt"
    curl -s "${base_url%/}/api/chat" \
      -H 'Content-Type: application/json' \
      -d "{\"model\":\"${m}\",\"messages\":[{\"role\":\"system\",\"content\":\"Respond with OK.\"},{\"role\":\"user\",\"content\":\"OK\"}],\"keep_alive\":\"${keep_alive}\",\"options\":{\"num_predict\":1},\"stream\":false}" \
      >/dev/null || true
  done
}

export DB_PATH
warm_models

if [[ "${GAIOS_MEMORY_PURGE:-1}" == "1" ]]; then
  echo "GAIOS_PRESTART: purge requested"
  if [[ "$os" == "Darwin" ]]; then
    if command -v purge >/dev/null 2>&1; then
      if purge >/dev/null 2>&1; then
        echo "GAIOS_PRESTART: purge ok"
      else
        if [[ "${GAIOS_MEMORY_PURGE_SUDO:-1}" == "1" ]] && command -v sudo >/dev/null 2>&1; then
          if sudo -n purge >/dev/null 2>&1; then
            echo "GAIOS_PRESTART: sudo purge ok"
          else
            echo "GAIOS_PRESTART: sudo purge failed (no sudo rights or password required)"
          fi
        else
          echo "GAIOS_PRESTART: purge failed (set GAIOS_MEMORY_PURGE_SUDO=1 if you want to try sudo -n purge)"
        fi
      fi
    else
      echo "GAIOS_PRESTART: purge not available on this macOS install"
    fi
  else
    if [[ "${GAIOS_DROP_CACHES:-0}" == "1" ]] && [[ -w /proc/sys/vm/drop_caches ]]; then
      sync || true
      echo 3 > /proc/sys/vm/drop_caches || true
      echo "GAIOS_PRESTART: drop_caches done"
    else
      echo "GAIOS_PRESTART: linux drop_caches not enabled (set GAIOS_DROP_CACHES=1 and run as root)"
    fi
  fi
fi

print_mem
echo "GAIOS_PRESTART: $(ts) done"
