# Summaly for Self-Hosted Node.js

A self-hosted web page summarization API for extracting metadata, Open Graph tags, Twitter Cards, oEmbed players, ActivityPub links, and sensitive-content signals from URLs.

Designed for Misskey-compatible URL preview workflows.

## Features

- **Self-hosted Node.js service**: Runs as a normal Node process on your own server
- **Rich metadata extraction**: Open Graph, Twitter Cards, HTML metadata, favicons, oEmbed players
- **Built-in plugins**: Specialized handlers for major social, video, content, art, and marketplace platforms
- **SSRF protection**: Public HTTP API blocks localhost, private IPs, link-local, and reserved addresses by default
- **CORS enabled**: Ready for browser-based applications
- **TypeScript**: Strictly typed ESM codebase

## Quick Start

```bash
pnpm install
pnpm build
pnpm start
```

The API listens on `http://0.0.0.0:8787` by default.

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Address to bind |
| `PORT` | `8787` | Port to listen on |

Example:

```bash
HOST=127.0.0.1 PORT=3000 pnpm start
```

## Production Deployment

Install dependencies, build, and run the compiled server:

```bash
pnpm install --prod=false
pnpm build
pnpm start
```

For a production server, run `node built/server.js` behind a process manager such as PM2 or systemd, and put Nginx/Caddy in front if you need TLS, custom domains, rate limiting, or access logs.

PM2 example:

```bash
pnpm build
HOST=127.0.0.1 PORT=8787 pm2 start built/server.js --name summaly
```

systemd example:

```ini
[Unit]
Description=Summaly Node service
After=network.target

[Service]
WorkingDirectory=/opt/worker-summaly
ExecStart=/usr/bin/node built/server.js
Environment=HOST=127.0.0.1
Environment=PORT=8787
Restart=always
User=summaly

[Install]
WantedBy=multi-user.target
```

Nginx reverse proxy example:

```nginx
location /summaly/ {
	proxy_pass http://127.0.0.1:8787/;
	proxy_set_header Host $host;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
}
```

## API

### Summarize

```http
GET /?url={target_url}&lang={language}&timeout={timeout}&contentLengthLimit={limit}&contentLengthRequired={boolean}&userAgent={agent}
GET /api/summarize?url={target_url}
```

Query parameters:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `url` | string | Yes | URL to summarize. Only public `http:` and `https:` URLs are accepted by the HTTP service. | - |
| `lang` | string | No | Accept-Language header value | - |
| `timeout` | number | No | Operation timeout in milliseconds | `60000` |
| `contentLengthLimit` | number | No | Maximum response size in bytes | `10485760` |
| `contentLengthRequired` | boolean | No | Require `Content-Length` from upstream | `false` |
| `userAgent` | string | No | Custom upstream User-Agent | iPad Safari UA |

Example:

```bash
curl "http://127.0.0.1:8787/?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
curl "http://127.0.0.1:8787/?url=https://example.com&timeout=5000&contentLengthLimit=1048576"
curl "http://127.0.0.1:8787/?url=https://example.com&userAgent=MyBot/1.0"
```

Response:

```typescript
{
	title: string | null;
	icon: string | null;
	description: string | null;
	thumbnail: string | null;
	sitename: string | null;
	player: {
		url: string | null;
		width: number | null;
		height: number | null;
		allow: string[];
	};
	sensitive: boolean;
	activityPub: string | null;
	fediverseCreator: string | null;
	url: string;
}
```

### Health Check

```http
GET /health
```

Returns:

```json
{"status":"ok"}
```

## Built-In Plugins

Social and communication:

- Twitter/X
- Threads
- Bluesky
- Misskey
- Plurk
- Weibo
- ActivityPub/Fediverse metadata

Video and streaming:

- YouTube
- Twitch
- TikTok
- Bilibili
- Iwara
- Spotify

Content, art, and commerce:

- Wikipedia
- Amazon
- Bahamut
- PTT
- Komiflo
- E-Hentai
- Pixiv
- Nijie
- PChome
- DLsite
- Booth
- Steam
- Branch.io deep links

## Development

```bash
pnpm build
pnpm dev
pnpm test
pnpm eslint
```

`pnpm dev` builds the TypeScript project and starts `built/server.js`.

## Project Structure

```text
src/
├── server.ts          # Node.js HTTP entry point
├── http-handler.ts    # Shared HTTP routing, validation, CORS, JSON responses
├── index.ts           # Core summaly() function
├── general.ts         # HTML parsing and metadata extraction
├── summary.ts         # TypeScript type definitions
├── iplugin.ts         # Plugin interface definition
├── plugins/           # Site-specific plugins
└── utils/             # Fetching, encoding, URL safety, and text utilities

test/
├── index.test.ts      # Core functionality tests
├── server.test.ts     # Local HTTP handler and URL safety tests
├── plugins/           # Plugin-specific tests
├── fixtures/          # Embedded HTML and oEmbed fixtures
└── utils/             # Shared test utilities
```

## License

[GNU AFFERO GENERAL PUBLIC LICENSE Version 3](./LICENSE)
