<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { ToolCallData } from "../_internals/ai-types.js";

	/**
	 * Props for ToolCall
	 */
	export interface ToolCallProps {
		/** The invocation to render: name, status, and whatever payloads exist so far. */
		call: ToolCallData;
		/**
		 * Whether the payloads are expanded. Bindable, and left alone until either
		 * the reader or a failure decides — see the open-behaviour contract in the
		 * README.
		 */
		open?: boolean;
		/** Replaces the default request rendering. Receives `call.input`. */
		input?: Snippet<[unknown]>;
		/** Replaces the default result rendering. Receives `call.output`. */
		output?: Snippet<[unknown]>;
		/** Leading icon, replacing the default wrench. */
		icon?: Snippet;
		/** Called whenever the card opens or closes, by click or on its own. */
		onToggle?: (open: boolean) => void;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { formatElapsed } from "../_internals/elapsed.svelte.js";

	let {
		call,
		open = $bindable(),
		input,
		output,
		icon,
		onToggle,
		class: className,
		ref = $bindable(null),
	}: ToolCallProps = $props();

	/** Spoken alongside the tool name, since the dot's colour says nothing out loud. */
	const STATUS_LABELS = {
		pending: "Pending",
		running: "Running",
		done: "Completed",
		error: "Failed",
		cancelled: "Cancelled",
	} as const;

	/** Shown when a call reports failure without saying why. */
	const FALLBACK_ERROR = "The tool call failed.";

	const uid = $props.id();
	const headerId = `${uid}-header`;
	const bodyId = `${uid}-body`;
	const requestId = `${uid}-request`;
	const resultId = `${uid}-result`;

	// `open` stays undefined until something actually decides: `autoOpen` carries
	// the answer in the meantime, so a consumer that never touches the prop still
	// gets the automatic behaviour and one that binds it still owns the value.
	let autoOpen = $state(false);
	let userToggled = $state(false);

	const isOpen = $derived(open ?? autoOpen);
	const status = $derived(call.status);
	const isError = $derived(status === "error");
	const errorText = $derived(isError ? (call.error ?? FALLBACK_ERROR) : "");
	const duration = $derived(call.durationMs === undefined ? "" : formatElapsed(call.durationMs));

	// A snippet counts as content on its own: a caller who renders the payload
	// themselves may well have nothing on `call` for us to look at.
	const hasRequest = $derived(input !== undefined || call.input !== undefined);
	const hasOutput = $derived(output !== undefined || call.output !== undefined);
	const hasResult = $derived(hasOutput || errorText !== "");

	const requestText = $derived(hasRequest ? formatPayload(call.input) : "");
	const resultText = $derived(hasOutput ? formatPayload(call.output) : "");

	/**
	 * Objects and arrays get pretty-printed JSON; primitives are rendered bare so
	 * a string result reads as prose rather than as a quoted literal.
	 *
	 * The two things `JSON.stringify` refuses outright — a cycle and a bigint —
	 * are what tool payloads are actually made of, and `String()` turns both into
	 * `[object Object]`, which tells the reader nothing. So a refusal earns a
	 * second attempt through a replacer that names them instead; `String` is left
	 * for the payload that defeats even that, such as a `toJSON` that throws.
	 */
	function formatPayload(value: unknown): string {
		if (value === undefined) return "";
		if (value === null || typeof value !== "object") return String(value);
		try {
			return JSON.stringify(value, null, 2) ?? String(value);
		} catch {
			try {
				const seen = new WeakSet<object>();
				const json = JSON.stringify(
					value,
					(_key, entry: unknown) => {
						if (typeof entry === "bigint") return `${entry}n`;
						if (entry !== null && typeof entry === "object") {
							if (seen.has(entry)) return "[Circular]";
							seen.add(entry);
						}
						return entry;
					},
					2
				);
				return json ?? String(value);
			} catch {
				return String(value);
			}
		}
	}

	function commit(next: boolean) {
		if (untrack(() => open ?? autoOpen) === next) return;
		open = next;
		autoOpen = next;
		onToggle?.(next);
	}

	function toggle() {
		// From here on the reader owns the card: a later failure will not pop it
		// open again behind their back.
		userToggled = true;
		commit(!isOpen);
	}

	// A failure is the one thing worth reading without being asked, so it expands
	// itself — unless the reader has already taken over. `userToggled` is read
	// untracked so that taking over does not itself re-run this.
	$effect(() => {
		const failed = call.status === "error";
		untrack(() => {
			if (!failed || userToggled) return;
			commit(true);
		});
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-toolcall border-border bg-card/50 w-full rounded-lg border text-sm", className)}
	data-status={status}
>
	<button
		type="button"
		id={headerId}
		class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
		aria-expanded={isOpen}
		aria-controls={bodyId}
		onclick={toggle}
	>
		<span class="ft-toolcall-icon flex-none" aria-hidden="true">
			{#if icon}
				{@render icon()}
			{:else}
				<svg
					class="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
					/>
				</svg>
			{/if}
		</span>

		<!--
			Filled versus hollow, not just hue: the four states stay apart for anyone
			who cannot tell the colours apart, and the label below says it in words.
		-->
		<span
			class="ft-toolcall-dot flex-none"
			class:ft-status-pending={status === "pending"}
			class:ft-status-running={status === "running"}
			class:ft-status-done={status === "done"}
			class:ft-status-error={isError}
			class:ft-status-cancelled={status === "cancelled"}
			aria-hidden="true"
		></span>

		<span
			class="ft-toolcall-name text-foreground min-w-0 truncate font-mono text-xs"
			class:ft-struck={status === "cancelled"}>{call.name}</span
		>
		<span class="sr-only">{STATUS_LABELS[status]}</span>

		<span class="ml-auto flex flex-none items-center gap-2">
			{#if duration}
				<span class="text-xs tabular-nums">{duration}</span>
			{/if}
			<svg
				class="ft-toolcall-chevron size-3.5"
				class:ft-open={isOpen}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m9 6 6 6-6 6" />
			</svg>
		</span>
	</button>

	<div class="ft-toolcall-body" class:ft-open={isOpen}>
		<div class="overflow-hidden">
			<div
				id={bodyId}
				role="group"
				aria-labelledby={headerId}
				inert={!isOpen}
				class="flex flex-col gap-3 px-3 pb-3"
			>
				{#if hasRequest}
					<section aria-labelledby={requestId}>
						<div id={requestId} class="text-muted-foreground mb-1 text-xs font-medium">Request</div>
						{#if input}
							{@render input(call.input)}
						{:else}
							<pre class="ft-toolcall-payload">{requestText}</pre>
						{/if}
					</section>
				{/if}

				{#if hasResult}
					<section aria-labelledby={resultId}>
						<div id={resultId} class="text-muted-foreground mb-1 text-xs font-medium">Result</div>
						{#if errorText}
							<p class="ft-toolcall-error-text">{errorText}</p>
						{/if}
						{#if output}
							{@render output(call.output)}
						{:else if hasOutput}
							<pre class="ft-toolcall-payload" class:mt-2={errorText}>{resultText}</pre>
						{/if}
					</section>
				{/if}

				{#if !hasRequest && !hasResult}
					<p class="text-muted-foreground text-xs italic">Nothing recorded yet.</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/*
	 * Every status colour is read at the point of use through two hooks: the
	 * component's own `--ft-toolcall-*`, then the `--ft-status-*` vocabulary every
	 * component in this family shares, then the literal. Setting either anywhere up
	 * the tree retints the state without having to win a specificity fight against
	 * these scoped rules — the shared one recolours the whole family at once.
	 */
	.ft-toolcall-dot {
		position: relative;
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
	}

	/* Hollow: nothing has happened yet, or nothing ever will. The two share a hue
	   and stay apart on the ring's weight, plus the struck-through name below. */
	.ft-toolcall-dot.ft-status-pending {
		box-shadow: inset 0 0 0 1.5px
			var(
				--ft-toolcall-pending,
				color-mix(
					in oklab,
					var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 55%,
					transparent
				)
			);
	}

	.ft-toolcall-dot.ft-status-cancelled {
		box-shadow: inset 0 0 0 1.5px
			var(
				--ft-toolcall-cancelled,
				color-mix(
					in oklab,
					var(--ft-status-cancelled, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 40%,
					transparent
				)
			);
	}

	.ft-toolcall-dot.ft-status-running {
		background: var(
			--ft-toolcall-running,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-toolcall-dot.ft-status-done {
		background: var(
			--ft-toolcall-done,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-toolcall-dot.ft-status-error {
		background: var(
			--ft-toolcall-error,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	.ft-toolcall-name.ft-struck {
		text-decoration: line-through;
		opacity: 0.7;
	}

	.ft-toolcall-error-text {
		color: var(
			--ft-toolcall-error,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.ft-toolcall-payload {
		max-height: var(--ft-toolcall-max-height, 16rem);
		overflow-y: auto;
		border-radius: 0.375rem;
		background: var(--ft-toolcall-payload-bg, color-mix(in oklab, currentColor 6%, transparent));
		padding: 0.5rem 0.625rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		/* Wrapping rather than scrolling sideways: a long URL in a payload should
		   not put the whole card on a horizontal rail. */
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/*
	 * 0fr → 1fr on a one-row grid is the only way to transition "auto" height
	 * without measuring anything. The inner wrapper does the clipping.
	 */
	.ft-toolcall-body {
		display: grid;
		grid-template-rows: 0fr;
	}

	.ft-toolcall-body.ft-open {
		grid-template-rows: 1fr;
	}

	.ft-toolcall-chevron.ft-open {
		transform: rotate(90deg);
	}

	/*
	 * Everything that moves lives behind the query, so reduced motion gets the
	 * same states with nothing to shorten or fall back from — a running call is
	 * still a filled accent dot, it just stops breathing.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-toolcall-body {
			transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-toolcall-chevron {
			transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-toolcall-dot.ft-status-running::after {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background: inherit;
			animation: ft-toolcall-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
		}
	}

	@keyframes ft-toolcall-ping {
		from {
			opacity: 0.55;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(2.4);
		}
	}
</style>
