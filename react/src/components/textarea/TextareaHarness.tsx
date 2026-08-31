/*
 * Test-only rig. The Svelte side binds `value`/`ref` here to prove the value
 * travels back out to the consumer rather than merely changing what the
 * textarea draws; the React counterpart holds the value as its own state,
 * feeds it back down through the `value` + `onValueChange` controlled pair,
 * and echoes it into the DOM. The ref effect mirrors the Svelte harness's
 * `$effect`. Not exported from index.ts, and not collected by Vitest (the run
 * includes `*.test.tsx` only).
 */
import { useEffect, useRef, useState } from "react";
import { Textarea } from "./Textarea.js";

export interface TextareaHarnessProps {
	value?: string;
	onValueChange?: (value: string) => void;
}

export function TextareaHarness({ value: initial = "", onValueChange }: TextareaHarnessProps) {
	const [value, setValue] = useState(initial);
	const el = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<Textarea
				ref={el}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				label="Message"
			/>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}
