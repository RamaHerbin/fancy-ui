/*
 * Test-only rig. React has no two-way `bind:` — the harness owns the state
 * itself and threads `value`/`onValueChange` through, echoing the value into
 * the DOM to prove it travels back out to the consumer rather than merely
 * changing what the input draws, and the same goes for the forwarded ref.
 * Not exported from index.ts, and not collected by Vitest as a spec file.
 */
import { useEffect, useRef, useState } from "react";
import { Slider } from "./Slider.js";

export interface SliderHarnessProps {
	onValueChange?: (value: number) => void;
}

export function SliderHarness({ onValueChange }: SliderHarnessProps) {
	const [value, setValue] = useState(0);
	const ref = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		ref.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<Slider
				ref={ref}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				label="Volume"
			/>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}
