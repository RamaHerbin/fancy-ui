// Public barrel of the sound engine — mirrors src/lib/fancy-ui/sound/index.ts
// on the Svelte side, plus the React-only hooks (use-sound.ts), which are this
// package's counterpart of reading the `sound` controller's runes directly.
export {
	SoundToggle,
	type SoundToggleProps,
	type SoundToggleSize,
	type SoundToggleVariant,
} from "./SoundToggle.js";
export { sound, getSoundStatus, type SoundController, type SoundSnapshot } from "./sound.js";
export {
	attachSoundFeedback,
	useSoundFeedback,
	DEFAULT_SOUND_FEEDBACK_ON,
	type SoundFeedbackOptions,
	type SoundFeedbackHandle,
	type SoundCueResolver,
	type SoundCueSpec,
} from "./sound-feedback.js";
export {
	useSound,
	useSoundCue,
	useSoundEnabled,
	useSoundStatus,
	type SoundControls,
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
