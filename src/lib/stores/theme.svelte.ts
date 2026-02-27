/**
 * Theme Store
 *
 * Manages theme state (dark/light mode) and user preferences.
 * Provides reactive stores and utilities for theme switching.
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
	/** Current theme setting */
	theme: Theme;
	/** Resolved theme (actual light/dark based on system preference if theme is 'system') */
	resolvedTheme: ResolvedTheme;
	/** Whether user prefers reduced motion */
	reducedMotion: boolean;
}

// =============================================================================
// State
// =============================================================================

const STORAGE_KEY = "fancy-ui-theme";

/** Reactive theme state using Svelte 5 runes */
let theme = $state<Theme>("system");
let systemPrefersDark = $state(false);
let reducedMotion = $state(false);

/** Derived resolved theme */
const resolvedTheme = $derived<ResolvedTheme>(
	theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme
);

// =============================================================================
// Initialization
// =============================================================================

function initialize() {
	if (!browser) return;

	// Load saved theme preference
	const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
	if (saved && ["light", "dark", "system"].includes(saved)) {
		theme = saved;
	}

	// Check system dark mode preference
	const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	systemPrefersDark = darkModeQuery.matches;

	// Listen for system theme changes
	darkModeQuery.addEventListener("change", (e) => {
		systemPrefersDark = e.matches;
		applyTheme();
	});

	// Check reduced motion preference
	const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	reducedMotion = motionQuery.matches;

	// Listen for motion preference changes
	motionQuery.addEventListener("change", (e) => {
		reducedMotion = e.matches;
	});

	// Apply initial theme
	applyTheme();
}

// =============================================================================
// Theme Application
// =============================================================================

function applyTheme() {
	if (!browser) return;

	const root = document.documentElement;
	const resolved = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	if (resolved === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}

	// Update meta theme-color for mobile browsers
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute("content", resolved === "dark" ? "#0a0a0a" : "#ffffff");
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Set the theme
 */
export function setTheme(newTheme: Theme) {
	theme = newTheme;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, newTheme);
		applyTheme();
	}
}

/**
 * Toggle between light and dark themes
 * If currently on 'system', switches to the opposite of the resolved theme
 */
export function toggleTheme() {
	const newTheme = resolvedTheme === "dark" ? "light" : "dark";
	setTheme(newTheme);
}

/**
 * Cycle through themes: light → dark → system → light
 */
export function cycleTheme() {
	const order: Theme[] = ["light", "dark", "system"];
	const currentIndex = order.indexOf(theme);
	const nextIndex = (currentIndex + 1) % order.length;
	setTheme(order[nextIndex]);
}

/**
 * Get current theme state
 */
export function getThemeState(): ThemeState {
	return {
		theme,
		resolvedTheme,
		reducedMotion,
	};
}

/**
 * Get the current theme setting
 */
export function getTheme(): Theme {
	return theme;
}

/**
 * Get the resolved theme (actual light/dark)
 */
export function getResolvedTheme(): ResolvedTheme {
	return resolvedTheme;
}

/**
 * Check if reduced motion is preferred
 */
export function getReducedMotion(): boolean {
	return reducedMotion;
}

/**
 * Check if dark mode is active
 */
export function isDark(): boolean {
	return resolvedTheme === "dark";
}

/**
 * Check if light mode is active
 */
export function isLight(): boolean {
	return resolvedTheme === "light";
}

// =============================================================================
// Reactive Getters (for use in components)
// =============================================================================

/**
 * Create a reactive theme state object for use in components
 *
 * @example
 * ```svelte
 * <script>
 *   import { createThemeState } from '$lib/stores/theme';
 *   const themeState = createThemeState();
 * </script>
 *
 * <p>Current theme: {themeState.resolvedTheme}</p>
 * ```
 */
export function createThemeState() {
	// Initialize on first use (client-side only)
	if (browser && theme === "system" && !localStorage.getItem(STORAGE_KEY)) {
		initialize();
	}

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

// Initialize when module loads (client-side)
if (browser) {
	initialize();
}
