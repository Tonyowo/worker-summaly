import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleRequest } from '@/http-handler.js';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 8787;

function getPort(): number {
	const rawPort = process.env.PORT;
	if (!rawPort) return DEFAULT_PORT;

	const port = Number(rawPort);
	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		throw new Error(`Invalid PORT: ${rawPort}`);
	}

	return port;
}

function createWebRequest(req: IncomingMessage): Request {
	const host = req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`;
	const url = new URL(req.url || '/', `http://${host}`);
	const headers = new Headers();

	for (const [key, value] of Object.entries(req.headers)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				headers.append(key, item);
			}
		} else if (value !== undefined) {
			headers.set(key, value);
		}
	}

	return new Request(url, {
		method: req.method || 'GET',
		headers,
	});
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
	res.statusCode = response.status;
	response.headers.forEach((value, key) => {
		res.setHeader(key, value);
	});

	if (!response.body) {
		res.end();
		return;
	}

	const body = Buffer.from(await response.arrayBuffer());
	res.end(body);
}

const host = process.env.HOST || DEFAULT_HOST;
const port = getPort();

const server = createServer((req, res) => {
	void (async () => {
		try {
			const response = await handleRequest(createWebRequest(req));
			await sendResponse(res, response);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			console.error({
				event: 'server_error',
				error: message,
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ error: message }));
		}
	})();
});

server.listen(port, host, () => {
	console.info({
		event: 'server_listening',
		host,
		port,
	});
});
