# @discord.self/actions

Internal workflow actions used by this monorepo.

## Usage In This Repo

Workspace-only package (not published). Build/test through the monorepo:

```sh
pnpm --filter @discord.self/actions build
```

## Example

```ts
import { formatTag } from '@discord.self/actions';

const parsed = formatTag('@discord.self/client@14.16.3');
// { isSubpackage: true, package: 'client', semver: '14.16.3' }
```
