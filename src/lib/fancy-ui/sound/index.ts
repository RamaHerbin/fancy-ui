import SoundToggle, {
	type SoundToggleProps,
	type SoundToggleSize,
	type SoundToggleVariant,
} from "./SoundToggle.svelte";
import { sound, getSoundStatus, type SoundController } from "./sound.svelte.js";
import {
	soundFeedback,
	DEFAULT_SOUND_FEEDBACK_ON,
	type SoundFeedbackOptions,
	type SoundCueResolver,
	type SoundCueSpec,
} from "./sound-feedback.js";
import { createSoundEngine, type SoundEngine, type SoundEngineOptions } from "./engine.js";
import { FANCY_SOUND_THEME, SOUND_THEMES, getSoundTheme, validateSoundTheme } from "./themes.js";

export {
	SoundToggle,
	type SoundToggleProps,
	type SoundToggleSize,
	type SoundToggleVariant,
	sound,
	getSoundStatus,
	type SoundController,
	soundFeedback,
	DEFAULT_SOUND_FEEDBACK_ON,
	type SoundFeedbackOptions,
	type SoundCueResolver,
	type SoundCueSpec,
	createSoundEngine,
	type SoundEngine,
	type SoundEngineOptions,
	FANCY_SOUND_THEME,
	SOUND_THEMES,
	getSoundTheme,
	validateSoundTheme,
};

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
