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
set -u
SUPABASE_CLI_VERSION=2.95.4   # keep in step with `supabase --version` on the dev Mac

# --- Node deps + Playwright browsers, in the background (~1 min) ---
(
  npm ci --no-audit --no-fund && npx playwright install --with-deps chromium
) >/tmp/setup-node.log 2>&1 &
NODE_PID=$!

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
if ! docker info >/dev/null 2>&1; then
  echo "docker daemon did not come up; skipping image pre-pull (see /var/log/dockerd.log)"
elif ! command -v supabase >/dev/null 2>&1; then
  echo "supabase cli missing; skipping image pre-pull"
else
  # edge-runtime is excluded: inside the sandbox its Deno runtime cannot trust the
  # outbound TLS proxy, so that one container fails its health check.
  (supabase start -x edge-runtime && supabase stop --no-backup) \
    || echo "supabase image pre-pull failed; sessions will pull on demand"
fi

wait "$NODE_PID" || echo "node setup failed; see /tmp/setup-node.log"
exit 0
