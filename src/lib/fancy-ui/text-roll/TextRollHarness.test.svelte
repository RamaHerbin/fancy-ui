<!--
  Test-only harness: owns `value`/`direction`/`duration` as its OWN internal
  `$state`, mutated through exported instance functions — deliberately NOT as
  incoming `$props` driven by `@testing-library/svelte`'s `rerender()`.

  That distinction is load-bearing for two specific regression tests (the
  backstop must restart on neither a `direction`-only nor a `duration`-only
  change, and a `direction`-only change must still reach `data-direction`).
  Testing-library's props adapter (`@testing-library/svelte-core`'s `props.svelte.js`) keeps
  ALL of a rendered component's props in a single shared `$state.raw` box,
  reassigned wholesale — `{ ...currentProps, ...nextProps }` — on every
  `rerender()` call. Every prop read anywhere in the tree traces back to
  that ONE box, so changing just `direction` still bumps the SAME
  underlying signal `value` was read from, and effects that only read
  `value` rerun anyway. That is a coarseness in the test harness, not in
  Svelte: a real caller's own `$state`/`$derived` gives each field its own
  independent signal, exactly like this harness's `value`/`direction`
  below, and `TextRoll`'s internal effects DO correctly stay isolated
  against a real per-field source. This harness restores that fidelity so
  the regression test exercises the real fix rather than an artifact of
  `rerender()`.

  Not exported from index.ts, and not collected by Vitest directly (the
  run includes `*.test.ts` only) — imported from TextRoll.test.ts.
-->

<script lang="ts">
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import TextRoll from "./TextRoll.svelte";

	let value = $state("A");
	let direction = $state<"auto" | "up" | "down">("up");
	// Seeded with TextRoll's OWN default so the harness starts out
	// indistinguishable from `<TextRoll {value} />` — a test that never calls
	// `setDuration` gets the default-duration timings the other suites assume.
	let duration = $state<number>(DURATIONS.base);

	export function setValue(next: string) {
		value = next;
	}
	export function setDirection(next: "auto" | "up" | "down") {
		direction = next;
	}
	export function setDuration(next: number) {
		duration = next;
	}
</script>

<TextRoll {value} {direction} {duration} />
