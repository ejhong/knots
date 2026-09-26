#!/bin/bash
# Prepares a Claude Code on the web session: the site's npm packages, the simulation's Python
# environment (sim/, uv), and the pre-installed Chromium for scripts/shot.ts. Local machines skip it.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# The site: Astro, vitest, the Playwright library (no browser download).
npm install --no-audit --no-fund

# The simulation: install the locked environment without touching uv.lock.
export PATH="$HOME/.local/bin:$PATH"
command -v uv >/dev/null 2>&1 || python3 -m pip install --user --quiet uv || true
if command -v uv >/dev/null 2>&1; then
  (cd sim && uv sync --frozen)
else
  echo "session-start: uv is not available; skipped the sim/ environment" >&2
fi

# scripts/shot.ts: the project's Playwright may expect a Chromium build this container lacks.
if [ -x /opt/pw-browsers/chromium ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export SHOT_CHROMIUM=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
