/**
 * Which props the Vue port turns into `v-model:<name>`, read from the Vue
 * sources rather than from the registry prose: a Svelte bindable is not always
 * a model in Vue (Sidebar's `collapsed` is a plain prop there), and `ref` never
 * is. The files are read as text and never executed, so the docs build does
 * not pull Vue in.
 */

const vueSources = import.meta.glob("/vue/src/components/*/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** The names passed to `defineModel` calls in a Vue single-file component. */
export function parseVueModels(src: string): string[] {
	return [...src.matchAll(/\bdefineModel\s*(?:<[^(]*>)?\s*\(\s*(["'])([A-Za-z_$][\w$]*)\1/g)].map(
		(match) => match[2]
	);
}

/**
 * Models declared under `vue/src/components/<slug>/`, named the way the
 * registry names props: bare for the main component (`mainName`.vue, or the
 * folder's only component), `Sub.name` for the others.
 */
export function vueModelsFor(slug: string, mainName: string): string[] {
	const prefix = `/vue/src/components/${slug}/`;
	const files = Object.entries(vueSources).filter(([path]) => path.startsWith(prefix));
	const names = files.map(([path]) => path.slice(prefix.length, -".vue".length));
	const main = names.includes(mainName) ? mainName : names.length === 1 ? names[0] : null;
	return files.flatMap(([, src], i) => {
		const name = names[i];
		return parseVueModels(src).map((model) => (name === main ? model : `${name}.${model}`));
	});
}
