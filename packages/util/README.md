# @discord.self/util

Shared runtime utilities used across `@discord.self/*` packages.

## Install

```sh
pnpm add @discord.self/util
```

## Example

```ts
import { calculateShardId, range } from '@discord.self/util';

console.log(calculateShardId('123456789012345678', 4));

for (const i of range({ start: 2, end: 8, step: 2 })) {
	console.log(i);
}
```
