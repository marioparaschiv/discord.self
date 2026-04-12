# Local Docs Stack

Runs a fully self-hosted local stack for documentation:

- `minio` for docs/readme object storage
- `meilisearch` for search indices
- `bootstrap` one-shot job that:
  - generates docs
  - uploads docs + split docs + readmes
  - uploads search indices
- `website` app served on `http://localhost:3000`

`website` starts right away. `bootstrap` runs in the background and fills storage/search.

Data is persisted on your host under:

- `docker/docs-stack/data/minio`
- `docker/docs-stack/data/meili`

## Start

```bash
docker compose -f docker/docs-stack/docker-compose.yml up --build
```

Detached mode:

```bash
docker compose -f docker/docs-stack/docker-compose.yml up --build -d
docker compose -f docker/docs-stack/docker-compose.yml logs -f bootstrap
```

Re-run docs/bootstrap only:

```bash
docker compose -f docker/docs-stack/docker-compose.yml up bootstrap
```

## Useful endpoints

- Website: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (`minioadmin` / `minioadmin`)
- Meilisearch: `http://localhost:7700`

## Reset all stack data

```bash
docker compose -f docker/docs-stack/docker-compose.yml down -v
rm -rf docker/docs-stack/data
```
