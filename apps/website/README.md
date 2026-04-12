# Website App

This app serves package docs and generated API content for `discord.self`.

## Local Development

```sh
pnpm --filter website install
pnpm --filter website dev
```

## Data Sources

- split package docs generated under `packages/*/docs`
- search indices uploaded by the docs bootstrap pipeline
