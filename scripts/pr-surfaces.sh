#!/usr/bin/env bash
#
# pr-surfaces.sh — dump ALL FOUR PR feedback surfaces for a PR in one shot.
#
# Bot reviewers (claude-review, CodeRabbit, …) and CI post findings on DIFFERENT
# GitHub surfaces. Querying only one (e.g. pulls/N/comments — the line-comment
# endpoint) silently misses the others and produces false "0 findings" reports.
# This bundles all four so a triage pass sees everything.
#
# Read-only: only `gh` GET calls, no mutations. `gh` auto-detects owner/repo from
# the current repo, so run it from anywhere inside the working tree.
#
# Usage: scripts/pr-surfaces.sh <PR-number>
#        (or invoke the /pr-triage command, which calls this and adds the
#         per-finding rebuttal pass)

set -uo pipefail

PR="${1:-}"
if [[ -z "$PR" ]]; then
  echo "Usage: scripts/pr-surfaces.sh <PR-number>" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: GitHub CLI (gh) not found on PATH" >&2
  exit 1
fi

hr() { printf '\n========== %s ==========\n' "$1"; }

hr "1/4  ISSUE-COMMENTS (gh pr view --comments) — where bots post their full reports"
gh pr view "$PR" --comments || echo "(none / error)"

hr "2/4  REVIEW SUMMARIES (pulls/$PR/reviews) — APPROVE / REQUEST_CHANGES / COMMENTED"
gh api "repos/{owner}/{repo}/pulls/$PR/reviews" \
  --jq '.[] | {user: .user.login, state, submitted_at, body}' 2>/dev/null \
  || echo "(none / error)"

hr "3/4  REVIEW-LINE COMMENTS (pulls/$PR/comments) — inline annotations on specific lines"
gh api "repos/{owner}/{repo}/pulls/$PR/comments" \
  --jq '.[] | {user: .user.login, path, line, body}' 2>/dev/null \
  || echo "(none / error)"

hr "4/4  CI / CHECKS (gh pr checks) + failed-run logs"
gh pr checks "$PR" || true   # gh exits non-zero when any check is failing/pending
fail_links=$(gh pr checks "$PR" --json name,state,link \
  --jq '.[] | select(.state=="FAILURE" or .state=="ERROR") | .link' 2>/dev/null || true)
if [[ -n "${fail_links:-}" ]]; then
  run_ids=$(printf '%s\n' "$fail_links" | grep -oE 'runs/[0-9]+' | grep -oE '[0-9]+' | sort -u)
  for rid in $run_ids; do
    hr "   failed run $rid (gh run view --log-failed)"
    gh run view "$rid" --log-failed 2>/dev/null || echo "(could not fetch log for run $rid)"
  done
else
  echo "(no failed checks)"
fi

hr "DONE — treat any '0 findings' conclusion as a claim requiring evidence from ALL FOUR surfaces"
