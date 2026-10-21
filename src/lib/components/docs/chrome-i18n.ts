import { t } from "$lib/stores";
import type { MessageKey } from "$lib/i18n/messages/en.js";

// i18n-fallback: English copy for keys mission B0 adds to the catalogs. Used ONLY while
// t(key) cannot resolve the key; once the catalogs carry them this map is never read.
const FALLBACK: Record<string, string> = {
	"search.a11y.close": "Close search",
	"demo.noPreview": "No preview available",
	"demo.notFound": "Component not found in module",
	"recipes.steps": "Steps",
	"recipes.pitfalls": "Pitfalls",
	"recipes.componentsUsed": "Components used",
	"seo.introduction":
		"What FancyUI is: animated, interactive components built natively for Svelte, React and Vue.",
	"seo.installation":
		"Install FancyUI in a Svelte, React or Vue project: add the package, wire up the Tailwind CSS v4 stylesheet, and import your first component.",
	"seo.theming":
		"Theme FancyUI with CSS custom properties: colors, radius, motion duration and the rainbow palette, in light and dark mode.",
	"seo.changelog":
		"Release history for FancyUI: new components, fixes and breaking changes, version by version.",
};

/** Translate a key that may not be in the catalogs yet, falling back to English. */
export function tc(key: string): string {
	const value = t(key as MessageKey) as string | undefined;
	return value && value !== key ? value : (FALLBACK[key] ?? key);
}
