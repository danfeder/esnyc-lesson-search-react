# Local Supabase lifecycle and verification hardening

- **Status:** Proposed implementation plan
- **Date:** 2026-08-17
- **Delivery:** One tooling-and-documentation PR, independent of the Arab-American
  Heritage Month schema, UI, and data PRs

## Outcome

Automated migration verification must never reset, stop, relink, or clean up the
developer's shared `esynyc-lessonsearch-v2` Supabase stack. Verification will run
against a disposable, uniquely named local stack; destructive shared-stack
commands will require an explicit human confirmation; and the repository will
use one exact Supabase CLI version locally and in CI.

The PR is complete when a forced verifier failure cleans up only its disposable
resources and leaves the shared stack's containers, volumes, data fingerprint,
and running state unchanged.

## Why this PR is separate

This is operational hardening, not part of the heritage-tag feature. Combining
the two would make it harder to review the schema-only change and would couple a
small additive constraint migration to changes in local Docker orchestration.

This PR must not:

- add, edit, or reorder anything under `supabase/migrations/`;
- change application, reviewer, or public UI behavior;
- access or mutate TEST or production Supabase projects;
- repair the current local Storage state automatically;
- remove Docker containers or volumes belonging to the shared local stack.

## Incident and current evidence

On 2026-08-17, routine migration verification used the shared repository stack:

1. `supabase db reset` reconstructed the local database from migrations and seed
   data. The old local data was not needed, but the action was broader than the
   verification required.
2. `supabase stop` then removed the local Supabase containers and network while
   retaining named volumes. This made the developer's stack appear to have
   disappeared.
3. A later full `supabase start` failed while starting Storage with
   `duplicate key value violates unique constraint "migrations_name_key"`.
4. The core stack started successfully only with
   `--exclude storage-api,imgproxy`. At the time of diagnosis, the local CLI was
   2.95.4, the configured Storage image was `v1.31.1`, and the linked-project
   warning reported Storage `v1.69.0`. The local `storage.migrations` ledger also
   contained migrations through id 58. This is consistent with a service-image
   and migration-ledger mismatch, although the PR must treat the exact Storage
   root cause as unproven until reproduced in a disposable stack.

The repository currently reinforces the risky path: root and migration guidance
direct agents to run `supabase db reset` against the shared project and to stop
the stack afterward; `package.json` exposes a shared reset directly; and several
GitHub workflows install `supabase/setup-cli@v2` with `version: latest`.

Supabase documents that local `db reset` destroys and reconstructs the local
database and that local CLI/service-image compatibility can change between CLI
releases. References:

