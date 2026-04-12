# discord.self

`discord.self` is a user-account-focused fork of `discord.js`, split into scoped packages under `@discord.self/*`.

## Packages

- `@discord.self/client`: high-level client runtime
- `@discord.self/ws`: gateway transport
- `@discord.self/rest`: REST transport
- `@discord.self/identity`: browser/session identity for REST + gateway
- `@discord.self/core`: typed API wrappers over REST/gateway
- `@discord.self/collection`, `@discord.self/formatters`, `@discord.self/util`: shared utilities
- `@discord.self/voice`: voice runtime
- `@discord.self/docgen`, `@discord.self/scripts`, `@discord.self/actions`: internal tooling
- `@discord.self/api-extractor*`: API model/extractor tooling

## Quick Start

```sh
pnpm add @discord.self/client
```

```ts
import { Client, Events } from '@discord.self/client';

const client = new Client({ intents: 0 });

client.once(Events.ClientReady, (ready) => {
	console.log(`ready: ${ready.user.tag}`);
});

await client.login(process.env.DISCORD_TOKEN);
```

## Docs

- Package docs artifacts live in `packages/*/docs`.
- Build all docs: `pnpm docs`
- Run local docs stack: `pnpm docs:stack:up`

## Contributing

Read [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md).

## Star History

<a href="https://www.star-history.com/">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=marioparaschiv/discord.self&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=marioparaschiv/discord.self&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=marioparaschiv/discord.self&type=date&legend=top-left" />
 </picture>
</a>
