// Test-only rig (not itself a `.test.tsx` file so vitest does not collect it
// as its own suite). Mirrors the Svelte `bind:pressed` / `bind:ref` proof: a
// controlled `pressed` state round-tripped through `onPressedChange`, plus a
// ref captured on mount that marks the rendered button so the test can prove
// the two are the same element. Not exported from index.ts.
import { useRef, useState } from "react";
import { Toggle } from "./Toggle.js";

export function ToggleHarness() {
	const [pressed, setPressed] = useState(false);
	const ref = useRef<HTMLButtonElement | null>(null);

	return (
		<>
			<Toggle
				ref={(el) => {
					ref.current = el;
					el?.setAttribute("data-bound-ref", "yes");
				}}
				pressed={pressed}
				onPressedChange={setPressed}
				label="Bold"
			>
				B
			</Toggle>
			<span data-testid="bound-pressed">{String(pressed)}</span>
		</>
	);
}
