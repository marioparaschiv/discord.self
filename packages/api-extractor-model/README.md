# @discord.self/api-extractor-model

Model types for reading/writing `*.api.json` files produced by API Extractor.

## Install

```sh
pnpm add @discord.self/api-extractor-model
```

## Example

```ts
import { ApiModel } from '@discord.self/api-extractor-model';

const model = new ApiModel();
const pkg = model.loadPackage('client.api.json');

for (const member of pkg.members) {
	console.log(member.displayName);
}
```
