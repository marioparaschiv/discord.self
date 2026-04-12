#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"
DEPLOY_CMD="${DEPLOY_CMD:-}"
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-1}"

git pull --ff-only "${REMOTE}" "${BRANCH}"

if [ -f "pnpm-lock.yaml" ]; then
	pnpm install --frozen-lockfile
fi

if [ "${RUN_BOOTSTRAP}" = "1" ]; then
	pnpm run docs:stack:bootstrap
fi

pnpm run build

if [ -n "${DEPLOY_CMD}" ]; then
	sh -c "${DEPLOY_CMD}"
fi

echo "Deployment script completed."
