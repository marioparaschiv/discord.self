# @discord.self/api-extractor

TypeScript API surface analysis and `.d.ts` rollup tooling.

## Install

```sh
pnpm add -D @discord.self/api-extractor
```

## Example

```sh
pnpm api-extractor run --local
```

Typical use:

- generate/update `.api.json`
- detect API changes in CI
- generate rollup declaration files
