import { addImports } from "@nuxt/kit";
import type { ModuleOptions } from "./types";

/**
 * The sound composables auto-imported when `composables` is on. Kept to the
 * `use*` hooks: the `sound` controller and the theme helpers are plain
 * values a consumer imports on purpose, not something to inject into every
 * file's scope.
 */
export const SOUND_COMPOSABLES = [
	"useSound",
	"useSoundCue",
	"useSoundEnabled",
	"useSoundStatus",
	"useSoundFeedback",
] as const;

export function registerComposables(options: Pick<ModuleOptions, "composables">): void {
	if (!options.composables) return;
	// Imported from the package root, never a deep dist path: the composables
	// share module-level state (the sound store) with the components, so both
	// must resolve to the very same fancy-ui-vue module instance.
	addImports(SOUND_COMPOSABLES.map((name) => ({ name, from: "fancy-ui-vue" })));
}
