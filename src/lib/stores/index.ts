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

export {
	// Types
	type DocsSkin,
	// Functions
	setSkin,
	toggleSkin,
	createSkinState,
} from "./skin.svelte.js";

export {
	// Types
	type StorageStatus,
	// Functions
	isSaved,
	toggleSaved,
	clearSaved,
	createSavedState,
	parseSavedPayload,
	SAVED_STORAGE_KEY,
	LEGACY_SAVED_KEY,
} from "./saved.svelte.js";

export {
	type Framework,
	getFramework,
	setFramework,
	createFrameworkState,
} from "./framework.svelte.js";

export {
	type Motion,
	getMotion,
	setMotion,
	toggleMotion,
	createMotionState,
} from "./motion.svelte.js";
