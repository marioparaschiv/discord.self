#!/usr/bin/env sh
set -eu

cd /workspace

echo "[bootstrap] waiting for MinIO..."
until curl -fsS "http://minio:9000/minio/health/live" >/dev/null; do
	sleep 1
done

echo "[bootstrap] waiting for Meilisearch..."
until curl -fsS "http://meilisearch:7700/health" >/dev/null; do
	sleep 1
done

echo "[bootstrap] installing dependencies..."
corepack enable
pnpm install --frozen-lockfile

echo "[bootstrap] ensuring object-storage buckets..."
cd /workspace/packages/actions
node - <<'NODE'
const {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const endpoint = process.env.CF_R2_DOCS_URL;
const accessKeyId = process.env.CF_R2_DOCS_ACCESS_KEY_ID;
const secretAccessKey = process.env.CF_R2_DOCS_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
const buckets = Array.from(
  new Set([process.env.CF_R2_DOCS_BUCKET, process.env.CF_R2_READMES_BUCKET].filter(Boolean)),
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

echo "[bootstrap] building docs toolchain..."
pnpm --filter @discord.self/api-extractor-model build
pnpm --filter @discord.self/api-extractor-utils build
pnpm --filter @discord.self/api-extractor build
pnpm --filter @discord.self/docgen build
pnpm --filter @discord.self/scripts build

echo "[bootstrap] building actions..."
pnpm --filter @discord.self/actions build

echo "[bootstrap] generating package documentation..."
pnpm --filter @discord.self/brokers docs
pnpm --filter @discord.self/builders docs
pnpm --filter @discord.self/collection docs
pnpm --filter @discord.self/core docs
pnpm --filter @discord.self/discord.js docs
pnpm --filter @discord.self/formatters docs
pnpm --filter @discord.self/identity docs
pnpm --filter @discord.self/next docs
pnpm --filter @discord.self/proxy docs
pnpm --filter @discord.self/rest docs
pnpm --filter @discord.self/structures docs
pnpm --filter @discord.self/util docs
pnpm --filter @discord.self/voice docs
pnpm --filter @discord.self/ws docs

echo "[bootstrap] uploading docs manifests + package docs..."
node packages/actions/dist/uploadDocumentation/index.js

echo "[bootstrap] uploading split documentation..."
node packages/actions/dist/uploadSplitDocumentation/index.js

echo "[bootstrap] uploading package README files..."
node packages/actions/dist/uploadReadmeFiles/index.js

echo "[bootstrap] uploading search indices..."
node packages/actions/dist/uploadSearchIndices/index.js

echo "[bootstrap] complete"
