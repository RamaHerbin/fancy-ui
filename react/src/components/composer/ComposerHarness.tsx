/*
 * Test-only composition rig (not a `.test.tsx` file, so vitest does not collect
 * it as its own suite). Two things cannot be done from the test file itself:
 * mounting the parts inside a real root, and reading the context the root
 * publishes. So the rig renders a `Probe` child inside the composer, which hands
 * the live context back through `onContext` and mirrors it into the DOM.
 *
 * The Svelte rig used a second instance of itself in `probe` mode because
 * `getContext` only answers during a child's initialisation; `useContext` has no
 * such rule, so the probe is a plain local component here. Not exported from
 * index.ts.
 */
import { useContext, useEffect, useState } from "react";

import type { AttachmentData } from "../../internals/ai-types.js";
import { Composer } from "./Composer.js";
import { ComposerInput } from "./ComposerInput.js";
import { ComposerSubmit } from "./ComposerSubmit.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import type { ComposerContext } from "./types.js";

export interface ComposerHarnessProps {
	onContext?: (context: ComposerContext | undefined) => void;
	initialValue?: string;
	initialAttachments?: AttachmentData[];
	disabled?: boolean;
	streaming?: boolean;
	placeholder?: string;
	maxRows?: number;
	/** Stand in for a consumer that uploads and then appends the attachment. */
	autoAttach?: boolean;
	onSubmit?: (payload: { text: string; attachments: AttachmentData[] }) => void;
	onStop?: () => void;
	onAttach?: (files: File[]) => void;
	sound?: boolean;
}

/**
 * Reads the context the root publishes and mirrors it into the DOM.
 *
 * The handle is reported after every commit rather than once at mount: the root
 * rebuilds the context object per render, so a test holding the first one would
 * be reading a snapshot of the draft. The commands on it are identity-stable
 * either way.
 */
function Probe({ onContext }: { onContext?: (context: ComposerContext | undefined) => void }) {
	const context = useContext(COMPOSER_CONTEXT_KEY);

	useEffect(() => {
		onContext?.(context);
	});

	return (
		<>
			<output data-testid="context-value">{context?.value.current ?? ""}</output>
			<output data-testid="context-attachments">{context?.attachments.current.length ?? 0}</output>
			<output data-testid="context-disabled">{context?.disabled ? "yes" : "no"}</output>
			<output data-testid="context-streaming">{context?.streaming ? "yes" : "no"}</output>
		</>
	);
}

export function ComposerHarness({
	onContext,
	initialValue = "",
	initialAttachments = [],
	disabled = false,
	streaming = false,
	placeholder,
	maxRows,
	autoAttach = false,
	onSubmit,
	onStop,
	onAttach,
	sound = false,
}: ComposerHarnessProps) {
	// Seeded once, as the Svelte rig's `untrack` reads are: the mode and the seeds
	// are fixed for a mounted rig.
	const [value, setValue] = useState(initialValue);
	const [attachments, setAttachments] = useState<AttachmentData[]>(() => [...initialAttachments]);

	function handleAttach(files: File[]) {
		onAttach?.(files);
		if (!autoAttach) return;
		setAttachments((current) => [
			...current,
			...files.map((file, index) => ({ id: `${file.name}#${index}`, name: file.name })),
		]);
	}

	return (
		<>
			<Composer
				value={value}
				onValueChange={setValue}
				attachments={attachments}
				onAttachmentsChange={setAttachments}
				disabled={disabled}
				streaming={streaming}
				onSubmit={onSubmit}
				onStop={onStop}
				onAttach={handleAttach}
				sound={sound}
			>
				<ComposerInput placeholder={placeholder} maxRows={maxRows} />
				<div className="flex items-center gap-2">
					<div className="flex-1" />
					<ComposerSubmit />
				</div>
				<Probe onContext={onContext} />
			</Composer>
			<output data-testid="bound-value">{value}</output>
			<output data-testid="bound-attachments">{attachments.length}</output>
		</>
	);
}
