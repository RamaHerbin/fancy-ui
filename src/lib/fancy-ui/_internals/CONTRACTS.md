# Interaction contracts

The rules every component that holds state, answers a gesture or reports an async outcome follows,
in all three packages. The Svelte source is the reference; `react/PORTING.md` and `vue/PORTING.md`
("Interaction contracts") map each rule to their framework. A component that cannot meet a rule
says so in its README instead of quietly diverging. Each section: rule, why, where it already holds.
Paths are relative to `src/lib/fancy-ui/` unless they start with `react/` or `vue/`.

## 1. State ownership

- **Hot by default.** A prop changed after mount takes effect on its next read. A prop that is
  mount-only is read once, explicitly (`untrack` in Svelte), and its docs say "read once, at mount".
- **One triad for consumer-ownable state.** Svelte `x = $bindable(d)` + `onXChange(next)`; React `x`
  (controlled) / `defaultX` (uncontrolled seed) / `onXChange`; Vue `v-model:x` + `onXChange`.
- The component writes its copy, then calls the callback, in that order, from the event handler,
  never from an effect. A write from the parent always wins, including while an attempt is pending.
- Why: a prop that silently stops responding cannot be debugged from outside, and a prop feeding two
  timers that only one of them re-reads leaves the UI disagreeing with itself.
- Where: `copy-button/CopyButton.svelte` freezes `resetMs` once so the glyph and the skin share one
  window (`copy-button/README.md`, "read once, at mount"). `switch/Switch.svelte`,
  `react/src/components/switch/Switch.tsx` and `vue/src/components/switch/Switch.vue` are the full
  triad. `toggle/Toggle.svelte` writes in the handler so a caller's `bind:pressed` is never fought.
- Known gap: `react/src/components/toggle/Toggle.tsx` treats `pressed` as a seed only (no
  controlled mode, no `defaultPressed`).

## 2. Async feedback

- States run `idle → pending → success | error → idle`. A new attempt first clears the standing
  outcome, then takes a ticket (`const mine = ++attempt`).
- Only the latest ticket may paint, announce, play a sound or arm the reset timer. Stale results
  are dropped from the UI but never from the API: the outcome callback fires for every attempt,
  with the value that attempt started with (snapshot it before the first `await`).
- Every timer is cleared on re-arm and on unmount; a resolve after unmount writes nothing.
- Failures resolve to an outcome (`false`, `"error"`), they never throw out of a click handler.
- Why: a permission prompt or a slow network keeps a promise open across a second click, and the
  two settle in whatever order they like.
- Where: `_internals/clipboard.svelte.ts` (`ticket`, `destroyed`, `clearTimer`) and the `attempt`
  ticket in `copy-button/CopyButton.svelte`; `react/src/internals/use-copy.ts`,
  `vue/src/internals/use-copy.ts`. `vue/src/components/copy-button/CopyButton.vue` snapshots the
  value explicitly, the React button by closure; the Svelte button still reports the live prop.

## 3. Live announcements

- One live region per outcome surface, mounted from first render (a region created at the same
  time as its text is not reliably announced), and never inside the control's accessible name.
- `role="status"` stays static; `aria-live` is `polite` for progress and success, `assertive` for
  errors only. Visible label text is not a second region: two regions double-announce.
- Text is `"<label>: <outcome>"` when the outcome alone would not say what it is about, and only
  the outcome when the control's name already does ("Copied" on a copy button).
- Why: assistive tech hears every region; duplicates and context-free outcomes are noise.
- Where: `status-morph/StatusMorph.svelte` (one `role="status"` region portalled to the body, so
  outside every button's name; polite/assertive swap) and its React and Vue ports; the
  `"label: value"` form is `composer/ComposerModelPicker.svelte`'s accessible name.
- Known gap (CopyButton mission): with a custom child, `copy-button/CopyButton.svelte` and its two
  ports fall back to an sr-only `aria-live` span inside the button, so the name flips from "Copy"
  to "Copied" each attempt. Fix: move that region out of the button as a static `role="status"`.

## 4. Keyboard and touch

- Anything a pointer can activate, Space and Enter activate too: a native `<button>` gives both;
  any other host handles them itself and ignores key-repeat.
- Pending keeps focus: mark it `aria-busy="true"` and block activation in the handler, never with
  the native `disabled` attribute (it drops focus and skips the control in tab order).
- No state is reachable by hover alone. Hover motion and hover-revealed content sit behind
  `@media (hover: hover)` with a matching `:focus-visible` rule (a hover colour shift may stay
  ungated); hover-only behaviour in JS checks `pointerType` (mouse or pen).
- Why: a coarse pointer has no hover, and a sticky synthetic hover after a tap reads as a bug.
- Where: `button/Button.svelte`, `<button>` branch (`loading` → `aria-busy`, native `disabled` left
  alone, guard in `handleClick`); `pressable/Pressable.svelte` (`isActivationKey`, `event.repeat`);
  the `link/Link.svelte` arrow motion and `dim-siblings/DimSiblings.svelte` (`(hover: hover)` +
  `:focus-visible`); `sound/sound-feedback.ts` (hover cue for mouse and pen only).
- Fixed (Button form-contract mission): the `href` branch of Button, in all three packages, goes
  inert only while `disabled` (`anchorInert`: no `href`, `tabindex="-1"`). While `loading` the anchor
  keeps its `href` and tab stop, sets `aria-busy`, and its activation is blocked (`anchorBlocked`).

## 5. Reduced motion

- `transform`, `opacity` and `filter` transitions and keyframes live inside
  `@media (prefers-reduced-motion: no-preference)`; the ungated rules are the final resting state.
  Colour transitions are not motion and stay ungated.
- JS-timed motion reads the preference and collapses its duration to `0`: live via
  `createReducedMotion()`, or `prefersReducedMotion()` at the instant a one-shot transition starts.
- Reduced motion snaps to the end state; it never skips the state change, the announcement or the
  callback. A press may swap scale for a static opacity change, it may not disappear.
- Why: the preference asks for less movement, not less information.
- Where: `_internals/motion/tokens.ts` (the gating rule), `status-morph/StatusMorph.svelte` (all
  motion under `no-preference`), `pagination/Pagination.svelte` (`flipDuration` → 0),
  `button/Button.svelte` (`leadFade`), `pressable/Pressable.svelte` and `toggle/Toggle.svelte`
  (press state always tracked, only its animation gated).

## 6. Width stability

- A control whose text or glyph changes with its state reserves the widest state up front: every
  variant is rendered in one grid cell (`grid-area: 1 / 1`), the inactive ones `aria-hidden` and
  invisible, so the box never resizes when the state flips. No JS measurement, so it is SSR-safe.
- Exception: `iconOnly` controls, whose box is the fixed icon footprint already.
- Glyph swaps keep one footprint for every state (all shapes always mounted, opacity toggled).
- Why: a button that changes width under the pointer moves its neighbours and the click target.
- Where: `button/Button.svelte` (`.ft-btn-lead`: spinner and icon share one cell),
  `password-input/PasswordInput.svelte` (`.ft-password-input-eye-layer`),
  `status-morph/StatusMorph.svelte` (five shapes, one 1em box), `text-roll/TextRoll.svelte`
  (`.ft-textroll-real` over its cells). Known gap: the `copy-button/CopyButton.svelte` label does
  not reserve its widest state yet.
