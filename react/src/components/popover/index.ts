export { Popover } from "./Popover.js";
export type { PopoverProps } from "./Popover.js";
export { PopoverContent } from "./PopoverContent.js";
export type { PopoverContentProps } from "./PopoverContent.js";

// The context key, kept because the source's own `index.ts` exports it (as a
// `unique symbol` there, as the React context object here) — the public
// escape hatch for a consumer composing their own panel content.
export { POPOVER_KEY } from "./types.js";
export type { PopoverContext } from "./types.js";
