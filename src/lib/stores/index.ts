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

export { setLocale, getLocale, getDir, t, createI18n } from "./locale.svelte.js";
