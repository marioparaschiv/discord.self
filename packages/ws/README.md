# @discord.self/ws

Gateway transport wrapper used by the `discord.self` runtime.

## Install

```sh
pnpm add @discord.self/ws @discord.self/rest discord-api-types
```

## Example

```ts
import { WebSocketManager, WebSocketShardEvents } from '@discord.self/ws';
import { REST } from '@discord.self/rest';
import { Routes } from 'discord-api-types/v10';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

const manager = new WebSocketManager({
	token: process.env.DISCORD_TOKEN!,
	intents: 0,
	fetchGatewayInformation: () => rest.get(Routes.gateway()),
});

manager.on(WebSocketShardEvents.Dispatch, (event) => {
	console.log(event.t);
});

await manager.connect();
```
