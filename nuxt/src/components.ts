import { addComponent, addTemplate, useLogger } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import { components as manifest } from "./manifest";
import type { ModuleOptions } from "./types";

const PACKAGE = "fancy-ui-vue";

/**
 * Resolve the `components` option against the manifest. Unknown names are
 * reported and skipped (never thrown) so a typo or a component removed in a
 * newer fancy-ui-vue does not break the build.
 */
export function resolveComponentNames(
	option: ModuleOptions["components"],
	warn: (message: string) => void = () => {}
): string[] {
	if (option === false) return [];
	if (option === true || option === undefined) return [...manifest];
	const known = new Set<string>(manifest);
	const picked = new Set<string>();
	for (const name of option) {
		if (known.has(name)) picked.add(name);
		else warn(`Unknown fancy-ui-vue component "${name}" in \`fancyUi.components\` — skipped.`);
	}
	return [...picked];
}

/**
 * Register each component through a one-line re-export shim instead of
 * pointing `addComponent` at the package itself. Nuxt's lazy / hydrate-*
 * wrappers compile to `import(filePath).then(c => c[export])`; with the
 * package barrel as `filePath` that dynamic import keeps every export alive,
 * whereas a shim re-exporting a single name lets Rollup drop the rest.
 * The shim still imports the public `fancy-ui-vue` specifier, so there is one
 * module instance (provide/inject keys and the sound engine stay singletons).
 */
export function registerComponents(options: ModuleOptions, nuxt: Nuxt): void {
	const logger = useLogger("fancy-ui-nuxt");
	const names = resolveComponentNames(options.components, (m) => logger.warn(m));
	const prefix = options.prefix ?? "";

	for (const name of names) {
		const shim = addTemplate({
			filename: `fancy-ui/components/${name}.mjs`,
			write: true,
			getContents: () => `export { ${name} as default } from "${PACKAGE}";\n`,
		});
		// Type twin. Nuxt renders a buildDir-relative declarationPath as a bare
		// `import("fancy-ui/components/X")`, which TypeScript treats as a
		// package name, so the declaration goes through the `#build` alias
		// instead. The import is extensionless, so the twin must be `.d.ts`.
		addTemplate({
			filename: `fancy-ui/components/${name}.d.ts`,
			write: true,
			getContents: () => `export { ${name} as default } from "${PACKAGE}";\n`,
		});
		addComponent({
			name: `${prefix}${name}`,
			export: "default",
			filePath: shim.dst,
			declarationPath: `#build/fancy-ui/components/${name}`,
		});
	}
}
