# Local Docs Stack

Runs a fully self-hosted local stack for documentation:

- `minio` for docs/readme object storage
- `meilisearch` for search indices
- `bootstrap` one-shot job that:
  - generates docs
  - uploads docs + split docs + readmes
  - uploads search indices
- `website` app served on `http://localhost:3000`

`website` starts right away. `bootstrap` is an on-demand job that fills storage/search when you run it.

Data is persisted in Docker named volumes:

- `docs-stack_minio_data`
- `docs-stack_meili_data`

## Start

First build:

```bash
docker compose -f docker/docs-stack/docker-compose.yml up -d --build
```

Normal restart (no rebuild):

```bash
docker compose -f docker/docs-stack/docker-compose.yml up -d
```

Run full bootstrap (build docs + upload + indexing) when needed:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm bootstrap
```

Fast refresh after building docs locally (upload + indexing only, no docs rebuild):

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload bootstrap
```

`upload` mode does not require restarting `website`.

Fast refresh for specific packages only:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload -e BOOTSTRAP_PACKAGES=identity,rest bootstrap
```

`BOOTSTRAP_PACKAGES` accepts comma-separated package names (with or without `@discord.self/` prefix).

If you changed any upload tooling code under `packages/actions` or `packages/scripts`, force a rebuild once:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload -e BOOTSTRAP_FORCE_ACTIONS_BUILD=true bootstrap
```

## Upload parallelism tuning

Local MinIO now defaults to high parallelism automatically.

You can override upload behavior with env vars when running `bootstrap`:

- `DOCS_UPLOAD_CONCURRENCY` (default local: `64`)
- `DOCS_UPLOAD_INTERVAL_MS` (default local: disabled)
- `DOCS_UPLOAD_INTERVAL_CAP` (default local: disabled)
- `DOCS_MANIFEST_UPLOAD_CONCURRENCY` (default local: `32`)
- `SEARCH_UPLOAD_CONCURRENCY` (default local: `20`)

Example:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm \
  -e BOOTSTRAP_MODE=upload \
  -e DOCS_UPLOAD_CONCURRENCY=96 \
  -e SEARCH_UPLOAD_CONCURRENCY=32 \
  bootstrap
```

## Recommended local loop (fast)

1. Keep stack running:

```bash
docker compose -f docker/docs-stack/docker-compose.yml up -d
```

2. Build only what changed on host (example):

```bash
pnpm --filter @discord.self/identity docs
```

3. Push docs/search to local MinIO+Meili:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload bootstrap
```

Only one package changed:

```bash
pnpm --filter @discord.self/identity docs
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap run --rm -e BOOTSTRAP_MODE=upload -e BOOTSTRAP_PACKAGES=identity bootstrap
```

## Useful endpoints

- Website: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (`minioadmin` / `minioadmin`)
- Meilisearch: `http://localhost:7700`

## Reset all stack data

```bash
docker compose -f docker/docs-stack/docker-compose.yml down -v
```
