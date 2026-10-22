import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveAlias, resolveModule, useLogger } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import type { ModuleOptions } from "./types";

/** The components' own stylesheet, as fancy-ui-vue's `exports` map names it. */
export const STYLES_SPECIFIER = "fancy-ui-vue/styles.css";

/**
 * Any way an app can spell that same file: the export specifier, the deep
 * dist path, or a resolved absolute path into the package. Quotes and an
 * optional `url(...)` are allowed so the same pattern reads CSS `@import`s.
 */
const STYLES_ID_RE = /fancy-ui-vue\/(?:dist\/)?styles\.css$/;
const STYLES_IMPORT_RE =
	/@import\s+(?:url\(\s*)?["']?[^"')\s;]*fancy-ui-vue\/(?:dist\/)?styles\.css["']?/;
const STYLESHEET_EXT_RE = /\.(?:css|pcss|postcss|scss|sass|less|styl|stylus)$/;

/** Strips CSS comments so a commented-out `@import` does not count. */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Whether the app already loads fancy-ui-vue's stylesheet, either as a
 * `css: [...]` entry or through a direct `@import` in one of its own
 * stylesheets listed there (the setup the docs taught before this module
 * existed: `@import "fancy-ui-vue/styles.css"` in main.css). Only one level is
 * read: nested imports are not followed.
 */
function alreadyLoaded(nuxt: Nuxt): boolean {
	for (const entry of nuxt.options.css) {
		if (typeof entry !== "string") continue;
		if (STYLES_ID_RE.test(entry.replace(/\\/g, "/"))) return true;
		const file = resolveAlias(entry, nuxt.options.alias);
		if (!isAbsolute(file) || !STYLESHEET_EXT_RE.test(file) || !existsSync(file)) continue;
		try {
			if (STYLES_IMPORT_RE.test(stripComments(readFileSync(file, "utf8")))) return true;
		} catch {
			// unreadable entry: Nuxt reports it itself, nothing to dedupe against
		}
	}
	return false;
}

/**
 * Whether the app can resolve the stylesheet. Nuxt emits each `css` entry as an
 * `import` in a template under the app's buildDir, so the bare specifier has to
 * resolve from the app — the same requirement as the component shims, which
 * import `fancy-ui-vue` from there too.
 */
function resolvableFromApp(nuxt: Nuxt): boolean {
	const urls = [nuxt.options.rootDir, ...nuxt.options.modulesDir].map((dir) =>
		pathToFileURL(join(dir, "_index.js"))
	);
	try {
		resolveModule(STYLES_SPECIFIER, { url: urls, extensions: [".css"] });
		return true;
	} catch {
		return false;
	}
}

export function registerStyles(options: ModuleOptions, nuxt: Nuxt): void {
	if (!options.css) return;
	if (alreadyLoaded(nuxt)) return;

	if (!resolvableFromApp(nuxt)) {
		useLogger("fancy-ui-nuxt").warn(
			`Could not resolve \`${STYLES_SPECIFIER}\`. Install fancy-ui-vue in the app, or set \`fancyUi.css: false\` and import it yourself.`
		);
		return;
	}

	// Appended, not prepended. Module setup runs after nuxt.config is read, so
	// this lands AFTER the app's own entries — the documented order is
	// `@import "tailwindcss"; @import "fancy-ui-vue/tailwind.css";` (in the
	// app's main.css) and then the components' stylesheet. Coming last, the
	// scoped component rules win ties against Tailwind's base/utility layers
	// (they are unlayered anyway) exactly as they did with the manual import,
	// and the app's own overrides should target the documented CSS variables
	// rather than rely on source order.
	nuxt.options.css.push(STYLES_SPECIFIER);
}
