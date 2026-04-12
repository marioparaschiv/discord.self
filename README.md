# discord.self

A user-account `discord.js`-based fork aiming to support all undocumented user APIs while staying under the radar.

> [!CAUTION]
> **Using this on a user account is prohibited by [Discord's ToS](https://discord.com/terms) and can lead to account suspensions.**

Thanks to the original [`discord.js`](https://github.com/discordjs/discord.js) project and its contributors for the foundational work this package builds on.

## Features

- [x] Client signal cloaking (TLS fingerprinting, browser fingerprints, and related client/session signals)
- [x] Automatic up-to-date version and Super Properties fetching
- [ ] Captcha handling
- [ ] TOTP handling
- [ ] Documentation
- [ ] Voice & Video
- [ ] User & password login flow
- [ ] Sessions
- [ ] Read states
- [ ] Connections
- [ ] Relationships
- [ ] Experiments
- [ ] Protobuf user settings
- [ ] Application/team management
- [ ] Store/SKUs/entitlements
- [ ] Billing (e.g. subscriptions, payments, boosts, promotions, etc.)
- [ ] Interactions (slash commands, buttons, etc.)

## Quick Start

```sh
pnpm add @discord.self/client
```

## Docs

- [Documentation](https://dself.marioparaschiv.com/docs)
- [Token Guide](https://gist.github.com/marioparaschiv/a565ef085466864aefed1597fd531445)

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
