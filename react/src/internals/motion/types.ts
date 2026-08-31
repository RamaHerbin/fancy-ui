/**
 * Type-only aggregate of the shared unions component prop interfaces need to
 * reference. Re-exported from the package barrel as
 * `export type * from "./internals/motion/types.js"` (the barrel's edit, not
 * this file's) so a component's own `<ComponentName>Props` can `import type`
 * these from one place instead of reaching into individual foundation files
 * — and, per the common contract, so a component's `index.ts` barrel never
 * has to re-export a type itself (which would risk a name collision across
 * the ten components' barrels).
 *
 * `verbatimModuleSyntax` (this package's tsconfig) means every line here is
 * `export type` and compiles to nothing at runtime — this module has zero
 * JS output, by design.
 */

export type { PresetName, RevealPresetName } from "./presets.js";
export type { StaggerFrom } from "./stagger.js";
export type { HapticPattern } from "./haptics.js";
