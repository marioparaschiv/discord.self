# @discord.self/collection

Map-like collection with utility methods used across `discord.self` packages.

## Install

```sh
pnpm add @discord.self/collection
```

## Example

```ts
import { Collection } from '@discord.self/collection';

const cache = new Collection<string, number>();
cache.ensure('messages', () => 0);
cache.set('messages', cache.get('messages')! + 1);

console.log(cache.first(), cache.last());
```
