import { error, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { SYSTEM_PROMPT } from "$lib/ai/system-prompt.js";

// Only user/assistant roles are accepted from the client.
// "system" is reserved for the server-injected SYSTEM_PROMPT.
interface ClientMessage {
	role: "user" | "assistant";
	content: string;
}

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 20_000;
const ALLOWED_PROVIDERS = ["openai", "ollama"] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;

// Instance-local counters. Every serverless instance keeps its own Map, so this
// damps casual abuse — it is not a guaranteed global cap.
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

function rateLimitKey(forwardedFor: string | null): string {
	// First hop of x-forwarded-for is the client as seen by the edge proxy.
	const first = forwardedFor?.split(",")[0]?.trim();
	return first && first.length > 0 ? first : "unknown";
}

function isRateLimited(key: string): boolean {
	const now = Date.now();

	// Opportunistic pruning: drop expired buckets while we are already here.
	for (const [k, entry] of rateLimitBuckets) {
		if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(k);
	}

	const bucket = rateLimitBuckets.get(key);
	if (!bucket) {
		rateLimitBuckets.set(key, { count: 1, windowStart: now });
		return false;
	}

	bucket.count += 1;
	return bucket.count > RATE_LIMIT_MAX;
}

const ALLOWED_MODELS: Record<Provider, readonly string[]> = {
	openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
	ollama: ["llama3.2", "llama3.1", "mistral", "phi3", "gemma2"],
};

function badRequest(msg: string): Response {
	return new Response(msg, { status: 400 });
}

function isAllowedProvider(value: unknown): value is Provider {
	return typeof value === "string" && (ALLOWED_PROVIDERS as readonly string[]).includes(value);
}

function parseClientMessages(raw: unknown): ClientMessage[] | null {
	if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
	const result: ClientMessage[] = [];
	for (const item of raw) {
		if (typeof item !== "object" || item === null) return null;
		const { role, content } = item as Record<string, unknown>;
		if (role !== "user" && role !== "assistant") return null;
		if (typeof content !== "string" || content.length === 0 || content.length > MAX_MESSAGE_LENGTH)
			return null;
		result.push({ role, content });
	}
	return result;
}

export const POST: RequestHandler = async ({ request, url }) => {
	// Off unless the platform env var is set to exactly "true". Read per-request
	// from $env/dynamic/private so flipping it needs no rebuild.
	if (env.COPILOT_ENABLED !== "true") error(404, "Not found");

	// Same-origin only. Browsers always send Origin on cross-site fetch POSTs, and
	// a missing Origin (curl and friends) is rejected as well.
	const origin = request.headers.get("origin");
	if (!origin || origin !== url.origin) error(403, "Forbidden");

	if (isRateLimited(rateLimitKey(request.headers.get("x-forwarded-for")))) {
		error(429, "Too many requests. Try again shortly.");
	}

	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return badRequest("Invalid JSON request body.");
	}

	if (typeof parsed !== "object" || parsed === null) return badRequest("Invalid request body.");

	const { provider, model, messages: rawMessages } = parsed as Record<string, unknown>;

	if (!isAllowedProvider(provider)) return badRequest("Invalid provider.");
	if (typeof model !== "string" || !ALLOWED_MODELS[provider].includes(model))
		return badRequest("Invalid model for the selected provider.");

	const clientMessages = parseClientMessages(rawMessages);
	if (!clientMessages) return badRequest("Invalid messages.");

	const allMessages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }, ...clientMessages];

	if (provider === "openai") {
		return handleOpenAI(allMessages, model, request.signal);
	} else {
		return handleOllama(allMessages, model, request.signal);
	}
};

async function handleOpenAI(
	messages: Message[],
	model: string,
	clientSignal: AbortSignal
): Promise<Response> {
	if (!env.OPENAI_API_KEY) {
		error(401, "OPENAI_API_KEY is not set. Add it to your .env file.");
	}

	const controller = new AbortController();
	const onAbort = () => controller.abort();
	clientSignal.addEventListener("abort", onAbort, { once: true });

	let upstream: globalThis.Response;
	try {
		upstream = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({ model, messages, stream: true }),
			signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
		});
	} catch (e) {
		clientSignal.removeEventListener("abort", onAbort);
		error(503, "Could not reach OpenAI. Check your network connection.");
	}

	if (!upstream.ok) {
		clientSignal.removeEventListener("abort", onAbort);
		if (upstream.status === 401) error(401, "Invalid OpenAI API key.");
		if (upstream.status === 429) error(429, "OpenAI rate limit reached. Try again shortly.");
		error(upstream.status, `OpenAI error: ${upstream.statusText}`);
	}

	const readable = new ReadableStream({
		async start(ctrl) {
			let closed = false;
			const reader = upstream.body!.getReader();
			const dec = new TextDecoder();
			let buf = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						if (!closed) {
							closed = true;
							ctrl.close();
						}
						break;
					}
					buf += dec.decode(value, { stream: true });
					const lines = buf.split("\n");
					buf = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed === "data: [DONE]") continue;
						if (!trimmed.startsWith("data: ")) continue;
						try {
							const json = JSON.parse(trimmed.slice(6));
							const chunk = json.choices?.[0]?.delta?.content;
							if (chunk) ctrl.enqueue(new TextEncoder().encode(chunk));
						} catch {
							// skip malformed lines
						}
					}
				}
			} catch (e) {
				if (!closed) {
					closed = true;
					ctrl.error(e);
				}
			} finally {
				clientSignal.removeEventListener("abort", onAbort);
			}
		},
		cancel() {
			controller.abort();
		},
	});

	return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function handleOllama(
	messages: Message[],
	model: string,
	clientSignal: AbortSignal
): Promise<Response> {
	const controller = new AbortController();
	const onAbort = () => controller.abort();
	clientSignal.addEventListener("abort", onAbort, { once: true });

	let upstream: globalThis.Response;
	try {
		upstream = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model, messages, stream: true }),
			signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]),
		});
	} catch (e) {
		clientSignal.removeEventListener("abort", onAbort);
		error(503, "Ollama is not running. Start with: ollama serve");
	}

	if (!upstream.ok) {
		clientSignal.removeEventListener("abort", onAbort);
		const body = await upstream.text();
		if (body.includes("model not found")) {
			error(404, `Model "${model}" not found. Pull with: ollama pull ${model}`);
		}
		error(upstream.status, `Ollama error: ${upstream.statusText}`);
	}

	const readable = new ReadableStream({
		async start(ctrl) {
			let closed = false;
			const reader = upstream.body!.getReader();
			const dec = new TextDecoder();
			let buf = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						if (!closed) {
							closed = true;
							ctrl.close();
						}
						break;
					}
					buf += dec.decode(value, { stream: true });
					const lines = buf.split("\n");
					buf = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						try {
							const json = JSON.parse(trimmed);
							if (json.done) {
								if (!closed) {
									closed = true;
									ctrl.close();
								}
								return;
							}
							const chunk = json.message?.content;
							if (chunk) ctrl.enqueue(new TextEncoder().encode(chunk));
						} catch {
							// skip malformed lines
						}
					}
				}
			} catch (e) {
				if (!closed) {
					closed = true;
					ctrl.error(e);
				}
			} finally {
				clientSignal.removeEventListener("abort", onAbort);
			}
		},
		cancel() {
			controller.abort();
		},
	});

	return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
