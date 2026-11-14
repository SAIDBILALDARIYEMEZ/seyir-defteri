#!/usr/bin/env bash
# SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
# Publishes dist/ to the gh-pages branch (GitHub Pages). Run via: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."
remote="$(git remote get-url origin)"
sha="$(git rev-parse --short HEAD)"
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy ${sha}"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "Deployed ${sha} to gh-pages"
