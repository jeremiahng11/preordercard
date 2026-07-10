#!/usr/bin/env sh
set -e

# Deploy current main branch to Railway. Requires a clean working tree and Railway CLI login.

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is dirty. Commit or stash changes before deploying."
  exit 1
fi

branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  echo "Error: deploy script must run from the main branch. Current branch: $branch"
  exit 1
fi

if ! git remote get-url preordercard >/dev/null 2>&1; then
  echo "Error: git remote 'preordercard' not configured."
  exit 1
fi

git push preordercard main

echo "Pushed main to preordercard. Starting Railway deploy..."

railway up --detach

echo "Railway deployment triggered."