#!/bin/bash
# Setup script for the Claude Code CLOUD ENVIRONMENT (`esynyc-lessonsearch`).
#
# This file is the source of truth. When it changes, paste its contents into the
# environment's "Setup script" field (claude.ai/code, or the desktop app's
# environment editor). It runs ONCE, as root, on a fresh Ubuntu VM whenever the
# environment cache is rebuilt (roughly weekly, or when this script or the
# network settings change). Whatever it leaves on disk is snapshotted and every
# later session starts from that snapshot.
#
# Budget: keep total runtime under ~5 minutes (Anthropic's cache-build limit).
# Per-session work (npm ci when node_modules is missing, starting dockerd) lives
# in scripts/install_pkgs.sh via the SessionStart hook instead.
set -uo pipefail
SUPABASE_CLI_VERSION=2.95.4   # keep in step with `supabase --version` on the dev Mac

# --- Find the repo clone ---
# The setup script's working directory is not documented. Try the current
# directory, then $CLAUDE_PROJECT_DIR, then a shallow filesystem search, and
# say which one won so a silent no-op is visible in the cache-build log.
REPO=""
for candidate in "$PWD" "${CLAUDE_PROJECT_DIR:-}"; do
  if [ -n "$candidate" ] && [ -f "$candidate/package.json" ] && [ -f "$candidate/supabase/config.toml" ]; then
    REPO="$candidate"; break
  fi
done
if [ -z "$REPO" ]; then
  hit=$(find / -maxdepth 5 -type f -path '*/supabase/config.toml' -not -path '*/node_modules/*' 2>/dev/null | head -1)
  [ -n "$hit" ] && REPO=$(dirname "$(dirname "$hit")")
fi
if [ -n "$REPO" ]; then
  cd "$REPO" && echo "cloud-setup: repo clone at $REPO"
else
  echo "cloud-setup: repo clone NOT found (pwd=$PWD); node deps and image pre-pull will be skipped"
fi

# --- Node deps + Playwright browsers, in the background (~1 min) ---
if [ -n "$REPO" ]; then
  (
    npm ci --no-audit --no-fund && npx playwright install --with-deps chromium
  ) >/tmp/setup-node.log 2>&1 &
  NODE_PID=$!
else
  NODE_PID=""
fi

# --- Supabase CLI, pinned ---
curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" \
  | tar -xz -C /usr/local/bin supabase || echo "supabase cli install failed"

# --- Docker daemon + pre-pull the local Supabase stack images (~8.5 GB, ~3 min) ---
# Images pulled here land in the snapshot. Images pulled mid-session do not, so
# without this every new session would re-download them.
if ! docker info >/dev/null 2>&1; then
  setsid nohup dockerd >/var/log/dockerd.log 2>&1 </dev/null &
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
if [ -z "$REPO" ]; then
  echo "repo clone not found; skipping image pre-pull"
elif ! docker info >/dev/null 2>&1; then
  echo "docker daemon did not come up; skipping image pre-pull (see /var/log/dockerd.log)"
elif ! command -v supabase >/dev/null 2>&1; then
  echo "supabase cli missing; skipping image pre-pull"
else
  # edge-runtime is excluded: inside the sandbox its Deno runtime cannot trust the
  # outbound TLS proxy, so that one container fails its health check.
  (supabase start -x edge-runtime && supabase stop --no-backup) \
    || echo "supabase image pre-pull failed; sessions will pull on demand"
fi

if [ -n "$NODE_PID" ]; then
  wait "$NODE_PID" || echo "node setup failed; see /tmp/setup-node.log"
fi
exit 0
