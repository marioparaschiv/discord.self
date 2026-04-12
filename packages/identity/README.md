# @discord.self/identity

Discord browser identity emulation and session persistence for REST/gateway usage.

## Install

```sh
pnpm add @discord.self/identity
```

## Example

```ts
import { createDiscordIdentity } from '@discord.self/identity';

const identity = await createDiscordIdentity({ token: process.env.DISCORD_TOKEN });
const headers = await identity.getHeaders();

console.log(headers['user-agent']);
console.log(headers['x-super-properties']);
```
