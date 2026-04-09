import { Client, type ClientEventTypes, GatewayIntentBits } from '@discord.self/discord.js';
import type { Event } from './events/index.ts';
import { loadEvents } from './util/loaders.ts';

// Initialize the client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load the events and commands
const events = await loadEvents(new URL('events/', import.meta.url));

function registerEvent<EventName extends keyof ClientEventTypes & string>(event: Event<EventName>) {
	const listener = (...args: ClientEventTypes[EventName]) => {
		void Promise.resolve(event.execute(...args)).catch((error) => {
			console.error(`Error executing event ${String(event.name)}:`, error);
		});
	};

	if (event.once) {
		client.once(event.name as never, listener as never);
		return;
	}

	client.on(event.name as never, listener as never);
}

// Register the event handlers
for (const event of events) {
	registerEvent(event);
}

// Login to the client
void client.login(Deno.env.get('DISCORD_TOKEN'));
