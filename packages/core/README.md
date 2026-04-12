# @discord.self/core

Thin API wrapper layer over `@discord.self/rest` and gateway primitives.

## Install

```sh
pnpm add @discord.self/core @discord.self/rest
```

## Example

```ts
import { API } from '@discord.self/core';
import { REST } from '@discord.self/rest';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
const api = new API(rest);

const me = await api.users.getCurrent();
console.log(me.username);
```
