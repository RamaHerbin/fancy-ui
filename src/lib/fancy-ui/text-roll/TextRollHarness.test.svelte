<!--
  Test-only harness: owns `value`/`direction` as its OWN internal `$state`,
  mutated through exported instance functions — deliberately NOT as incoming
  `$props` driven by `@testing-library/svelte`'s `rerender()`.

  That distinction is load-bearing for one specific regression test (the
  backstop must not restart on a `direction`-only change). Testing-library's
  props adapter (`@testing-library/svelte-core`'s `props.svelte.js`) keeps
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
	import TextRoll from "./TextRoll.svelte";

	let value = $state("A");
	let direction = $state<"auto" | "up" | "down">("up");

	export function setValue(next: string) {
		value = next;
	}
	export function setDirection(next: "auto" | "up" | "down") {
		direction = next;
	}
</script>

<TextRoll {value} {direction} />
