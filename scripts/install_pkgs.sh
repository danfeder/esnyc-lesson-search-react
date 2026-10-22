#!/bin/bash
# Prepares a Claude Code CLOUD session at startup. Local sessions exit at once:
# the cloud VM sets CLAUDE_CODE_REMOTE=true and nothing else does.
# Wired up by the SessionStart hook in .claude/settings.json. Always exits 0 so
# a failed step never blocks the session from starting.
#
#   1. npm dependencies: cloud sessions start from a fresh clone with no
#      node_modules, so run `npm ci` when it is missing.
#   2. Docker daemon: installed on the VM but not running. The local Supabase
#      stack (`supabase start -x edge-runtime`) needs it, and it starts in ~2s.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ -d node_modules ]; then
  echo "install_pkgs: node_modules already present, skipping npm ci"
else
  echo "install_pkgs: cloud session without node_modules, running npm ci"
  if npm ci --no-audit --no-fund; then
    echo "install_pkgs: npm ci finished"
  else
    echo "install_pkgs: npm ci failed with exit code $?; run it manually"
  fi
fi

if command -v dockerd >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "install_pkgs: docker daemon already running"
  else
    setsid nohup dockerd >/var/log/dockerd.log 2>&1 </dev/null &
    for _ in $(seq 1 20); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
    if docker info >/dev/null 2>&1; then
      echo "install_pkgs: docker daemon started (log: /var/log/dockerd.log)"
    else
      echo "install_pkgs: docker daemon did not come up; see /var/log/dockerd.log"
    fi
  fi
fi

exit 0
