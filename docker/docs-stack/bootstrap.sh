#!/usr/bin/env sh
set -eu

cd /workspace

MODE="${1:-${BOOTSTRAP_MODE:-full}}"
SELECTED_PACKAGES="$(printf '%s' "${BOOTSTRAP_PACKAGES:-}" | tr ',' '\n' | sed -E 's#^@discord(\.self|js)/##' | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

case "$MODE" in
	full | upload)
		;;
	*)
		echo "[bootstrap] unsupported mode: $MODE (expected: full or upload)"
		exit 1
		;;
esac

has_selected_package() {
	if [ -z "$SELECTED_PACKAGES" ]; then
		return 1
	fi

	printf '%s\n' "$SELECTED_PACKAGES" | grep -Fx "$1" >/dev/null 2>&1
}

run_selected_docs() {
	printf '%s\n' "$SELECTED_PACKAGES" | while IFS= read -r package_name; do
		[ -n "$package_name" ] || continue
		echo "[bootstrap] generating docs for $package_name..."
		pnpm --filter "@discord.self/$package_name" docs
	done
}

echo "[bootstrap] waiting for MinIO..."
until curl -fsS "http://minio:9000/minio/health/live" >/dev/null; do
	sleep 1
done

echo "[bootstrap] waiting for Meilisearch..."
until curl -fsS "http://meilisearch:7700/health" >/dev/null; do
	sleep 1
done

corepack enable

if [ "${BOOTSTRAP_FORCE_INSTALL:-false}" = "true" ] || [ ! -d /workspace/node_modules ]; then
	echo "[bootstrap] installing dependencies..."
	pnpm install --frozen-lockfile
else
	echo "[bootstrap] using existing node_modules (set BOOTSTRAP_FORCE_INSTALL=true to reinstall)"
fi

echo "[bootstrap] ensuring object-storage buckets..."
cd /workspace/packages/actions
node - <<'NODE'
const {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const endpoint = process.env.DOCS_STORAGE_ENDPOINT;
const accessKeyId = process.env.DOCS_STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.DOCS_STORAGE_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
const buckets = Array.from(
  new Set([process.env.DOCS_STORAGE_BUCKET, process.env.READMES_STORAGE_BUCKET].filter(Boolean)),
);

if (!endpoint || !accessKeyId || !secretAccessKey || buckets.length === 0) {
  throw new Error('Missing object-storage environment variables for bootstrap.');
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const ensureBucket = async (bucket) => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[bootstrap] bucket exists: ${bucket}`);
    return;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    const code = error?.name ?? '';
    if (status !== 404 && code !== 'NotFound' && code !== 'NoSuchBucket') {
      throw error;
    }
  }

  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`[bootstrap] bucket created: ${bucket}`);
};

const ensurePublicRead = async (bucket) => {
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });

  await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }));
  console.log(`[bootstrap] public-read configured: ${bucket}`);
};

const run = async () => {
  for (const bucket of buckets) {
    await ensureBucket(bucket);
    await ensurePublicRead(bucket);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
cd /workspace

if [ "$MODE" = "full" ]; then
	echo "[bootstrap] mode=full"
	if [ -n "$SELECTED_PACKAGES" ]; then
		echo "[bootstrap] package filter: $SELECTED_PACKAGES"
	fi

	echo "[bootstrap] building docs toolchain..."
	pnpm --filter @discord.self/api-extractor-model build
	pnpm --filter @discord.self/api-extractor-utils build
	pnpm --filter @discord.self/api-extractor build
	pnpm --filter @discord.self/docgen build
	pnpm --filter @discord.self/scripts build

	echo "[bootstrap] building actions..."
	pnpm --filter @discord.self/actions build

	echo "[bootstrap] generating package documentation..."
	if [ -n "$SELECTED_PACKAGES" ]; then
		if has_selected_package core || has_selected_package rest || has_selected_package ws; then
			# Ensure generated typings consumed by core/rest/ws docs are fresh and use local package names.
			pnpm --filter @discord.self/rest build
			pnpm --filter @discord.self/ws build
		fi

		run_selected_docs
	else
		pnpm --filter @discord.self/collection docs
		pnpm --filter @discord.self/util docs

		# Ensure generated typings consumed by core docs are fresh and use local package names.
		pnpm --filter @discord.self/rest build
		pnpm --filter @discord.self/ws build

		pnpm --filter @discord.self/rest docs
		pnpm --filter @discord.self/ws docs
		pnpm --filter @discord.self/core docs

		pnpm --filter @discord.self/client docs
		pnpm --filter @discord.self/formatters docs
		pnpm --filter @discord.self/identity docs
		pnpm --filter @discord.self/voice docs

		# Optional packages in forks may not always match @discord.self/* naming.
		pnpm --filter @discord.self/brokers docs
		pnpm --filter @discord.self/builders docs
		pnpm --filter @discord.self/next docs
		pnpm --filter @discord.self/proxy docs
		pnpm --filter @discord.self/structures docs
	fi
else
	echo "[bootstrap] mode=upload (skipping docs generation)"
	if [ -n "$SELECTED_PACKAGES" ]; then
		echo "[bootstrap] package filter: $SELECTED_PACKAGES"
	fi

	if [ "${BOOTSTRAP_FORCE_ACTIONS_BUILD:-false}" = "true" ] || [ ! -f /workspace/packages/actions/dist/uploadDocumentation/index.js ] || [ ! -f /workspace/packages/scripts/dist/src/index.js ] || [ ! -f /workspace/packages/api-extractor-model/dist/index.js ] || [ ! -f /workspace/packages/api-extractor-utils/dist/index.js ]; then
		echo "[bootstrap] upload prerequisites missing; building toolchain + actions..."
		pnpm --filter @discord.self/api-extractor-model build
		pnpm --filter @discord.self/api-extractor-utils build
		pnpm --filter @discord.self/scripts build
		pnpm --filter @discord.self/actions build
	fi
fi

echo "[bootstrap] uploading docs manifests + package docs..."
node packages/actions/dist/uploadDocumentation/index.js

echo "[bootstrap] uploading split documentation..."
node packages/actions/dist/uploadSplitDocumentation/index.js

echo "[bootstrap] uploading package README files..."
node packages/actions/dist/uploadReadmeFiles/index.js

echo "[bootstrap] uploading search indices..."
node packages/actions/dist/uploadSearchIndices/index.js

echo "[bootstrap] complete"
