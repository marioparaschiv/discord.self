<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.gg/djs"><img src="https://img.shields.io/badge/join_us-on_discord-5865F2?logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/ws"><img src="https://img.shields.io/npm/v/@discord.self/ws.svg?maxAge=3600" alt="npm version" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/ws"><img src="https://img.shields.io/npm/dt/@discord.self/ws.svg?maxAge=3600" alt="npm downloads" /></a>
		<a href="https://github.com/discordjs/discord.js/actions"><img src="https://github.com/discordjs/discord.js/actions/workflows/tests.yml/badge.svg" alt="Build status" /></a>
		<a href="https://github.com/discordjs/discord.js/commits/main/packages/ws"><img alt="Last commit." src="https://img.shields.io/github/last-commit/discordjs/discord.js?logo=github&logoColor=ffffff&path=packages%2Fws" /></a>
		<a href="https://codecov.io/gh/discordjs/discord.js"><img src="https://codecov.io/gh/discordjs/discord.js/branch/main/graph/badge.svg?precision=2&flag=ws" alt="Code coverage" /></a>
		<a href="https://opencollective.com/discordjs"><img src="https://img.shields.io/opencollective/backers/discordjs?maxAge=3600&logo=opencollective" alt="backers" /></a>
	</p>
	<p>
		<a href="https://vercel.com/?utm_source=discordjs&utm_campaign=oss"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-vercel.svg" alt="Vercel" /></a>
		<a href="https://www.cloudflare.com"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-workers.png" alt="Cloudflare Workers" height="44" /></a>
	</p>
</div>

## About

`@discord.self/ws` is a powerful wrapper around Discord's gateway.

## Installation

**Node.js 22.12.0 or newer is required.**

```sh
npm install @discord.self/ws
yarn add @discord.self/ws
pnpm add @discord.self/ws
bun add @discord.self/ws
```

### Optional packages

- [zlib-sync](https://www.npmjs.com/package/zlib-sync) for WebSocket data compression and inflation (`npm install zlib-sync`)
- [bufferutil](https://www.npmjs.com/package/bufferutil) for a much faster WebSocket connection (`npm install bufferutil`)

## Example usage

The example uses [ES modules](https://nodejs.org/api/esm.html#enabling).

```ts
import { WebSocketManager, WebSocketShardEvents, CompressionMethod } from '@discord.self/ws';
import { REST } from '@discord.self/rest';
import { Routes } from 'discord-api-types/v10';

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const manager = new WebSocketManager({
	token: process.env.DISCORD_TOKEN,
	intents: 0,
	fetchGatewayInformation() {
		return rest.get(Routes.gateway());
	},
	// uncomment if you have zlib-sync installed and want to use compression
	// compression: CompressionMethod.ZlibSync,

	// alternatively, we support compression using node's native `node:zlib` module:
	// compression: CompressionMethod.ZlibNative,
});

manager.on(WebSocketShardEvents.Dispatch, (event) => {
	// Process gateway events here.
});

await manager.connect();
```

## Single session

`@discord.self/ws` is single-session only in this fork. User accounts do not support sharding, so the manager always maintains one gateway connection and one resumable session.

## Links

- [Website][website] ([source][website-source])
- [Documentation][documentation]
- [Guide][guide] ([source][guide-source])
  Also see the v13 to v14 [Update Guide][guide-update], which includes updated and removed items from the library.
- [discord.js Discord server][discord]
- [Discord Developers Discord server][discord-developers]
- [GitHub][source]
- [npm][npm]
- [Related libraries][related-libs]

## Contributing

Before creating an issue, please ensure that it hasn't already been reported/suggested, and double-check the
[documentation][documentation].  
See [the contribution guide][contributing] if you'd like to submit a PR.

## Help

If you don't understand something in the documentation, you are experiencing problems, or you just need a gentle nudge in the right direction, please don't hesitate to join our official [discord.js Server][discord].

[website]: https://discord.js.org
[website-source]: https://github.com/discordjs/discord.js/tree/main/apps/website
[documentation]: https://discord.js.org/docs/packages/ws/stable
[guide]: https://discordjs.guide
[guide-source]: https://github.com/discordjs/discord.js/tree/main/apps/guide
[guide-update]: https://discordjs.guide/legacy/additional-info/changes-in-v14
[discord]: https://discord.gg/djs
[discord-developers]: https://discord.gg/discord-developers
[source]: https://github.com/discordjs/discord.js/tree/main/packages/ws
[npm]: https://www.npmjs.com/package/@discord.self/ws
[related-libs]: https://discord.com/developers/docs/topics/community-resources#libraries
[contributing]: https://github.com/discordjs/discord.js/blob/main/.github/CONTRIBUTING.md
