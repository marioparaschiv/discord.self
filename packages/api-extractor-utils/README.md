# @discord.self/api-extractor-utils

Utilities for parsing and serializing API Extractor model data.

## Install

```sh
pnpm add @discord.self/api-extractor-utils @discord.self/api-extractor-model
```

## Example

```ts
import { ApiModel } from '@discord.self/api-extractor-model';
import { findPackage, getMembers } from '@discord.self/api-extractor-utils';

const model = new ApiModel();
const pkg = findPackage(model, 'client');

if (pkg) {
	console.log(getMembers(pkg, 'main'));
}
```
