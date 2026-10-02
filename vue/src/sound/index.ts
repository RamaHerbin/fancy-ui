// Public barrel of the sound engine — mirrors src/lib/fancy-ui/sound/index.ts
// on the Svelte side, plus this package's composables (use-sound.ts,
// use-sound-feedback.ts), which are its counterpart of reading the `sound`
// controller's runes directly.
export { default as SoundToggle } from "./SoundToggle.vue";
export type {
	SoundToggleProps,
	SoundToggleSize,
	SoundToggleVariant,
} from "./SoundToggle.vue";
export { sound, getSoundStatus, type SoundController } from "./sound.js";
export {
	soundFeedback,
	DEFAULT_SOUND_FEEDBACK_ON,
	type SoundFeedbackOptions,
	type SoundCueResolver,
	type SoundCueSpec,
} from "./sound-feedback.js";
export { useSoundFeedback } from "./use-sound-feedback.js";
export {
	useSound,
	useSoundCue,
	useSoundEnabled,
	useSoundStatus,
	type SoundControls,
	type SoundState,
} from "./use-sound.js";
export { createSoundEngine, type SoundEngine, type SoundEngineOptions } from "./engine.js";
export { FANCY_SOUND_THEME, SOUND_THEMES, getSoundTheme, validateSoundTheme } from "./themes.js";
export {
	SOUND_CUES,
	SOUND_THEME_NAMES,
	SOUND_STORAGE_KEY,
	SOUND_MIN_INTERVAL_MS,
	SOUND_LIMITS,
	DEFAULT_SOUND_PREFERENCES,
	type SoundCue,
	type SoundThemeName,
	type SoundPlayOptions,
	type SoundPreferences,
	type SoundPreferencesV1,
	type SoundStatus,
	type SoundEngineState,
	type SoundThemeDefinition,
	type CueRecipe,
	type SoundLayer,
	type SoundOscillatorLayer,
	type SoundNoiseLayer,
	type SoundEnvelope,
	type SoundFilter,
	type SoundWave,
} from "./types.js";
