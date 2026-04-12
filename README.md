<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.gg/djs"><img src="https://img.shields.io/badge/join_us-on_discord-5865F2?logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/client"><img src="https://img.shields.io/npm/v/%40discord.self%2Fclient.svg?maxAge=3600" alt="npm version" /></a>
		<a href="https://www.npmjs.com/package/@discord.self/client"><img src="https://img.shields.io/npm/dt/%40discord.self%2Fclient.svg?maxAge=3600" alt="npm downloads" /></a>
		<a href="https://github.com/discordjs/discord.js/actions"><img src="https://github.com/discordjs/discord.js/actions/workflows/tests.yml/badge.svg" alt="Tests status" /></a>
		<a href="https://github.com/discordjs/discord.js/commits/main"><img src="https://img.shields.io/github/last-commit/discordjs/discord.js.svg?logo=github&logoColor=ffffff" alt="Last commit." /></a>
		<a href="https://github.com/discordjs/discord.js/graphs/contributors"><img src="https://img.shields.io/github/contributors/discordjs/discord.js.svg?maxAge=3600&logo=github&logoColor=fff&color=00c7be" alt="contributors" /></a>
		<a href="https://opencollective.com/discordjs"><img src="https://img.shields.io/opencollective/backers/discordjs?maxAge=3600&logo=opencollective" alt="backers" /></a>
		<a href="https://codecov.io/gh/discordjs/discord.js"><img src="https://codecov.io/gh/discordjs/discord.js/branch/main/graph/badge.svg?precision=2" alt="Code coverage" /></a>
	</p>
	<p>
		<a href="https://vercel.com/?utm_source=discordjs&utm_campaign=oss"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-vercel.svg" alt="Vercel" /></a>
		<a href="https://www.cloudflare.com"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-workers.png" alt="Cloudflare Workers" height="44" /></a>
	</p>
</div>

## About

This repository is a patched, user-account-focused fork of `discord.js`. The workspace is being reduced to the runtime pieces needed for a self-account client and its transport layers.

## Packages

- `@discord.self/client` ([source][source]) - The main client package being adapted for user-account sessions
- `@discord.self/collection` ([source][collection-source]) - A utility data structure used by the runtime
- `@discord.self/core` ([source][core-source]) - A low-level convenience layer over REST and gateway
- `@discord.self/formatters` ([source][formatters-source]) - Shared string formatting helpers
- `@discord.self/identity` ([source][identity-source]) - Shared browser/session identity for REST and gateway
- `@discord.self/rest` ([source][rest-source]) - The REST transport layer
- `@discord.self/util` ([source][util-source]) - Shared utility helpers
- `@discord.self/voice` ([source][voice-source]) - Voice support kept in-tree for later compatibility work
- `@discord.self/ws` ([source][ws-source]) - The gateway transport layer

## Links

- [GitHub][repo]
- [Source package][source]
- [Documentation][documentation]
- [Guide][guide]
- [Discord Developers Discord server][discord-developers]
- [Related libraries][related-libs]

## Contributing

Please read through our [contribution guidelines][contributing] before starting a pull request. Before creating your own issue or pull request, check whether the work already exists and keep changes scoped.

## Help

If you need API reference, inspect the package sources directly while the public docs are being trimmed with the rest of the workspace.

[repo]: https://github.com/marioparaschiv/discord.self
[discord-developers]: https://discord.gg/discord-developers
[source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/client
[documentation]: https://discord.js.org/docs
[guide]: https://discordjs.guide
[related-libs]: https://discord.com/developers/docs/topics/community-resources#libraries
[contributing]: https://github.com/marioparaschiv/discord.self/blob/main/.github/CONTRIBUTING.md
[collection-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/collection
[core-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/core
[formatters-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/formatters
[identity-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/identity
[rest-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/rest
[util-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/util
[voice-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/voice
[ws-source]: https://github.com/marioparaschiv/discord.self/tree/main/packages/ws
