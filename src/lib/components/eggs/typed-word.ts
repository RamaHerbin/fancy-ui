import { isPrintableKey } from "./shared.js";

export interface TypedWordBuffer {
	/** Returns the word the buffer now ends with (and clears), or null. */
	feed(key: string): string | null;
	reset(): void;
}

export function createTypedWordBuffer(words: readonly string[], maxLen = 16): TypedWordBuffer {
	const targets = words.map((w) => w.toLowerCase()).filter((w) => w.length > 0);
	let buffer = "";

	return {
		feed(key) {
			if (!isPrintableKey(key)) return null;
			buffer = (buffer + key.toLowerCase()).slice(-maxLen);
			const hit = targets.find((w) => buffer.endsWith(w)) ?? null;
			if (hit) buffer = "";
			return hit;
		},
		reset() {
			buffer = "";
		},
	};
}
