#!/usr/bin/env sh
set -e

cd "$(dirname "$0")/.."

remote=${GIT_REMOTE:-preordercard}
branch=${GIT_BRANCH:-main}
message=${1:-"Auto commit $(date -u +%Y-%m-%dT%H:%M:%SZ)"}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository."
  exit 1
fi

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  echo "Error: git remote '$remote' is not configured."
  exit 1
fi

if git diff --quiet --ignore-submodules --cached && git diff --quiet --ignore-submodules; then
  echo "No changes to commit."
else
  git add -A
  if git diff --cached --quiet --ignore-submodules; then
    echo "No staged changes after git add. Nothing to commit."
  else
    git commit -m "$message"
  fi
fi

git push "$remote" "$branch"
echo "Pushed to $remote/$branch."
