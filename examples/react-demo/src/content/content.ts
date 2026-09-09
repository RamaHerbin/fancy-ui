import raw from "./site-content.json";

type ContentMap = Record<string, string | string[]>;

const content = raw as ContentMap;

/** A single string of copy. Warns and returns the key itself when missing. */
export function c(key: string): string {
	const value = content[key];
	if (typeof value === "string") return value;
	console.warn(`[content] missing string key "${key}"`);
	return key;
}

/** A list of strings (tags, items). Warns and returns [] when missing. */
export function cList(key: string): string[] {
	const value = content[key];
	if (Array.isArray(value)) return value;
	console.warn(`[content] missing list key "${key}"`);
	return [];
}

/** `prefix.1`, `prefix.2`, … until the first missing key. */
export function cSeries(prefix: string): string[] {
	const out: string[] = [];
	for (let i = 1; typeof content[`${prefix}.${i}`] === "string"; i++) {
		out.push(content[`${prefix}.${i}`] as string);
	}
	return out;
}

export function has(key: string): boolean {
	return key in content;
}
