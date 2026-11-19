#!/usr/bin/env python3
"""Guard rails for workflows that connect to PRODUCTION with a database URL.

The connection string comes from the SUPABASE_DB_URL_PROD repo secret. It is
never printed. Two modes:

  prod-db-url.py check
      Validate the connection string and mask its password in the job log.
      Exits non-zero, with a GitHub `::error::` line, if it is missing,
      malformed, points at any project other than production, or uses the
      transaction pooler.

  some-command 2>&1 | prod-db-url.py redact
      Copy stdin to stdout line by line, replacing the connection string and
      its password with `***`. Log masking does not cover text that a workflow
      copies into a step summary or a PR comment, so anything published that
      way is piped through this first.

backup-production.yml has no checkout step and carries an inline copy of the
`check` logic. Keep the two in step.
"""

import os
import sys
from urllib.parse import unquote, urlsplit

PROD_REF = "jxlxtzkmicfhchkhiojz"
ENV_VAR = "SUPABASE_DB_URL_PROD"


def fail(message):
    print(f"::error::{ENV_VAR} {message}")
    sys.exit(1)


def parse():
    raw = os.environ.get(ENV_VAR, "").strip()
    if not raw:
        fail(
            "is not set. It must hold the production session-pooler connection "
            "string (postgresql://postgres.<ref>:<password>@<host>:5432/postgres)."
        )
    try:
        url = urlsplit(raw)
        port = url.port
    except ValueError:
        fail("is not a valid connection string.")
    if url.scheme not in ("postgresql", "postgres"):
        fail("must start with postgresql://")
    if not url.hostname or not url.username or not url.password:
        fail("must include a user, a password and a host.")
    if PROD_REF not in f"{url.username}@{url.hostname}":
        fail("does not reference the production project. Refusing to continue.")
    if port == 6543:
        fail("uses port 6543 (transaction pooler). Use the session pooler on port 5432.")
    return raw, url, port


def secrets_of(raw, url):
    """Every form of the secret that could appear in tool output, longest first."""
    forms = {raw, url.password, unquote(url.password)}
    return sorted((f for f in forms if f), key=len, reverse=True)


def check():
    raw, url, port = parse()
    for secret in {url.password, unquote(url.password)}:
        print(f"::add-mask::{secret}")
    print(f"Connection string OK: host={url.hostname} port={port or 5432}")


def redact():
    raw, url, _ = parse()
    forms = secrets_of(raw, url)
    for line in sys.stdin:
        for secret in forms:
            line = line.replace(secret, "***")
        sys.stdout.write(line)
        sys.stdout.flush()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "check":
        check()
    elif mode == "redact":
        redact()
    else:
        print("usage: prod-db-url.py check | redact", file=sys.stderr)
        sys.exit(2)
