# @synapse/shared (Wave B1)

Shared **error codes** + **Zod schemas** without a full npm workspaces monorepo.

## Usage

```ts
import { AuthErrorCodes, parseAuthCredentials, LibrarySyncSchema } from '../../packages/shared/src/index';
```

Server auth routes parse credentials via `parseAuthCredentials`. Optional root workspaces only after this package proves value (Wave C3).
