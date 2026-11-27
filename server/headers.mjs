/**
 * Response headers of the self-hosted site, read from `vercel.json` so that
 * both hosting targets apply one list. See self-host.mjs for why they cannot
 * live in `hooks.server.ts`.
 */
import { readFileSync } from "node:fs";

/**
 * @typedef {{ key: string, value: string }} Header
 * @typedef {{ pattern: RegExp, headers: Header[] }} HeaderRule
 */

/**
 * A `source` of vercel.json as a RegExp. The patterns in use are literal paths
 * with regex groups (`/(llms|llms-full).txt`, `/r/(.*)`): a dot is literal
 * unless it is the `.` of `.*`.
 *
 * @param {string} source
 * @returns {RegExp}
 */
export function sourceToRegExp(source) {
	return new RegExp(`^${source.replace(/\.(?!\*)/g, "\\.")}$`);
}

/**
 * Reads the `headers` rules of a vercel.json file.
 *
 * @param {string | URL} configFile path or file URL
 * @returns {HeaderRule[]}
 */
export function loadHeaderRules(configFile) {
	/** @type {{ headers?: { source: string, headers: Header[] }[] }} */
	const config = JSON.parse(readFileSync(configFile, "utf8"));
	return (config.headers ?? []).map((rule) => ({
		pattern: sourceToRegExp(rule.source),
		headers: rule.headers,
	}));
}

/**
 * The headers every matching rule sets for a pathname.
 *
 * @param {HeaderRule[]} rules
 * @param {string} pathname
 * @returns {[string, string][]}
 */
export function headersFor(rules, pathname) {
	return rules
		.filter((rule) => rule.pattern.test(pathname))
		.flatMap((rule) =>
			rule.headers.map(({ key, value }) => /** @type {[string, string]} */ ([key, value]))
		);
}
