import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { addComponent, addTemplate, resolveModule, useLogger } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import { components as manifest, sourceVersion } from "./manifest";
import type { ModuleOptions } from "./types";

const PACKAGE = "fancy-ui-vue";

/**
 * Nuxt's own head components. With `prefix: ""` a library export of the same
 * name (fancy-ui-vue has `Link`) loses to the built-in, so it is reported.
 */
const NUXT_HEAD_COMPONENTS = new Set([
	"Base",
	"Body",
	"Head",
	"Html",
	"Link",
	"Meta",
	"NoScript",
	"Style",
	"Title",
]);

/**
 * Resolve the `components` option against the manifest. Unknown names (a typo,
 * or a name this module's list does not know) are reported and skipped rather
 * than thrown.
 */
export function resolveComponentNames(
	option: ModuleOptions["components"],
	warn: (message: string) => void = () => {}
): string[] {
	if (option === false) return [];
	if (option === true || option === undefined) return [...manifest];
	if (!Array.isArray(option)) {
		warn(
			"`fancyUi.components` must be true, false or an array of component names — registering none."
		);
		return [];
	}
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
	if (names.length > 0) warnIfOlderPackage(nuxt, (m) => logger.warn(m));
	if (prefix === "") {
		const shadowed = names.filter((name) => NUXT_HEAD_COMPONENTS.has(name));
		if (shadowed.length > 0) {
			logger.warn(
				`With \`fancyUi.prefix: ""\`, ${shadowed.map((n) => `<${n}>`).join(", ")} stays Nuxt's built-in head component; ` +
					`import ${shadowed.join(", ")} from "fancy-ui-vue" explicitly, or use a prefix.`
			);
		}
	}

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
			// Below the default (0): the app's own components and Nuxt's
			// built-ins win any name clash instead of being replaced.
			priority: -1,
		});
	}
}

/** Compares dotted numeric versions (`0.3.0`), ignoring any prerelease tag. */
function olderThan(a: string, b: string): boolean {
	const pa = a.split("-")[0]!.split(".").map(Number);
	const pb = b.split("-")[0]!.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		const d = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (d !== 0) return d < 0;
	}
	return false;
}

/**
 * The component list is generated from one fancy-ui-vue release. An app on an
 * older release may not export every name in it, and using such a component
 * would fail at build time with a missing export, so say so up front.
 */
function warnIfOlderPackage(nuxt: Nuxt, warn: (message: string) => void): void {
	try {
		const url = pathToFileURL(join(nuxt.options.rootDir, "_index.js"));
		const file = resolveModule("fancy-ui-vue/package.json", { url });
		const { version } = JSON.parse(readFileSync(file, "utf8")) as { version?: string };
		if (version && olderThan(version, sourceVersion)) {
			warn(
				`fancy-ui-vue ${version} is older than ${sourceVersion}, which this module's component list comes from; ` +
					`components added since ${version} will fail to resolve. Upgrade fancy-ui-vue.`
			);
		}
	} catch {
		// Not resolvable from the app: the shims' own imports will report it.
	}
}
