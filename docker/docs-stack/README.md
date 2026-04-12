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

Run bootstrap (docs upload + indexing) only when needed:

```bash
docker compose -f docker/docs-stack/docker-compose.yml --profile bootstrap up bootstrap
docker compose -f docker/docs-stack/docker-compose.yml logs -f bootstrap
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
