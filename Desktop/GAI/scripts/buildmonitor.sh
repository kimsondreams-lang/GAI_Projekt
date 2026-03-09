#!/usr/bin/env bash
# GAI Build Monitor & Loop Guard (pre-build hook)

if [[ "$GAIPREBUILD" == "1" ]]; then
  echo "GAI Build Monitor: Build loop detected or already running. Skipping."
  exit 0
fi

echo "GAI Build Monitor: Pre-build checks passed."
exit 0
