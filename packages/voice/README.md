# @discord.self/voice

Voice runtime for Discord voice channels.

## Install

```sh
pnpm add @discord.self/voice
```

## Example

```ts
import { createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discord.self/voice';

const connection = joinVoiceChannel({
	channelId: 'VOICE_CHANNEL_ID',
	guildId: 'GUILD_ID',
	adapterCreator,
	selfDeaf: true,
});

const player = createAudioPlayer();
const resource = createAudioResource('./audio.mp3');

connection.subscribe(player);
player.play(resource);
```
