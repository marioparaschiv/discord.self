# @discord.self/client

Patched `discord.js` client focused on user-account sessions.

## Install

```sh
pnpm add @discord.self/client
```

## Example

```ts
import { Client, Events } from '@discord.self/client';

const client = new Client({ intents: 0 });

client.once(Events.ClientReady, ready => {
  console.log(`ready: ${ready.user.tag}`);
});

await client.login(process.env.DISCORD_TOKEN);
```

Gateway intent helper enums are intentionally not used in this example.
