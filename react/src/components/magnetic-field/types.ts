import { createContext } from "react";
import type { MagneticFieldHub } from "./magnetic-field-core.js";

/**
 * The contract between a `MagneticField` and the `MagneticItem`s and
 * `MagnetPuck`s inside it.
 *
 * The context value is the field's registration hub (see
 * `createMagneticFieldHub` in `magnetic-field-core.ts`): a stable object,
 * created once per field, that buffers registrations until the field's core
 * exists and replays them into it. Children only ever see these three methods.
 */
export type MagneticFieldContext = Pick<MagneticFieldHub, "register" | "updateItem" | "setSource">;

/**
 * React's context object plays the role of the Svelte source's `Symbol` key,
 * so the exported name is kept and the value is a `React.Context`. Read it as
 * optional: an item or a puck rendered outside a field gets `undefined`.
 */
export const MAGNETIC_FIELD_KEY = createContext<MagneticFieldContext | undefined>(undefined);
MAGNETIC_FIELD_KEY.displayName = "MagneticFieldContext";
