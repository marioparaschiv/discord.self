# @discord.self/rest

REST transport client for Discord API routes.

## Install

```sh
pnpm add @discord.self/rest discord-api-types
```

## Example

```ts
import { REST } from '@discord.self/rest';
import { Routes } from 'discord-api-types/v10';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
const me = await rest.get(Routes.user('@me'));

console.log(me);
```
