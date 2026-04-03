import { error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SYSTEM_PROMPT } from '$lib/ai/system-prompt.js';

interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface RequestBody {
	messages: Message[];
	model: string;
	provider: 'openai' | 'ollama';
}

export const POST: RequestHandler = async ({ request }) => {
	const body: RequestBody = await request.json();
	const { messages, model, provider } = body;

	const allMessages: Message[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

	if (provider === 'openai') {
		return handleOpenAI(allMessages, model);
	} else {
		return handleOllama(allMessages, model);
	}
};

async function handleOpenAI(messages: Message[], model: string): Promise<Response> {
	if (!env.OPENAI_API_KEY) {
		error(401, 'OPENAI_API_KEY is not set. Add it to your .env file.');
	}

	let upstream: globalThis.Response;
	try {
		upstream = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.OPENAI_API_KEY}`
			},
			body: JSON.stringify({ model, messages, stream: true }),
			signal: AbortSignal.timeout(30_000)
		});
	} catch (e) {
		error(503, 'Could not reach OpenAI. Check your network connection.');
	}

	if (!upstream.ok) {
		if (upstream.status === 401) error(401, 'Invalid OpenAI API key.');
		if (upstream.status === 429) error(429, 'OpenAI rate limit reached. Try again shortly.');
		error(upstream.status, `OpenAI error: ${upstream.statusText}`);
	}

	const readable = new ReadableStream({
		async start(controller) {
			let closed = false;
			const reader = upstream.body!.getReader();
			const dec = new TextDecoder();
			let buf = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						if (!closed) {
							closed = true;
							controller.close();
						}
						break;
					}
					buf += dec.decode(value, { stream: true });
					const lines = buf.split('\n');
					buf = lines.pop() ?? '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed === 'data: [DONE]') continue;
						if (!trimmed.startsWith('data: ')) continue;
						try {
							const json = JSON.parse(trimmed.slice(6));
							const chunk = json.choices?.[0]?.delta?.content;
							if (chunk) {
								controller.enqueue(new TextEncoder().encode(chunk));
							}
						} catch {
							// skip malformed lines
						}
					}
				}
			} catch (e) {
				if (!closed) {
					closed = true;
					controller.error(e);
				}
			}
		}
	});

	return new Response(readable, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}

async function handleOllama(messages: Message[], model: string): Promise<Response> {
	let upstream: globalThis.Response;
	try {
		upstream = await fetch('http://localhost:11434/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model, messages, stream: true }),
			signal: AbortSignal.timeout(60_000)
		});
	} catch (e) {
		error(503, 'Ollama is not running. Start with: ollama serve');
	}

	if (!upstream.ok) {
		const body = await upstream.text();
		if (body.includes('model not found')) {
			error(404, `Model "${model}" not found. Pull with: ollama pull ${model}`);
		}
		error(upstream.status, `Ollama error: ${upstream.statusText}`);
	}

	const readable = new ReadableStream({
		async start(controller) {
			let closed = false;
			const reader = upstream.body!.getReader();
			const dec = new TextDecoder();
			let buf = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						if (!closed) {
							closed = true;
							controller.close();
						}
						break;
					}
					buf += dec.decode(value, { stream: true });
					const lines = buf.split('\n');
					buf = lines.pop() ?? '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						try {
							const json = JSON.parse(trimmed);
							if (json.done) {
								if (!closed) {
									closed = true;
									controller.close();
								}
								return;
							}
							const chunk = json.message?.content;
							if (chunk) {
								controller.enqueue(new TextEncoder().encode(chunk));
							}
						} catch {
							// skip malformed lines
						}
					}
				}
			} catch (e) {
				if (!closed) {
					closed = true;
					controller.error(e);
				}
			}
		}
	});

	return new Response(readable, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}
