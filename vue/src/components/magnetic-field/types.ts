/**
 * The contract between a `MagneticField` and the `MagneticItem`s and
 * `MagnetPuck`s inside it.
 *
 * The context value is the field's registration hub (see
 * `createMagneticFieldHub` in `magnetic-field-core.ts`): a stable object,
 * created once per field, that buffers registrations until the field's core
 * exists and replays them into it. Children only ever see these three methods.
 */

import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";
import type { MagneticFieldHub } from "./magnetic-field-core.js";

/** What a field publishes to its items and pucks. */
export type MagneticFieldContext = Pick<MagneticFieldHub, "register" | "updateItem" | "setSource">;

export const MAGNETIC_FIELD_KEY: InternalContext<MagneticFieldContext> =
	createInternalContext<MagneticFieldContext>("MagneticFieldContext");
