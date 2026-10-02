/**
 * The server-render sweep both artifact gates run over the built barrels:
 * `smoke-dist.mjs` (against the workspace's vue) and `vue-floor-consumer.mjs`
 * (copied into the scratch consumer and run against the floor vue). One copy,
 * so the two gates cannot drift into counting different things.
 *
 * Dependency-free on purpose: the floor consumer copies this file next to its
 * generated `render.mjs`, where only `vue` and the packed tarball resolve.
 * The vue functions it renders with are passed in, never imported here.
 */

/**
 * Component-shaped, as the runtime judges it: a function (functional component)
 * or an options object carrying one of the members that make it renderable.
 * The capitalised exports that are not components — constant tables such as
 * `SOUND_CUES`, context keys, skin objects — are plain data and fall out here.
 */
export function isComponent(value) {
	if (typeof value === "function") return true;
	if (typeof value !== "object" || value === null) return false;
	return "setup" in value || "render" in value || "template" in value || "__vccOpts" in value;
}

/**
 * What the runtime prints instead of throwing when a non-component reaches
 * `h()`: a warning and an empty comment node. Counted as a render, it would
 * lift the floor on nothing.
 */
export const HOLLOW = /missing template or render function/i;

/**
 * Every capitalised component-shaped export of each barrel, keyed
 * `"<barrel>:<Export>"` — the same keys `src/ssr-sweep.fixtures.ts` uses.
 * The barrels are walked separately, never spread into one object: the root
 * barrel and the cameleon barrel both export names such as `Button` and
 * `Select`, and a merge would silently drop one of each pair.
 *
 * @param {Record<string, Record<string, unknown>>} barrels e.g. `{ root, cameleon }`
 * @returns {Array<[key: string, value: unknown]>}
 */
export function componentEntries(barrels) {
	const out = [];
	for (const [barrel, mod] of Object.entries(barrels)) {
		for (const [name, value] of Object.entries(mod)) {
			if (!/^[A-Z]/.test(name)) continue;
			if (!isComponent(value)) continue;
			out.push([`${barrel}:${name}`, value]);
		}
	}
	return out;
}

/**
 * Server renders every entry with no props and `"x"` in its default slot.
 * The runtime's warnings are the expected shape of a props-less sweep, so they
 * are collected rather than printed; the one that signals a hollow render
 * turns that entry into a non-render.
 *
 * @param {Array<[string, unknown]>} entries from `componentEntries`
 * @param {{ createSSRApp: Function, h: Function, renderToString: Function }} vue
 */
export async function sweep(entries, { createSSRApp, h, renderToString }) {
	const rendered = [];
	const hollow = [];
	const threw = [];
	let scopedMarkup = false;
	const said = [];
	const speak = { warn: console.warn, error: console.error };
	console.warn = (...args) => said.push(args.join(" "));
	console.error = (...args) => said.push(args.join(" "));
	try {
		for (const [key, value] of entries) {
			const before = said.length;
			try {
				const html = await renderToString(
					createSSRApp({ render: () => h(value, {}, { default: () => "x" }) })
				);
				if (said.slice(before).some((line) => HOLLOW.test(line))) {
					hollow.push(key);
				} else {
					rendered.push(key);
					if (html.includes("data-v-")) scopedMarkup = true;
				}
			} catch {
				threw.push(key);
			}
		}
	} finally {
		Object.assign(console, speak);
	}
	return { swept: entries.length, rendered, hollow, threw, scopedMarkup };
}
