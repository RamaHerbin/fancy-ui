/**
 * Theme Store
 *
 * Manages the active theme (light/dark/system + named themes) and user
 * preferences. A theme is identified by name; the registry lives in
 * `$lib/fancy-ui/themes`. Applying a theme toggles the `.dark` class, sets a
 * `data-theme` attribute, and writes the theme's CSS-variable overrides inline
 * on `<html>` (on top of the base tokens in `src/routes/layout.css`).
 */

import { browser } from "$app/environment";
import { themes, getTheme as getThemeDef, MANAGED_VARS } from "$lib/fancy-ui/themes.js";

// =============================================================================
// Types
// =============================================================================

/** A theme name from the registry, or the special "system" value. */
export type Theme = string;
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
	/** Current theme setting (registry name or "system"). */
	theme: Theme;
	/** Resolved light/dark (from the theme's colorScheme, or the system preference). */
	resolvedTheme: ResolvedTheme;
	/** Whether the user prefers reduced motion. */
	reducedMotion: boolean;
}

// =============================================================================
// State
// =============================================================================

const STORAGE_KEY = "fancy-ui-theme";

let theme = $state<Theme>("system");
let systemPrefersDark = $state(false);
let reducedMotion = $state(false);

const resolvedTheme = $derived<ResolvedTheme>(
	theme === "system"
		? systemPrefersDark
			? "dark"
			: "light"
		: (getThemeDef(theme)?.colorScheme ?? "light")
);

// =============================================================================
// Initialization
// =============================================================================

function initialize() {
	if (!browser) return;

	// Load saved theme (a registry name or "system"); ignore unknown values.
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved && (saved === "system" || getThemeDef(saved))) {
		theme = saved;
	}

	const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	systemPrefersDark = darkModeQuery.matches;
	darkModeQuery.addEventListener("change", (e) => {
		systemPrefersDark = e.matches;
		applyTheme();
	});

	const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	reducedMotion = motionQuery.matches;
	motionQuery.addEventListener("change", (e) => {
		reducedMotion = e.matches;
	});

	applyTheme();
}

// =============================================================================
// Theme Application
// =============================================================================

function applyTheme() {
	if (!browser) return;

	const root = document.documentElement;
	const resolved: ResolvedTheme =
		theme === "system"
			? systemPrefersDark
				? "dark"
				: "light"
			: (getThemeDef(theme)?.colorScheme ?? "light");

	// Light/dark class (drives every component's `dark:` utilities).
	if (resolved === "dark") root.classList.add("dark");
	else root.classList.remove("dark");

	// Clear any inline overrides from a previously-applied named theme.
	for (const v of MANAGED_VARS) root.style.removeProperty(v);

	// Apply the named theme's token overrides (light/dark/system carry none).
	const def = theme === "system" ? undefined : getThemeDef(theme);
	if (def && Object.keys(def.tokens).length > 0) {
		for (const [key, value] of Object.entries(def.tokens)) {
			root.style.setProperty(key, value);
		}
		root.setAttribute("data-theme", def.name);
	} else {
		root.removeAttribute("data-theme");
	}

	// Update meta theme-color for mobile browsers.
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		const bg = def?.tokens["--background"] ?? (resolved === "dark" ? "#0a0a0a" : "#ffffff");
		metaThemeColor.setAttribute("content", bg);
	}
}

// =============================================================================
// Public API
// =============================================================================

/** Set the active theme by name (registry name or "system"). */
export function setTheme(newTheme: Theme) {
	theme = newTheme;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, newTheme);
		applyTheme();
	}
}

/** Flip between the base light and dark themes. */
export function toggleTheme() {
	setTheme(resolvedTheme === "dark" ? "light" : "dark");
}

/** Cycle light → dark → system → light. */
export function cycleTheme() {
	const order: Theme[] = ["light", "dark", "system"];
	const currentIndex = order.indexOf(theme);
	const nextIndex = (currentIndex + 1) % order.length;
	setTheme(order[nextIndex]);
}

export function getThemeState(): ThemeState {
	return { theme, resolvedTheme, reducedMotion };
}

export function getTheme(): Theme {
	return theme;
}

export function getResolvedTheme(): ResolvedTheme {
	return resolvedTheme;
}

export function getReducedMotion(): boolean {
	return reducedMotion;
}

export function isDark(): boolean {
	return resolvedTheme === "dark";
}

export function isLight(): boolean {
	return resolvedTheme === "light";
}

// =============================================================================
// Reactive Getters (for use in components)
// =============================================================================

/**
 * Create a reactive theme-state object for use in components.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createThemeState } from '$lib/stores';
 *   const themeState = createThemeState();
 * </script>
 * <p>Current theme: {themeState.theme}</p>
 * ```
 */
export function createThemeState() {
	return {
		get theme() {
			return theme;
		},
		get resolvedTheme() {
			return resolvedTheme;
		},
		get reducedMotion() {
			return reducedMotion;
		},
		get isDark() {
			return resolvedTheme === "dark";
		},
		get isLight() {
			return resolvedTheme === "light";
		},
		/** The full theme registry, for building a switcher. */
		get themes() {
			return themes;
		},
		setTheme,
		toggleTheme,
		cycleTheme,
	};
}

// Initialize when the module loads (client-side).
if (browser) {
	initialize();
}
