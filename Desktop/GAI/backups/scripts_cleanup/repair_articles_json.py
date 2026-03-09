import argparse
import glob
import json
import os
import re
import sys
from typing import Optional, Tuple


def _read(path: str) -> str:
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()


def _write(path: str, text: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def _try_load(raw: str):
    return json.loads(raw)


def _fix_double_escaped_quotes(raw: str) -> Optional[str]:
    head = raw[:400]
    if re.search(r'^\s*\{\s*\\"', head) or '\\"id\\"' in head or '\\"title\\"' in head:
        return raw.replace('\\"', '"')
    return None


def _fix_unescaped_quotes_in_content(raw: str) -> Optional[str]:
    m = re.search(r'\"content\"\s*:\s*\"', raw)
    if not m:
        return None
    start = m.end()

    def is_escaped(s: str, idx: int) -> bool:
        backslashes = 0
        j = idx - 1
        while j >= 0 and s[j] == '\\':
            backslashes += 1
            j -= 1
        return (backslashes % 2) == 1

    end = None
    i = start
    while i < len(raw):
        if raw[i] == '"' and not is_escaped(raw, i):
            j = i + 1
            while j < len(raw) and raw[j] in ' \t\r\n':
                j += 1
            if j < len(raw) and raw[j] in ',}':
                end = i
                break
        i += 1
    if end is None or end <= start:
        return None

    content = raw[start:end]
    out = []
    prev = ''
    for ch in content:
        if ch == '"' and prev != '\\':
            out.append('\\"')
        else:
            out.append(ch)
        prev = ch
    return raw[:start] + ''.join(out) + raw[end:]


def repair_file(path: str):
    raw = _read(path)
    if not raw.strip():
        normalized = json.dumps({}, ensure_ascii=False, indent=2)
        return True, 'fixed:empty_file', normalized
    try:
        _try_load(raw)
        return False, 'ok'
    except Exception as e:
        err0 = str(e)

    attempts = []
    fixed = _fix_double_escaped_quotes(raw)
    if fixed is not None:
        attempts.append(('double_escaped_quotes', fixed))

    fixed2 = _fix_unescaped_quotes_in_content(raw)
    if fixed2 is not None:
        attempts.append(('escape_content_quotes', fixed2))

    last_err = err0
    for name, candidate in attempts:
        try:
            obj = _try_load(candidate)
            normalized = json.dumps(obj, ensure_ascii=False, indent=2)
            return True, f'fixed:{name}', normalized
        except Exception as e:
            last_err = str(e)

    return False, f'failed:{last_err}'


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--dir', default='data/articles')
    args = ap.parse_args()

    paths = sorted(glob.glob(os.path.join(args.dir, '*.json')))
    if not paths:
        print('No article JSON files found.')
        return 0

    repaired = 0
    bad_after = []

    for p in paths:
        try:
            raw = _read(p)
            _try_load(raw)
            continue
        except Exception:
            pass

        result = repair_file(p)
        if len(result) == 2:
            _, info = result
            bad_after.append((p, info))
            continue

        changed, info, normalized = result
        if changed and args.fix:
            _write(p, normalized)
            repaired += 1
            print(f'[FIXED] {p} ({info})')
        else:
            bad_after.append((p, info))

    verify_bad = []
    for p in paths:
        try:
            _try_load(_read(p))
        except Exception as e:
            verify_bad.append((p, str(e)))

    if verify_bad:
        print('JSON Errors still present:')
        for p, e in verify_bad:
            print(f'- {p}: {e}')
        return 1

    if args.fix:
        print(f'OK. Repaired {repaired} files.')
    else:
        print('OK. All article JSON files are valid.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
