import { defineNuxtModule, extendViteConfig, useLogger } from "@nuxt/kit";
import { registerComponents } from "./components";
import { registerComposables } from "./composables";
import { registerStyles } from "./styles";
import type { ModuleOptions } from "./types";

export type { ModuleOptions } from "./types";

const DEFAULT_PREFIX = "Fancy";
const PREFIX_RE = /^[A-Z][A-Za-z0-9]*$/;

/**
 * Component names are built as `prefix + ExportName`, and Nuxt derives both the
 * `<PascalCase>` and `<kebab-case>` tags from that string. A prefix that is not
 * itself PascalCase (`"fancy"`, `"my-ui"`, `"X_"`) would yield names whose two
 * forms disagree or are not valid identifiers, so it is rejected with a warning
 * and the default is used instead. `""` is allowed: it registers the bare
 * export names (`<ShimmerButton>`).
 */
function resolvePrefix(prefix: unknown, warn: (msg: string) => void): string {
	if (prefix === "" || (typeof prefix === "string" && PREFIX_RE.test(prefix))) return prefix;
	warn(
		`Invalid \`fancyUi.prefix\` ${JSON.stringify(prefix)}: expected "" or a PascalCase word ` +
			`(e.g. "Fancy", "Ui"). Falling back to "${DEFAULT_PREFIX}".`
	);
	return DEFAULT_PREFIX;
}

export default defineNuxtModule<ModuleOptions>().with({
	meta: {
		name: "fancy-ui-nuxt",
		configKey: "fancyUi",
		compatibility: { nuxt: "^4.5.0" },
	},
	defaults: {
		components: true,
		prefix: DEFAULT_PREFIX,
		css: true,
		composables: true,
	},
	setup(options, nuxt) {
		const logger = useLogger("fancy-ui-nuxt");
		const resolved = { ...options, prefix: resolvePrefix(options.prefix, (m) => logger.warn(m)) };

		registerStyles(resolved, nuxt);
		registerComponents(resolved, nuxt);
		registerComposables(resolved);

		// fancy-ui-vue ships one ESM file per source module (preserveModules, for
		// tree-shaking), which the dev server would otherwise serve as hundreds of
		// separate requests and discover lazily, triggering a reload mid-session.
		// Pre-bundling it up front avoids both. optimizeDeps is only read by the
		// dev server, so this is applied unconditionally rather than gated on
		// `nuxt.options.dev`: a no-op for builds, one less branch to reason about.
		extendViteConfig((config) => {
			config.optimizeDeps ??= {};
			const include = (config.optimizeDeps.include ??= []);
			if (!include.includes("fancy-ui-vue")) include.push("fancy-ui-vue");
		});
	},
});
