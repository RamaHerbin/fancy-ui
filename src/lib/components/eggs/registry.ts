import type { EggDef } from "./types.js";

// Each egg folder default-exports its EggDef; payloads stay behind its `load()`.
// Kept apart from index.ts so the runtime singleton can import it without a cycle.
const mods = import.meta.glob<EggDef>("./*/index.ts", { eager: true, import: "default" });

export const EGGS: readonly EggDef[] = Object.values(mods).sort((a, b) => a.order - b.order);
export const EGG_TOTAL = EGGS.filter((e) => !e.hidden).length;
