/**
 * The shared motion vocabulary: durations, curves and stagger steps every
 * component draws from instead of re-typing its own numbers.
 *
 * The values live in `token-values.ts` (pure data, byte-identical across the
 * Svelte, React and Vue packages). This file re-exports them and adds the JS
 * easing functions, which is the one framework-specific line: Svelte takes
 * `expoOut`/`expoIn` from `svelte/easing`, the ports from `./easing.js`.
 *
 * The CSS side (`--ft-duration-*`, `--ft-ease-*`, `--ft-stagger-*`,
 * `--ft-hover-*`) is generated from the same values into each package's
 * `tailwind.css` by `scripts/gen-motion-tokens.mjs`, so a consumer who
 * imports the entry can retime the whole library from one `:root` override.
 * Components still write their fallback literal — `var(--ft-ease-out,
 * cubic-bezier(0.16, 1, 0.3, 1))` — so a consumer who imports a component
 * without the entry gets the same motion. `pnpm check:motion-tokens` keeps
 * the generated block and every fallback in step with the values here.
 *
 * The four curves intentionally read as this collection's own voice, not as
 * "the house curve" borrowed from anywhere else — `out`/`in` are chosen to
 * have exact `svelte/easing` equivalents (`expoOut`/`expoIn`, see
 * `JS_EASINGS` below) so a component that needs the SAME curve as both a CSS
 * string (`transition-timing-function`) and a JS easing function (a Svelte
 * transition's `easing` field) never has two numbers to keep in sync.
 */

import { expoIn, expoOut } from "svelte/easing";

export * from "./token-values.js";

/** The same two curves as real JS functions, for `transitions.ts`'s
 * `preset()` and `anchored()` — a Svelte `TransitionConfig.easing` field
 * wants a `(t: number) => number`, not a CSS string. Only `out`/`in` exist
 * here: `inout` never drives a JS-timed transition (it is CSS-only, for
 * hover/press states that have no discrete start/end), and `overshoot` has
 * exactly one consumer (StatusMorph's success check, which computes its own
 * `scale` pop rather than going through `preset()`). Exits run on `out`
 * too; `in` has one caller (text-roll's wheel). */
export const JS_EASINGS = { out: expoOut, in: expoIn } as const;
