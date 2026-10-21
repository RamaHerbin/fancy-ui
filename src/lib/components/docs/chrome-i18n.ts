import { t } from "$lib/stores";
import type { MessageKey } from "$lib/i18n/messages/en.js";

// i18n-fallback: English copy for keys mission B0 adds to the catalogs. Used ONLY while
// t(key) cannot resolve the key; once the catalogs carry them this map is never read.
const FALLBACK: Record<string, string> = {
	"search.a11y.close": "Close search", // i18n-fallback
	"demo.noPreview": "No preview available", // i18n-fallback
	"demo.notFound": "Component not found in module", // i18n-fallback
	"recipes.steps": "Steps", // i18n-fallback
	"recipes.pitfalls": "Pitfalls", // i18n-fallback
	"recipes.componentsUsed": "Components used", // i18n-fallback
	// i18n-fallback
	"seo.introduction":
		"What FancyUI is: animated, interactive components built natively for Svelte, React and Vue.", // i18n-fallback
	// i18n-fallback
	"seo.installation":
		"Install FancyUI in a Svelte, React or Vue project: add the package, wire up the Tailwind CSS v4 stylesheet, and import your first component.", // i18n-fallback
	// i18n-fallback
	"seo.theming":
		"Theme FancyUI with CSS custom properties: colors, radius, motion duration and the rainbow palette, in light and dark mode.", // i18n-fallback
	// i18n-fallback
	"seo.changelog":
		"Release history for FancyUI: new components, fixes and breaking changes, version by version.", // i18n-fallback
};

/** Translate a key that may not be in the catalogs yet, falling back to English. */
export function tc(key: string): string {
	const value = t(key as MessageKey) as string | undefined;
	return value && value !== key ? value : (FALLBACK[key] ?? key);
}
