#!/usr/bin/env bash
set -euo pipefail

ts() { date '+%Y-%m-%d %H:%M:%S'; }

ROOT_DIR="${GAIOS_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_DIR="${GAIOS_STATE_DIR:-$ROOT_DIR/.gaios}"

echo "GAIOS_POSTSTOP: $(ts) start"

if [[ "${GAIOS_OLLAMA_STOP_ON_EXIT:-1}" == "1" ]] && command -v ollama >/dev/null 2>&1; then
  models_file="$STATE_DIR/prestart_ollama_models.txt"
  if [[ -f "$models_file" ]]; then
    while IFS= read -r m; do
      m="$(echo "$m" | xargs)"
      [[ -z "${m}" ]] && continue
      ollama stop "$m" >/dev/null 2>&1 || true
    done < "$models_file"
    rm -f "$models_file" || true
  fi

  if [[ "${GAIOS_OLLAMA_STOP_ALL_ON_EXIT:-0}" == "1" ]]; then
    while IFS= read -r m; do
      m="$(echo "$m" | xargs)"
      [[ -z "${m}" ]] && continue
      ollama stop "$m" >/dev/null 2>&1 || true
    done < <(ollama ps 2>/dev/null | awk 'NR>1 {print $1}' | sed '/^NAME$/d' | sort -u)
  fi
fi

echo "GAIOS_POSTSTOP: $(ts) done"
