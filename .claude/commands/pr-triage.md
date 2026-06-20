Triage ALL four PR-feedback surfaces for the PR given as the argument (e.g. `/pr-triage 512`). Bot reviewers (`claude-review`, CodeRabbit, …) and CI post findings on DIFFERENT GitHub surfaces; querying only one silently misses most of them, so "0 findings" from a single endpoint is a verification failure.

1. Dump all four surfaces in one shot by running the helper script with the PR number:

   `bash scripts/pr-surfaces.sh <PR>`

   It prints: (1) issue-comments (`gh pr view --comments`, where bots post their full reports), (2) review summaries (`pulls/<PR>/reviews`), (3) review-line comments (`pulls/<PR>/comments`), and (4) CI checks + `--log-failed` output for any failed run.

2. For EVERY finding surfaced — including ones labeled "minor"/"nit" — do a rebuttal pass BEFORE fixing: state whether it's a real issue in THIS codebase, why, and the chosen action (fix, or won't-fix with a reason). Don't let "easy fix" skip the challenge step.

3. Calibrate acceptance to project priorities: functionality and database-safety findings outrank style/hardening nits for this internal-only tool.

4. Treat any "0 findings" conclusion as a claim that requires evidence from ALL FOUR surfaces, never from a single endpoint. If you reach for `gh api .../pulls/<PR>/comments` alone, stop — that's the line-comment endpoint, not the bot-review endpoint.
