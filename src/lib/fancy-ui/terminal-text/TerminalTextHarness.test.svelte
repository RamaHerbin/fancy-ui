<!--
  Test-only harness: owns `lines` and `glitch` as its OWN internal `$state`,
  mutated through exported instance functions — deliberately NOT as incoming
  `$props` driven by `@testing-library/svelte`'s `rerender()`.

  That distinction is load-bearing for the two glitch-lifecycle regressions
  below. Testing-library's props adapter (`@testing-library/svelte-core`'s
  `props.svelte.js`) keeps ALL of a rendered component's props in a single
  shared `$state.raw` box, reassigned wholesale — `{ ...currentProps,
  ...nextProps }` — on every `rerender()` call. Every prop read anywhere in
  the tree traces back to that ONE box, so flipping just `glitch` still bumps
  the same underlying signal `lines` was read from and restarts the stream
  anyway. That is a coarseness in the test harness, not in Svelte: a real
  caller's own `$state` gives each field its own independent signal, exactly
  like the two below. This harness restores that fidelity so the regression
  tests exercise the real fix rather than an artifact of `rerender()`.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported from TerminalText.test.ts.
-->

<script lang="ts">
	import TerminalText from "./TerminalText.svelte";

	let lines = $state<string[]>(["abc"]);
	let glitch = $state(true);

	export function setLines(next: string[]) {
		lines = next;
	}
	export function setGlitch(next: boolean) {
		glitch = next;
	}
</script>

<TerminalText {lines} {glitch} speed={5} cursor={false} />
