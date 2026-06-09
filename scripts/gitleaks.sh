#!/usr/bin/env sh
set -eu

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
scan_command="${1:-git}"

if [ "$#" -gt 0 ]; then
  shift
fi

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks "$scan_command" \
    --config "$repo_root/.gitleaks.toml" \
    --gitleaks-ignore-path "$repo_root/.gitleaksignore" \
    --redact \
    --verbose \
    "$@" \
    "$repo_root"
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm \
    -v "$repo_root:/repo:ro" \
    ghcr.io/gitleaks/gitleaks:latest \
    "$scan_command" \
    --config /repo/.gitleaks.toml \
    --gitleaks-ignore-path /repo/.gitleaksignore \
    --redact \
    --verbose \
    "$@" \
    /repo
fi

echo "gitleaks is not installed and Docker is not available." >&2
echo "Install gitleaks locally or run Docker before using pnpm secrets:scan." >&2
exit 127
