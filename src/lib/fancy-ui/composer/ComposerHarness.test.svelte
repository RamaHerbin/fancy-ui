<!--
  Test-only composition rig. Two things cannot be done from a `.ts` test file:
  mounting the parts inside a real root, and reading the context the root
  publishes — `getContext` only answers during a child's initialisation. So the
  rig renders itself a second time, in `probe` mode, as a child of the composer:
  that instance hands the live context back through `onContext` and mirrors it
  into the DOM. Not exported from index.ts, and not collected by Vitest (the run
  includes `*.test.ts` only).
-->
<script lang="ts">
	import { getContext, untrack } from "svelte";
	import Composer from "./Composer.svelte";
	import ComposerInput from "./ComposerInput.svelte";
	import ComposerSubmit from "./ComposerSubmit.svelte";
	import Self from "./ComposerHarness.test.svelte";
	import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
	import type { AttachmentData } from "../_internals/ai-types.js";

	interface Props {
		/** Render as the context probe rather than as the composer. */
		probe?: boolean;
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

	let {
		probe = false,
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
	}: Props = $props();

	// Read once, on purpose: the mode and the seeds are fixed for a mounted rig,
	// and untrack says so rather than leaving a compiler hint behind.
	const isProbe = untrack(() => probe);
	const notify = untrack(() => onContext);
	const context = isProbe
		? getContext<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY)
		: undefined;
	if (isProbe) notify?.(context);

	let value = $state(untrack(() => initialValue));
	let attachments = $state<AttachmentData[]>(untrack(() => [...initialAttachments]));

	function handleAttach(files: File[]) {
		onAttach?.(files);
		if (!autoAttach) return;
		attachments = [
			...attachments,
			...files.map((file, index) => ({ id: `${file.name}#${index}`, name: file.name })),
		];
	}
</script>

{#if isProbe}
	<output data-testid="context-value">{context?.value.current ?? ""}</output>
	<output data-testid="context-attachments">{context?.attachments.current.length ?? 0}</output>
	<output data-testid="context-disabled">{context?.disabled ? "yes" : "no"}</output>
	<output data-testid="context-streaming">{context?.streaming ? "yes" : "no"}</output>
{:else}
	<Composer
		bind:value
		bind:attachments
		{disabled}
		{streaming}
		{sound}
		{onSubmit}
		{onStop}
		onAttach={handleAttach}
	>
		{#snippet children()}
			<ComposerInput {placeholder} {maxRows} />
			<div class="flex items-center gap-2">
				<div class="flex-1"></div>
				<ComposerSubmit />
			</div>
			<Self probe {onContext} />
		{/snippet}
	</Composer>
	<output data-testid="bound-value">{value}</output>
	<output data-testid="bound-attachments">{attachments.length}</output>
{/if}
