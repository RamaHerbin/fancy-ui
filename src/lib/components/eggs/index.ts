export { EGGS, EGG_TOTAL } from "./registry.js";
export { eggRuntime, createEggRuntime, type EggRuntime } from "./runtime.svelte.js";
export {
	markFound,
	isFound,
	resetEggs,
	getFound,
	createEggsState,
	EGGS_STORAGE_KEY,
} from "./discovery.svelte.js";
export {
	EGG_IDS,
	EGG_OVERLAY_Z,
	type EggId,
	type EggDef,
	type EggContext,
	type EggPayloadModule,
	type EggTrigger,
} from "./types.js";