- [Local development with schema migrations](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase CLI version compatibility guidance](https://github.com/supabase/cli)
- [CLI issue with the same Storage migration-name collision](https://github.com/supabase/cli/issues/5952)

## Locked design decisions

### 1. The shared stack is user-owned

Scripts and agents may inspect the shared `esynyc-lessonsearch-v2` stack, but
they may not reset, stop, relink, or clean it up without explicit authorization
for that exact action. Migration verification must not depend on whether the
shared stack is running.

`npm run db:start` may start a missing shared stack after a read-only preflight,
but it leaves the stack running. There is no automatic "stop when done" step.

### 2. Migration verification gets an isolated stack

`npm run db:verify:migrations` creates a temporary Supabase project with:

- a unique project id prefixed `esynyc-verify-`;
- dynamically allocated, non-default ports for API, database, shadow database,
  pooler, Studio, Inbucket, analytics, and the edge inspector;
- a temporary project directory containing the required `supabase/` inputs but
  not the shared project's `.temp` link/image state;
- the repository-pinned CLI and its compatible default service images;
- no linked remote project and no TEST or production credentials;
- a cleanup trap that validates the project prefix and Docker labels before
  stopping or deleting anything.

The verifier starts the disposable stack, rebuilds it from the full migration
chain and seed, runs targeted catalog assertions, and then runs the existing RLS
test against credentials obtained from the disposable stack's status JSON. It
passes those credentials in the child process environment and never prints them.

Cleanup must refuse to act if the resolved Docker labels do not match the exact
disposable project id. A failure to prove ownership is a cleanup failure, not a
reason to broaden the deletion target.

### 3. Supabase versions are exact and shared by local and CI

Add an exact `supabase` development dependency and commit the lockfile update.
All package scripts use the repository-local binary. Replace every
`version: latest` Supabase CLI setup in GitHub workflows with the same exact
version.

Add a static test that fails if the package pin and workflow pins diverge. Pick
the actual version only after it passes the disposable full-stack acceptance
matrix below; do not choose a version merely because it is newest. Record the
selected CLI and observed service-image versions in the PR description.

### 4. Shared destructive operations are guarded

Replace the unguarded `db:reset` package script with an explicit
`db:reset:shared` wrapper. The wrapper:

- confirms the resolved repository root and configured project id;
- prints that local database contents will be reconstructed;
- refuses non-interactive execution by default;
- requires the operator to type the exact project id;
- inventories shared containers and volumes before and after the command;
- never stops the stack afterward.

If a shared `db:stop` wrapper is retained, it has the same confirmation
requirements and says explicitly that containers and the project network will
disappear while named volumes are retained. The preferred implementation is to
omit a package-level stop command and document direct stop as an operator action.

### 5. `db:doctor` is read-only

`npm run db:doctor` reports, without changing state:

- Docker availability and active Docker context;
- configured project id and default local ports;
- running, stopped, unhealthy, and missing containers for that project;
- project-scoped named volumes;
- installed CLI version versus the repository pin;
- linked project reference, if present, without displaying credentials;
- configured or observed service-image versions;
- whether Storage and imgproxy are excluded or unhealthy.

It exits nonzero for an identity mismatch, CLI-pin mismatch, or unhealthy
required services. It never starts, stops, resets, links, repairs, or deletes.

### 6. Storage recovery is an operator runbook, not PR automation

The PR documents a separate, explicitly approved recovery procedure. The
procedure synchronizes a compatible CLI/service-image set, recreates a
disposable stack first, and proves two complete `start -> stop -> start` cycles
with Storage healthy before anyone considers rebuilding the shared local stack.

Until that proof exists, `--exclude storage-api,imgproxy` remains an explicit
diagnostic fallback. It must not become a silent default because that would let
tests appear green without exercising Storage.

### 7. The PR is local-only

Implementation and acceptance tests must not call remote Supabase MCP servers,
`supabase link`, `supabase db push`, deployment workflows, or remote database
URLs. A test fixture should fail closed if `SUPABASE_ACCESS_TOKEN`, a linked
project ref, or a non-loopback Supabase URL would be consumed by the verifier.

## File map

| Area | Planned change |
| --- | --- |
| `package.json`, `package-lock.json` | Add the exact CLI pin and lifecycle/verification commands; remove the unguarded shared reset alias. |
| `scripts/local-supabase/*.mjs` | Project identity, port allocation, temp config, status parsing/redaction, Docker-label checks, doctor, verifier, and shared-reset guard. |
| `scripts/local-supabase/*.test.mjs` or the repo's established script-test location | Unit and integration coverage for every safety boundary. |
| `scripts/test-rls-policies.mjs` | Preserve behavior; change only if a small tested adapter is required to accept the verifier's isolated environment. |
| `.github/workflows/*.yml` | Replace every Supabase CLI `latest` selector with the exact repository pin. No deployment behavior changes. |
| `AGENTS.md` | Tell agents the shared stack is user-owned and route migration checks to the isolated verifier. |
| `CLAUDE.md` | Replace shared reset/automatic stop guidance with the new commands and confirmation boundary. |
| `supabase/migrations/CLAUDE.md` | Update the local gate while preserving the Local -> TEST -> production migration order. |
| `scripts/CLAUDE.md` | Document destructive-command guards, label-scoped cleanup, and secret redaction. |
| `docs/development/` or `docs/guides/` | Add the Storage diagnosis/recovery runbook and command reference. |

No file under `supabase/migrations/` is in scope.

## Implementation sequence

### Task 0 — record the baseline and choose the CLI candidate

1. Record the current shared project id, ports, CLI version, container labels,
   service-image versions, named volumes, and a read-only database fingerprint.
2. Enumerate every repository reference to `supabase start`, `stop`, `db reset`,
   `setup-cli`, and `version: latest`.
3. Test candidate exact CLI versions only in a disposable directory. Select the
   first maintained version that passes the full-stack acceptance tests,
   including Storage restarts.
4. Put the chosen version and image evidence in the implementation PR, not in
   this plan retroactively.

**Gate:** no shared-stack mutation has occurred, and the candidate version has
started a full disposable stack with Storage healthy.

### Task 1 — build and test the safety primitives

Implement small modules before orchestration:

- repository and Supabase project identity validation;
- `esynyc-verify-*` disposable-id creation and validation;
- bounded port allocation with retry on bind races;
- temporary config generation that rewrites every local port;
- `.temp`, linked-project, and credential exclusion;
- status JSON parsing and complete key redaction;
- Docker resource lookup by exact project label;
- cleanup refusal for the shared id, missing labels, partial matches, globs, or
  an empty id;
- TTY/exact-project confirmation for shared reset.

Write the negative tests first. They are the load-bearing safety proof.

**Gate:** a unit test cannot coerce cleanup into targeting
`esynyc-lessonsearch-v2`, an unlabelled resource, or a prefix/suffix match.

### Task 2 — add the read-only doctor

Compose the safety primitives into `npm run db:doctor`. Test healthy, stopped,
partially running, version-drifted, unlinked, and Storage-excluded fixtures.
Add a machine-readable mode for tests, while keeping the default output useful
to a developer.

**Gate:** compare Docker and database state before and after every doctor test;
there is no state change.

### Task 3 — add the isolated migration verifier

1. Snapshot the shared stack's container ids, state, named volumes, and database
   fingerprint if it exists.
2. Create a temporary project directory with restrictive permissions.
3. Copy only required Supabase config, migrations, seed, and function inputs;
   explicitly exclude `.temp` and local secrets.
4. Generate a unique config and allocate all non-default ports.
5. Start the full disposable stack using the pinned CLI.
6. Reconstruct the database from the entire migration chain and seed.
7. Run targeted catalog checks plus `npm run test:rls` with isolated credentials.
8. Stop and remove only label-matched disposable resources in a trap.
9. Re-snapshot the shared stack and fail if anything changed.

Add controlled failure injection after stack start and during database checks so
the cleanup path is tested, not merely reviewed.

**Gate:** both success and forced failure leave no `esynyc-verify-*` resources
and preserve the shared snapshot byte-for-byte on the compared fields.

### Task 4 — guard shared lifecycle commands

Add the shared reset wrapper and safe start preflight. Remove or rename the old
unguarded `db:reset` alias so existing muscle memory cannot bypass the guard via
`npm run db:reset`.

Test EOF, non-TTY, wrong project id, wrong typed confirmation, correct typed
confirmation with the destructive subprocess stubbed, and post-command
inventory failure. The wrapper must propagate the underlying CLI exit code.

**Gate:** no automated or non-interactive repo command can reset or stop the
shared stack by default.

### Task 5 — pin versions everywhere

Add the exact CLI dependency, update the lockfile, and replace all workflow
`latest` selectors. Add a drift test that parses both `package.json` and every
workflow rather than relying on a manually maintained file list.

**Gate:** the test fails when any one pin is changed independently and passes
when all pins match.

### Task 6 — update instructions and add the Storage runbook

Update the recursive guidance files together so no directory-level instruction
continues to prescribe the unsafe shared reset/stop sequence. The migration
workflow becomes:

1. isolated local verification;
2. PR CI applies to TEST;
3. direct TEST verification;
4. merge and manually approved production migration;
5. direct production verification.

Document exact meanings of start, reset, and stop; recovery expectations; the
doctor output; the explicit no-Storage fallback; and the separately approved
shared-stack recovery path.

**Gate:** a repository-wide search finds no agent instruction to reset or stop
the shared stack as routine migration cleanup.

## Required tests and acceptance evidence

### Unit and static tests

- Every local port and the project id are rewritten in generated config.
- `.temp`, linked refs, and secrets are not copied.
- Status parsing and error output redact anon and service-role credentials.
- Cleanup rejects the shared project, invalid ids, missing labels, partial
  matches, and empty target sets.
- Shared reset rejects non-interactive and incorrect confirmations.
- Package and workflow CLI pins are exact and identical.
- Documentation/reference scan contains no routine shared reset/stop guidance.

### Disposable-stack integration tests

- Full stack, including Storage and imgproxy, becomes healthy.
- Full migration history and seed apply from a blank disposable database.
- The expected seed fingerprint is present; if it remains current, this is five
  lessons, but the assertion should derive its canonical value from repo seed
  expectations rather than hard-code an incidental count.
- The new observances/holidays constraint is validated after the heritage-tag
  migration reaches this branch through `main`.
- RLS tests receive only the disposable URL and keys.
- A forced mid-run failure triggers scoped cleanup.
- Two `start -> stop -> start` cycles keep Storage healthy.
- No disposable container, network, or volume remains afterward.

### Shared-stack non-interference proof

Capture before and after:

- exact shared container ids and running/health states;
- exact project-scoped Docker volume names;
- a read-only database fingerprint, when the shared database is reachable;
- the shared project's `.temp` contents and linked project ref.

Run the proof once with the shared stack running and once with it stopped. The
verifier must pass in both cases and must not change any captured shared state.

### Repository checks

Run the commands required by the final implementation diff, at minimum:

```bash
npm run db:verify:versions
npm run db:doctor
npm run db:verify:migrations
npm run type-check
npm run lint
npm run test:run
git diff --check
```

If the repository does not retain `test:run` at implementation time, use the
then-current non-watch Vitest command and record it in the PR evidence.

## PR and rollout sequence

1. Open a draft tooling/docs PR with no migration files and no application
   behavior changes.
2. In the PR description, include the incident summary, chosen CLI/image matrix,
   successful forced-failure cleanup evidence, and shared before/after snapshot.
3. Run normal CI. Migration deployment workflows should have nothing to apply.
4. Before declaring the PR ready, inspect issue comments, review summaries,
   line-attached comments, and checks/logs. Address safety findings before style
   or convenience improvements.
5. Merge only after the isolated full-stack and non-interference acceptance gates
   are green.
6. After merge, run the Storage recovery procedure as a separate, explicitly
   authorized local operation. It is not a production deployment and must not
   access TEST or production.

## Rollback

Revert the tooling/docs PR. There is no database rollback because the PR changes
no schema or data. Before or after a revert, disposable resources may be removed
only by exact `esynyc-verify-*` id plus matching Docker labels. The shared stack
must never be included in rollback cleanup.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Dynamic port race between allocation and container bind | Allocate all ports together, use a bounded retry, and never fall back to shared defaults. |
| Cleanup bug targets unrelated Docker state | Require both a strict disposable-id prefix and exact Docker labels; refuse broad, empty, or unresolved targets. |
| Credentials appear in logs | Parse status JSON internally, pass keys only through child-process environment, redact known key shapes, and test failure output. |
| CLI pin is compatible with DB but not Storage | Full-stack and two-restart Storage acceptance are required before choosing the pin. |
| CI and local pins drift | One static test discovers all workflow setup actions and compares them with the package pin. |
| Temporary project inherits remote linkage | Never copy `.temp`; fail closed on linked refs, access tokens, or non-loopback URLs. |
| RLS baseline has unrelated failures | Record and preserve the pre-PR baseline; do not broaden this PR into unrelated RLS repair. |
| Documentation remains contradictory | Update root, migration, script, and agent guidance in one change, then enforce with a repository-wide scan. |

## Exit criteria

- The implementation diff contains no migration, app, UI, edge-function, or
  remote-deployment change.
- The CLI version is exact and identical in local dependencies and all workflows.
- Routine migration verification uses only a disposable project on non-default
  ports.
- Forced failures prove cleanup is narrow and reliable.
- Shared stack state is unchanged when verification runs with it both running
  and stopped.
- Full disposable Storage survives two restart cycles.
- Shared reset cannot run non-interactively or without exact project-id
  confirmation.
- `db:doctor` is proven read-only.
- Recursive repo instructions route agents to the isolated verifier and never
  prescribe automatic shared-stack shutdown.
- PR feedback and checks have been reviewed on all four required surfaces.
