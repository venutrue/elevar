#!/usr/bin/env bash
set -euo pipefail

ok() { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
fail() { echo "❌ $*"; exit 1; }

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  fail "You are on '$branch'. Create/use a feature branch before opening a PR."
else
  ok "Current branch is '$branch'."
fi

current_commit="$(git rev-parse --short HEAD)"
ok "Current commit: ${current_commit}"

if git show-ref --verify --quiet "refs/heads/${branch}"; then
  ok "Branch exists locally: ${branch}"
fi

has_remote=1
if [[ -z "$(git remote)" ]]; then
  warn "No git remotes configured. Add one (for example: git remote add origin <repo-url>)."
  warn "Branch is local-only until a remote is configured and branch is pushed."
  has_remote=0
else
  ok "Configured remotes: $(git remote | tr '\n' ' ')"
fi

if [[ "$has_remote" -eq 1 ]] && git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{u})"
  ok "Upstream tracking branch: $upstream"
else
  warn "No upstream set for '$branch'. Set one with: git push -u origin $branch"
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Working tree has uncommitted changes. Commit before creating PR."
else
  ok "Working tree is clean."
fi

if [[ "$has_remote" -eq 1 ]] && git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  counts="$(git rev-list --left-right --count HEAD...@{u})"
  ahead="${counts##* }"
  behind="${counts%% *}"
  if [[ "$ahead" -gt 0 ]]; then
    ok "Branch is ahead of upstream by $ahead commit(s)."
  else
    warn "Branch has no commits ahead of upstream. Push or commit before PR."
  fi

  if [[ "$behind" -gt 0 ]]; then
    warn "Branch is behind upstream by $behind commit(s). Pull/rebase may be needed."
  fi
fi

if [[ "$has_remote" -eq 0 ]]; then
  fail "PR is blocked: no remote configured."
fi

ok "PR readiness check complete."
