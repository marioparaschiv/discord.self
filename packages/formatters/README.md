# @discord.self/formatters

String formatter helpers for Discord message content.

## Install

```sh
pnpm add @discord.self/formatters
```

## Example

```ts
import { bold, inlineCode, userMention } from '@discord.self/formatters';

console.log(bold('build complete'));
console.log(inlineCode('pnpm test'));
console.log(userMention('123456789012345678'));
```
