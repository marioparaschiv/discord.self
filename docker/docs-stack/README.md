# Docs Stack (Local + Production)

Self-hosted docs stack:

- `minio` for docs/readme object storage
- `meilisearch` for search indices
- `bootstrap` one-shot job for docs generation/upload/indexing
- `website` app on `http://localhost:3000`

## Configure

1. Copy env template:

```bash
cp docker/docs-stack/.env.example .env
```

2. For production, set strong secrets at minimum:

- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `DOCS_STORAGE_SECRET_ACCESS_KEY`
- `READMES_STORAGE_SECRET_ACCESS_KEY`
- `SEARCH_API_KEY`
- `NEXT_PUBLIC_SEARCH_API_KEY`

`NEXT_PUBLIC_*` values are baked into the website client bundle, so changing them requires `--build`.

## Start

```bash
docker compose -f docker/docs-stack/docker-compose.yml up -d --build
```

Normal restart:

```bash
docker compose -f docker/docs-stack/docker-compose.yml up -d
```

## Bootstrap Docs

Full bootstrap:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm bootstrap
```

Upload/index only:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload bootstrap
```

Package-scoped upload/index:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload -e BOOTSTRAP_PACKAGES=identity,rest bootstrap
```

`BOOTSTRAP_PACKAGES` accepts comma-separated package names, with or without `@discord.self/` prefix.

## Endpoints

- Website: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Meilisearch: `http://localhost:7700`

## Reset Data

```bash
docker compose -f docker/docs-stack/docker-compose.yml down -v
```
