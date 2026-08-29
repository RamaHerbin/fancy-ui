/*
 * Test-only rig. The Svelte side binds `value`/`ref` here to prove the value
 * travels back out to the consumer rather than merely changing what the input
 * draws; the React counterpart holds the value as its own state, feeds it
 * back down through the `value` + `onValueChange` controlled pair, and echoes
 * it into the DOM. The ref effect mirrors the Svelte harness's `$effect`. Not
 * exported from index.ts, and not collected by Vitest (the run includes
 * `*.test.tsx` only).
 */
import { useEffect, useRef, useState } from "react";
import { NumberInput } from "./NumberInput.js";

export interface NumberInputHarnessProps {
	value?: number | null;
	onValueChange?: (value: number | null) => void;
	min?: number;
	max?: number;
	step?: number;
}

export function NumberInputHarness({
	value: initial = null,
	onValueChange,
	min,
	max,
	step,
}: NumberInputHarnessProps) {
	const [value, setValue] = useState<number | null>(initial);
	const el = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<NumberInput
				ref={el}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				min={min}
				max={max}
				step={step}
				label="Quantity"
			/>
			<span data-testid="bound-value">{value === null ? "null" : value}</span>
		</>
	);
}
