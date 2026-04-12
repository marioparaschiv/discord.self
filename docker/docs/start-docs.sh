#!/usr/bin/env bash
set -euo pipefail

GUIDE_INTERNAL_PORT="${GUIDE_INTERNAL_PORT:-3001}"
WEBSITE_INTERNAL_PORT="${WEBSITE_INTERNAL_PORT:-3000}"

PORT="${GUIDE_INTERNAL_PORT}" node apps/guide/server.js &
guide_pid=$!

PORT="${WEBSITE_INTERNAL_PORT}" node apps/website/server.js &
website_pid=$!

cleanup() {
	kill "${guide_pid}" "${website_pid}" 2>/dev/null || true
	wait "${guide_pid}" 2>/dev/null || true
	wait "${website_pid}" 2>/dev/null || true
}

trap cleanup INT TERM

set +e
wait -n "${guide_pid}" "${website_pid}"
status=$?
set -e

cleanup
exit "${status}"
