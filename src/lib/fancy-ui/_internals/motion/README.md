# Motion vocabulary

The timing every component draws from, and the rules for spending it. The values live in
`token-values.ts` (pure data, byte-identical in the Svelte, React and Vue packages); `tokens.ts`
re-exports them with the JS easing functions; `scripts/gen-motion-tokens.mjs` writes the same
values into each package's `tailwind.css` as `--ft-duration-*`, `--ft-ease-*`, `--ft-stagger-*`
and `--ft-hover-in` / `--ft-hover-out`, so one `:root` override retimes the library. Components keep
their fallbacks (`var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1))`), so importing a component
without the entry gives the same motion. `pnpm check:motion-tokens` keeps the generated block and
every fallback in step with the values, and counts the literals that are neither tokens nor
annotated.

## Rules

- **Exits decelerate.** An exit uses the arrival curve (`out`) over a shorter duration or a
  shallower depth; it is never delayed and never accelerates (an accelerating curve spends its
  first half near zero and reads as a wait). `in` is reserved for a departure that hands off to an
  entrance it visibly continues (text-roll's wheel). Where: `anchored.ts`, `transitions.ts`.
- **Hover and focus.** In = `fast` on `out`, out = `exit` on `out`, no delay on the way out (an
  intent delay is allowed on the way in only). A return settles, it never bounces: overshoot
  belongs to arrivals. Where: `HOVER` in `token-values.ts`, `--ft-hover-in` / `--ft-hover-out`.
- **Scroll-linked and pointer-linked motion** (`animation-timeline`, a spring following the
  pointer, a scrub) is exempt from the duration/easing vocabulary: its clock is the input. It still
  collapses to the resting state under reduced motion.
- **Under reduced motion** an opacity cross-fade may stand in for travel (`transform`, `filter`)
  when the state change would otherwise be invisible; the cross-fade uses `exit` or shorter.
- **Writing timing.** New components write their timing in CSS as `var(--ft-*, <token literal>)`
  or in JS from `tokens.ts`. A literal that is not a token is allowed only with an
  `off-token: <reason>` comment on the same or the previous line; a literal that equals a token
  value is wrapped in its `var(--ft-*, …)`. Motion written into an inline `style=` string
  (durations, curves, per-item delays) is not accepted for new components: it cannot be themed,
  gated or checked. Tailwind `duration-*` / `delay-*` utilities are reported, not counted.
- **Stagger vs sequence.** A stagger is N copies of one entrance offset in time, always routed
  through `staggerDelay` with `staggerCap(itemSizePx)` as the ceiling (rows ≈ 200 ms, cards
  ≈ 600 ms, linear between 48 and 448 px; measure the first child once per layout pass). A
  sequence (typing, word-by-word generation, a wheel) is successive states whose order is the
  content: uncapped, its step is a prop, and it is marked `off-token: sequence`. Where:
  `stagger.ts`, `reveal/Reveal.svelte`, `blur-reveal/BlurReveal.svelte`, `text-roll/roll-transitions.ts`.

## Gate

`pnpm check:motion-tokens` runs `scripts/gen-motion-tokens.mjs --check` (the three generated
blocks match `token-values.ts`) and `scripts/check-motion-tokens.mjs`: a `var(--ft-*, fallback)`
whose fallback differs from the token value fails outright; bare token-valued literals and
unannotated off-token literals are counted per package against `scripts/motion-tokens-pins.json`,
which only ratchets down (`--update-pins` after a drop; `--list` prints per-file counts).
