# Testing Guide

The test suite runs in Node.js with Vitest. It covers the core summarization library, built-in plugins, the local HTTP handler, and self-hosting security behavior.

## Test Structure

```text
test/
├── index.test.ts          # Core metadata extraction tests
├── server.test.ts         # Local HTTP API and URL safety tests
├── plugins/               # Plugin-specific tests
├── fixtures/              # Embedded HTML and oEmbed fixtures
├── htmls/                 # Source fixture files
└── utils/
    └── test-utils.ts      # Shared mock fetch utilities
```

## Commands

```bash
pnpm test          # Core, plugin, and server tests
pnpm test:unit     # Core and plugin tests only
pnpm test:server   # Local HTTP handler and URL safety tests only
pnpm test:watch    # Vitest watch mode
```

## Mocking Strategy

Tests mock `global.fetch` with `test/utils/test-utils.ts` or local Vitest mocks. Mocked responses are stored by URL and cloned for each request.

Plugin tests should call each plugin's `summarize()` function directly when possible:

```typescript
import { summarize } from '@/plugins/example.js';
import { useMockFetch, setupMockResponse } from '../utils/test-utils.js';

useMockFetch();

test('extracts metadata', async () => {
	setupMockResponse('https://example.com/page', '<html><head><title>Test</title></head></html>');
	const result = await summarize(new URL('https://example.com/page'));
	expect(result?.title).toBe('Test');
});
```

Use `summaly()` when the behavior under test depends on plugin selection, redirect handling, or general fallback behavior.

## Server Tests

`test/server.test.ts` exercises the local HTTP handler without opening a real port. It verifies:

- `GET /health`
- Missing, invalid, and blocked `url` parameters
- `GET /` and `GET /api/summarize`
- CORS preflight
- `405` and `404` responses
- Query parameter parsing
- Summarization error responses
- Blocking private/local URLs and redirects

## URL Safety

The public HTTP service passes `allowPrivateIp: false` to the core fetch layer. This blocks localhost, private IP ranges, link-local addresses, reserved ranges, and redirects to those addresses.

Core library tests may still use localhost fixtures because library calls default to allowing private addresses unless the caller explicitly disables them.

## Network Tests

Most tests are fully mocked and do not require network access. Tests that use real public URLs should be skipped or gated behind an environment variable to keep CI deterministic.
