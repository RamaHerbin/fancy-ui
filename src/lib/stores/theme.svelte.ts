/**
 * Theme Store
 *
 * Manages the light/dark/system preference of the docs site. Applying a theme
 * toggles the `.dark` class on `<html>` (which drives every `dark:` utility and
 * the base token sets in `src/routes/layout.css`) and syncs the mobile
 * `theme-color` meta. Art direction beyond light/dark belongs to the cameleon
 * skins (`$lib/stores/skin.svelte.ts`), not here.
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
	/** Current theme setting. */
	theme: Theme;
	/** Resolved light/dark (the system preference when `theme` is "system"). */
	resolvedTheme: ResolvedTheme;
	/** Whether the user prefers reduced motion. */
	reducedMotion: boolean;
}

// =============================================================================
// State
// =============================================================================

const STORAGE_KEY = "fancy-ui-theme";

/** Accepted stored values. The anti-FOUC script in src/app.html mirrors this set. */
const THEMES: ReadonlySet<string> = new Set<Theme>(["light", "dark", "system"]);

function isTheme(value: unknown): value is Theme {
	return typeof value === "string" && THEMES.has(value);
}

let theme = $state<Theme>("system");
let systemPrefersDark = $state(false);
let reducedMotion = $state(false);

const resolvedTheme = $derived<ResolvedTheme>(
	theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme
);

// =============================================================================
// Initialization
// =============================================================================

function initialize() {
	if (!browser) return;

	// Load the saved preference; anything else (including a theme name from an
	// older build) falls back to "system" without touching storage.
	const saved = localStorage.getItem(STORAGE_KEY);
	if (isTheme(saved)) {
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
		theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	// Light/dark class (drives every component's `dark:` utilities).
	if (resolved === "dark") root.classList.add("dark");
	else root.classList.remove("dark");

	// Update meta theme-color for mobile browsers.
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute("content", resolved === "dark" ? "#0a0a0a" : "#ffffff");
	}
}

// =============================================================================
// Public API
// =============================================================================

/** Set the active theme. */
export function setTheme(newTheme: Theme) {
	theme = newTheme;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, newTheme);
		applyTheme();
	}
}

/** Flip between light and dark. */
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
		setTheme,
		toggleTheme,
		cycleTheme,
	};
}

// Initialize when the module loads (client-side).
if (browser) {
	initialize();
}
