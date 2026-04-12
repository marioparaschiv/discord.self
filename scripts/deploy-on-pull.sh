#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"
DEPLOY_CMD="${DEPLOY_CMD:-}"
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-1}"
SELF_HOSTED="${SELF_HOSTED:-0}"

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
elif [ "${SELF_HOSTED}" = "1" ]; then
	docker compose -f docker/docs-stack/docker-compose.yml up -d --build
fi

echo "Deployment script completed."
