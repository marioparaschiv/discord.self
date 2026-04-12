<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.gg/djs"><img src="https://img.shields.io/badge/join_us-on_discord-5865F2?logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/identity"><img src="https://img.shields.io/npm/v/@discord.self/identity.svg?maxAge=3600" alt="npm version" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/identity"><img src="https://img.shields.io/npm/dt/@discord.self/identity.svg?maxAge=3600" alt="npm downloads" /></a>
		<a href="https://github.com/discordjs/discord.js/actions"><img src="https://github.com/discordjs/discord.js/actions/workflows/tests.yml/badge.svg" alt="Tests status" /></a>
		<a href="https://github.com/discordjs/discord.js/commits/main/packages/identity"><img alt="Last commit." src="https://img.shields.io/github/last-commit/discordjs/discord.js?logo=github&logoColor=ffffff&path=packages%2Fidentity" /></a>
		<a href="https://opencollective.com/discordjs"><img src="https://img.shields.io/opencollective/backers/discordjs?maxAge=3600&logo=opencollective" alt="backers" /></a>
	</p>
</div>

## About

`@discord.self/identity` provides Discord browser identity emulation built on top of [`httpcloak`](https://www.npmjs.com/package/httpcloak).

It helps you:

- discover realistic browser headers from a warmed session
- generate Discord-compatible `x-super-properties`
- reuse and persist session state between runs
- expose a request function you can plug into your REST flow

## Installation

**Node.js 22.12.0 or newer is required.**

```sh
npm install @discord.self/identity
yarn add @discord.self/identity
pnpm add @discord.self/identity
bun add @discord.self/identity
```

## Quick Start

```ts
import { createDiscordIdentity } from '@discord.self/identity';

const identity = await createDiscordIdentity();

const headers = await identity.getHeaders();
console.log(headers['user-agent']);
console.log(headers['x-super-properties']);
```

## Use With REST

```ts
import { REST } from '@discord.self/rest';
import { createDiscordIdentity } from '@discord.self/identity';

const identity = await createDiscordIdentity({
	token: process.env.DISCORD_TOKEN,
});

const rest = new REST({
	version: '10',
	identityRequestHandler: identity.getRequestHandler(),
}).setToken(process.env.DISCORD_TOKEN!);
```

## Persistent Sessions

Use `SQLiteAdapter` to cache discovered profile/build metadata and rehydrate sessions.

```ts
import { SQLiteAdapter, createDiscordIdentity } from '@discord.self/identity';

const storage = new SQLiteAdapter('./data/discord-identity.sqlite');

const identity = await createDiscordIdentity({
	storage,
	token: process.env.DISCORD_TOKEN,
	seedCookies: {
		__dcfduid: 'example-cookie',
	},
});

await identity.ensureReady();
```

## Build Metadata Utilities

You can fetch Discord client/native build metadata directly:

```ts
import { getDiscordBuildMetadata } from '@discord.self/identity';

const metadata = await getDiscordBuildMetadata();
console.log(metadata.clientBuildNumber, metadata.nativeBuildNumber);
```

## Links

- [Website][website] ([source][website-source])
- [Documentation][documentation]
- [Guide][guide] ([source][guide-source])
- [discord.js Discord server][discord]
- [Discord Developers Discord server][discord-developers]
- [GitHub][source]
- [npm][npm]

## Contributing

Before creating an issue, please ensure that it hasn't already been reported/suggested, and double-check the
[documentation][documentation].  
See [the contribution guide][contributing] if you'd like to submit a PR.

## Help

If you don't understand something in the documentation, you are experiencing problems, or you just need a gentle nudge in the right direction, please don't hesitate to join our official [discord.js Server][discord].

[website]: https://discord.js.org
[website-source]: https://github.com/discordjs/discord.js/tree/main/apps/website
[documentation]: https://discord.js.org/docs/packages/identity/stable
[guide]: https://discordjs.guide
[guide-source]: https://github.com/discordjs/discord.js/tree/main/apps/guide
[discord]: https://discord.gg/djs
[discord-developers]: https://discord.gg/discord-developers
[source]: https://github.com/discordjs/discord.js/tree/main/packages/identity
[npm]: https://www.npmjs.com/package/@discord.self/identity
[contributing]: https://github.com/discordjs/discord.js/blob/main/.github/CONTRIBUTING.md
