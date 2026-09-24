#!/bin/bash
# Installs npm dependencies at session start, but only in Claude Code cloud
# sessions: the cloud VM sets CLAUDE_CODE_REMOTE=true, local sessions never do.
# Wired up by the SessionStart hook in .claude/settings.json. Always exits 0 so
# a failed install never blocks the session from starting.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ -d node_modules ]; then
  echo "install_pkgs: node_modules already present, skipping npm ci"
  exit 0
fi

echo "install_pkgs: cloud session without node_modules, running npm ci"
if npm ci --no-audit --no-fund; then
  echo "install_pkgs: npm ci finished"
else
  echo "install_pkgs: npm ci failed with exit code $?; run it manually"
fi
exit 0
