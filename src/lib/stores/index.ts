/**
 * Stores barrel export
 */

export {
	// Types
	type Theme,
	type ResolvedTheme,
	type ThemeState,
	// Functions
	setTheme,
	toggleTheme,
	cycleTheme,
	getTheme,
	getResolvedTheme,
	getReducedMotion,
	getThemeState,
	isDark,
	isLight,
	createThemeState,
} from "./theme.svelte.js";

export {
	setLocale,
	getLocale,
	getDir,
	t,
	tCategory,
	docTitle,
	componentDocTitle,
	createI18n,
	applyForRoute,
} from "./locale.svelte.js";
