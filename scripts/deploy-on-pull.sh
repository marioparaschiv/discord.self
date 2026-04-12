#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"
DEPLOY_CMD="${DEPLOY_CMD:-}"

git pull --ff-only "${REMOTE}" "${BRANCH}"

if [ -f "pnpm-lock.yaml" ]; then
	pnpm install --frozen-lockfile
fi

pnpm run build

if [ -n "${DEPLOY_CMD}" ]; then
	sh -c "${DEPLOY_CMD}"
fi

echo "Deployment script completed."
