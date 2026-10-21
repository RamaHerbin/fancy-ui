/**
 * Which callback props the React and Vue ports declare, read from their
 * sources so the API tables show the name a port really exports instead of a
 * guess: the React Compare keeps `onpercentagechange` lowercase, the Vue one
 * declares `onPercentageChange` (bound as `@percentage-change`), and a
 * callback neither declares falls through to the element as a native
 * listener. The files are read as text and never executed, so the docs build
 * pulls in neither React nor Vue.
 */

const reactSources = import.meta.glob("/react/src/components/*/*.tsx", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueSources = import.meta.glob("/vue/src/components/*/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

export type CallbackStack = "react" | "vue";

/**
 * The callback props a component source declares: members named `on…` whose
 * type starts with a function or a list of functions (`onx?: () => void`,
 * `onX?: (() => void) | (() => void)[]`). Object keys such as `once: true`
 * and DOM stubs such as `onchange: null` are left out.
 */
export function parseCallbacks(src: string): string[] {
	const names = [...src.matchAll(/^\s*(on[A-Za-z]\w*)\??\s*:\s*\(/gm)].map((match) => match[1]);
	return [...new Set(names)];
}

/**
 * Callbacks declared under `<stack>/src/components/<slug>/`, named the way the
 * registry names props: bare for the main component (`mainName`, or the
 * folder's only component), `Sub.name` for the others. Test files are skipped.
 */
export function portCallbacksFor(stack: CallbackStack, slug: string, mainName: string): string[] {
	const sources = stack === "react" ? reactSources : vueSources;
	const extension = stack === "react" ? ".tsx" : ".vue";
	const prefix = `/${stack}/src/components/${slug}/`;
	const files = Object.entries(sources).filter(
		([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes(".test.")
	);
	const names = files.map(([path]) => path.slice(prefix.length, -extension.length));
	const main = names.includes(mainName) ? mainName : names.length === 1 ? names[0] : null;
	return files.flatMap(([, src], i) => {
		const name = names[i];
		return parseCallbacks(src).map((callback) =>
			name === main ? callback : `${name}.${callback}`
		);
	});
}
