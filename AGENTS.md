# Worker Summaly

A self-hosted web page summarization API running as a **Node.js HTTP service**. Forked from [misskey-dev/summaly](https://github.com/misskey-dev/summaly).

## Project Overview

Worker Summaly extracts metadata from web pages including:

- Open Graph and Twitter Card metadata
- Standard HTML metadata such as title, description, and favicon
- oEmbed player detection for embedded media
- ActivityPub and Fediverse creator metadata
- Sensitive content detection via HTTP headers and meta tags

## Runtime

- Entry point: `src/server.ts`
- HTTP handler: `src/http-handler.ts`
- Core summarizer: `src/index.ts`
- Default bind address: `HOST=0.0.0.0`
- Default port: `PORT=8787`

The public HTTP service blocks localhost, private IPs, link-local addresses, reserved ranges, and redirects to those addresses by passing `allowPrivateIp: false` through the fetch layer.

## Development Commands

```bash
pnpm install
pnpm build
pnpm start
pnpm dev
pnpm test
pnpm test:unit
pnpm test:server
pnpm eslint
```

## API Endpoints

### GET /

Main summarization endpoint.

Query parameters:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `url` | string | Yes | Public HTTP/HTTPS URL to summarize | - |
| `lang` | string | No | Accept-Language header value | - |
| `timeout` | number | No | Operation timeout in milliseconds | `60000` |
| `contentLengthLimit` | number | No | Maximum response size in bytes | `10485760` |
| `contentLengthRequired` | boolean | No | Require Content-Length header | `false` |
| `userAgent` | string | No | Custom User-Agent header | iPad Safari UA |

### GET /api/summarize

Alias for `GET /`.

### GET /health

Health check endpoint. Returns `{"status":"ok"}`.

### OPTIONS /

CORS preflight handler.

## Project Structure

```text
src/
├── server.ts             # Node.js HTTP entry point
├── http-handler.ts       # Routing, CORS, query parsing, JSON responses
├── index.ts              # Core summaly() function and options
├── general.ts            # HTML parsing logic and oEmbed player detection
├── summary.ts            # TypeScript type definitions
├── iplugin.ts            # Plugin interface definition
├── plugins/              # Built-in plugins
└── utils/
    ├── fetch.ts          # HTTP client using native fetch API
    ├── url-safety.ts     # Public URL validation and private address blocking
    ├── encoding.ts       # Character encoding detection/conversion
    ├── clip.ts           # Text truncation utility
    ├── cleanup-title.ts  # Title normalization
    ├── null-or-empty.ts  # String validation helpers
    └── status-error.ts   # Custom HTTP error class

test/
├── index.test.ts         # Core unit tests
├── server.test.ts        # Local HTTP handler and URL safety tests
├── plugins/              # Plugin-specific tests
├── utils/                # Shared test utilities
├── fixtures/             # Embedded HTML and oEmbed fixtures
├── htmls/                # Source HTML fixture files
└── oembed/               # Source oEmbed fixture files
```

## Coding Standards

- TypeScript strict mode
- ES Modules only
- Comments in English
- Use `@/` imports for `src/`
- Use tabs for indentation
- Use single quotes for strings
- Trailing commas in multi-line arrays/objects
- Prefer `null` over `undefined` for explicit no-value cases
- Nullish coalescing is disabled; use logical OR for fallbacks
- Always use `.js` extensions in import statements

## Testing

- Framework: Vitest in Node.js
- `test/index.test.ts`: Core metadata behavior
- `test/plugins/*.test.ts`: Plugin behavior
- `test/server.test.ts`: Local HTTP API and URL safety behavior

Plugin tests should call plugin `summarize()` functions directly when possible. Use `summaly()` when testing plugin selection, redirect handling, or general fallback behavior.

## Dependencies

Runtime dependencies:

| Package | Purpose |
|---------|---------|
| `cheerio` | HTML parsing and DOM manipulation |
| `escape-regexp` | Regular expression escaping |
| `html-entities` | HTML entity encoding/decoding |
