/**
 * POST /api/inspiration/understand  { query: string }
 *   → 200 { enabled: true, understanding }   filters to apply
 *   → 503 { enabled: false }                 no TYPESAFE_API_KEY: the gallery keeps its text search
 *   → 502 { enabled: true, error }           model unreachable or too slow: same fallback
 *
 * Not prerendered (it needs the request body and a secret). Fast by design:
 * one attempt, short timeout, and a small in-memory cache because visitors
 * repeat the same sentences.
 */

import { json, error, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import {
	QUERY_MAX,
	QUERY_MIN,
	understand,
	type SystemOneClient,
	type Understanding,
} from "$lib/server/understand.js";

export const prerender = false;

const CACHE_LIMIT = 200;
const cache = new Map<string, Understanding>();

let client: SystemOneClient | null = null;
function getClient(): SystemOneClient | null {
	if (!env.TYPESAFE_API_KEY) return null;
	client ??= new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY, logLevel: "error" });
	return client;
}

export const POST: RequestHandler = async ({ request }) => {
	let query: unknown;
	try {
		({ query } = (await request.json()) as { query?: unknown });
	} catch {
		error(400, "Expected a JSON body");
	}
	if (typeof query !== "string") error(400, "`query` must be a string");
	const normalized = query.trim().replace(/\s+/g, " ").slice(0, QUERY_MAX);
	if (normalized.length < QUERY_MIN) error(400, "`query` is too short");

	const typesafe = getClient();
	if (!typesafe) return json({ enabled: false }, { status: 503 });

	const key = normalized.toLowerCase();
	const hit = cache.get(key);
	if (hit) return json({ enabled: true, understanding: hit, cached: true });

	try {
		const understanding = await understand(typesafe, normalized, {
			signal: request.signal,
		});
		if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
		cache.set(key, understanding);
		return json({ enabled: true, understanding });
	} catch (err) {
		const message = err instanceof Error ? err.name : "Error";
		return json({ enabled: true, error: message }, { status: 502 });
	}
};
