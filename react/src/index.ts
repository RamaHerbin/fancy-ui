"use client";

// fancy-ui-react — public barrel. One export block per component folder,
// mirroring src/lib/fancy-ui/index.ts on the Svelte side. The cameleon skin
// engine is deliberately NOT here (parity with the Svelte barrel); it ships
// through the "fancy-ui-react/cameleon" subpath export instead.
// GENERATED between migration waves — do not edit per-component by hand.
export { cn } from "./utils.js";

// Mirrors the Svelte barrel's non-component lines (internals-api.md §8).
export * from "./sound/index.js";
export type * from "./internals/ai-types.js";
export type * from "./internals/motion/types.js";

export * from "./components/border-beam/index.js";
export * from "./components/dialog/index.js";
export * from "./components/gradient-button/index.js";
export * from "./components/interactive-hover-button/index.js";
export * from "./components/marquee/index.js";
export * from "./components/meteors/index.js";
export * from "./components/presence/index.js";
export * from "./components/rainbow-button/index.js";
export * from "./components/ripple-button/index.js";
export * from "./components/shimmer-button/index.js";
