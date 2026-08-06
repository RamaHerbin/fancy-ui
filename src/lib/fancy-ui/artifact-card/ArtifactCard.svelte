<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { StreamStatus } from "../_internals/ai-types.js";

	/**
	 * Props for ArtifactCard
	 */
	export interface ArtifactCardProps {
		/** What the document is called. Required — it is the card's whole identity. */
		title: string;
		/** The kind of thing it is, on the muted line under the title. */
		kind?: string;
		/** Which revision is on screen, 1-based. Rendered as `v3`. */
		version?: number;
		/** How many revisions exist. With `version`, the badge reads `v3/5`. */
		versionCount?: number;
		/**
		 * Asked to show another revision, by 1-based version number. Supplying it
		 * turns the badge into a navigator; the card holds no version state itself.
		 */
		onVersionChange?: (version: number) => void;
		/** Where the document is in its life: waiting, being written, finished, failed. */
		status?: StreamStatus;
		/** The text so far — not the latest delta. Growing it is what streams. */
		preview?: string;
		/** Asked to open the document. Supplying it adds an Open button to the header rail. */
		onOpen?: () => void;
		/** Buttons for the top-right rail: copy, download, delete. */
		actions?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element, bindable. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import StreamingText from "../streaming-text/StreamingText.svelte";

	let {
		title,
		kind = "Document",
		version,
		versionCount,
		onVersionChange,
		status = "done",
		preview,
		onOpen,
		actions,
		class: className,
		ref = $bindable(null),
	}: ArtifactCardProps = $props();

	/** Spoken beside the title, since the sweep and the tint say nothing out loud. */
	const STATUS_LABELS = {
		idle: "Not started",
		streaming: "Writing",
		done: "Ready",
		error: "Failed",
	} as const;

	/** The footer a failed artifact grows, since no `error` string is carried here. */
	const ERROR_TEXT = "This document could not be generated.";

	/**
	 * Anything that has its own activation gets to keep it: a click on the version
	 * navigator or on an action button must not also count as opening the card.
	 * The two rails are named alongside the controls themselves, because the gaps
	 * between their buttons belong to them too — a click that lands beside an arrow,
	 * or on a disabled one, is aimed at the navigator, not at the document.
	 */
	const CONTROL_SELECTOR = "a[href], button, input, select, textarea, [contenteditable='true']";
	const OPEN_GUARD_SELECTOR = `${CONTROL_SELECTOR}, .ft-artifact-versions, .ft-artifact-actions`;

	const isStreaming = $derived(status === "streaming");
	const isError = $derived(status === "error");

	const hasPreview = $derived(preview !== undefined && preview !== "");
	const hasVersion = $derived(version !== undefined);
	const hasCount = $derived(hasVersion && versionCount !== undefined && versionCount > 0);
	// A navigator only makes sense when there is somewhere to navigate to *and*
	// somebody listening; otherwise the same numbers render as a plain badge.
	const navigable = $derived(hasCount && onVersionChange !== undefined);

	const versionLabel = $derived(
		hasCount ? `v${version}/${versionCount}` : hasVersion ? `v${version}` : ""
	);
	const atFirst = $derived((version ?? 1) <= 1);
	const atLast = $derived((version ?? 1) >= (versionCount ?? 1));

	function fromControl(event: Event): boolean {
		const target = event.target;
		return target instanceof Element && target.closest(OPEN_GUARD_SELECTOR) !== null;
	}

	/**
	 * Pointer-only convenience. The keyboard path is the Open button in the header
	 * rail — a real `<button>`, so `Enter` and `Space` are the browser's job — and
	 * the card itself stays a plain region rather than an ARIA button, which would
	 * make its children presentational and swallow the navigator, the actions rail
	 * and the spoken status.
	 */
	function open(event: MouseEvent) {
		if (fromControl(event)) return;
		onOpen?.();
	}

	function step(delta: number) {
		const current = version ?? 1;
		const next = current + delta;
		if (next < 1 || next > (versionCount ?? 1)) return;
		onVersionChange?.(next);
	}

	/*
	 * No `disabled:pointer-events-none`: a disabled button already swallows its own
	 * clicks, and taking it out of the event flow retargets the click at the card
	 * behind it — which would open the document from the arrow that refused to move.
	 */
	const navButtonClass =
		"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-5 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:opacity-40";
</script>

<!--
	The card-wide click is a pointer shortcut for the Open button in the rail, which
	is where the tab stop and the key handling live. Both warnings are about a
	keyboard path that exists here, one element over.
-->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	bind:this={ref}
	class={cn(
		"ft-artifact border-border bg-card relative w-full overflow-hidden rounded-lg border",
		onOpen && "hover:border-foreground/25 cursor-pointer transition-colors",
		className
	)}
	data-status={status}
	onclick={onOpen ? open : undefined}
>
	<!--
		The sweep is parked off its own left edge, so reduced motion — which never
		starts the animation — simply never sees it.
	-->
	{#if isStreaming}
		<span class="ft-artifact-sweep" aria-hidden="true"></span>
	{/if}

	<div class="flex items-start gap-2.5 px-3 py-2.5">
		<span class="ft-artifact-icon text-muted-foreground mt-0.5 flex-none" aria-hidden="true">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M14 3v5h5" />
				<path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" />
			</svg>
		</span>

		<div class="min-w-0 flex-1">
			<div class="ft-artifact-title text-foreground truncate text-sm font-medium">{title}</div>
			<div class="ft-artifact-kind text-muted-foreground truncate text-xs">{kind}</div>
		</div>

		<div class="flex flex-none items-center gap-1">
			{#if navigable}
				<div
					class="ft-artifact-versions text-muted-foreground flex items-center gap-0.5 text-xs"
					role="group"
					aria-label="Document versions"
				>
					<button
						type="button"
						class={navButtonClass}
						aria-label="Previous version"
						disabled={atFirst}
						onclick={() => step(-1)}
					>
						<svg
							class="size-3"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
					</button>
					<span class="ft-artifact-version tabular-nums">{versionLabel}</span>
					<button
						type="button"
						class={navButtonClass}
						aria-label="Next version"
						disabled={atLast}
						onclick={() => step(1)}
					>
						<svg
							class="size-3"
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
					</button>
				</div>
			{:else if hasVersion}
				<span class="ft-artifact-version text-muted-foreground text-xs tabular-nums"
					>{versionLabel}</span
				>
			{/if}

			{#if actions}
				<div class="ft-artifact-actions flex items-center gap-1">{@render actions()}</div>
			{/if}

			{#if onOpen}
				<!--
					The visible affordance and the operable one are the same element: a
					real button, so it takes a tab stop and handles Enter and Space on the
					browser's terms, and it names the document rather than saying "Open"
					into a list of identical cards.
				-->
				<button
					type="button"
					class="ft-artifact-open text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-0.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
					aria-label="Open {title}"
					onclick={() => onOpen?.()}
				>
					Open
					<svg
						class="size-3"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<span class="sr-only">{STATUS_LABELS[status]}</span>

	{#if hasPreview}
		<div class="ft-artifact-preview border-border border-t px-3 py-3 text-sm">
			<div class="ft-artifact-clamp">
				<StreamingText text={preview ?? ""} streaming={isStreaming} />
			</div>
		</div>
	{/if}

	{#if isError}
		<p class="ft-artifact-error border-border border-t px-3 py-2 text-xs">{ERROR_TEXT}</p>
	{/if}
</div>

<style>
	/*
	 * Both colours are read at the point of use through the component's own
	 * `--ft-artifact-*` hook, then the `--ft-status-*` vocabulary the whole AI
	 * family shares, then the literal. Setting either anywhere up the tree retints
	 * the card without having to out-specify these scoped rules.
	 */
	.ft-artifact-error {
		color: var(
			--ft-artifact-error,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
		background: color-mix(
			in oklab,
			var(
					--ft-artifact-error,
					var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
				)
				7%,
			transparent
		);
	}

	.ft-artifact-preview {
		background: var(--ft-artifact-preview-bg, color-mix(in oklab, currentColor 4%, transparent));
	}

	/*
	 * A teaser, not the document: six lines of it, with the last one dissolving so
	 * the cut never reads as the end of the text.
	 */
	.ft-artifact-clamp {
		max-height: var(--ft-artifact-preview-height, 9rem);
		overflow: hidden;
		line-height: 1.5;
		-webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
		mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
	}

	.ft-artifact-sweep {
		position: absolute;
		inset-inline: 0;
		inset-block-start: 0;
		block-size: 2px;
		overflow: hidden;
		pointer-events: none;
	}

	.ft-artifact-sweep::after {
		content: "";
		position: absolute;
		inset-block: 0;
		inline-size: 45%;
		/* Parked off the left edge: with no animation running, nothing shows. */
		transform: translateX(-110%);
		background: linear-gradient(
			90deg,
			transparent,
			var(
				--ft-artifact-running,
				var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
			),
			transparent
		);
	}

	/*
	 * The sweep is the only thing that moves, and it lives entirely behind the
	 * query: reduced motion gets the same card with a still top edge, and the
	 * cursor in the preview stops blinking on StreamingText's own terms.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-artifact-sweep::after {
			animation: ft-artifact-sweep var(--ft-artifact-sweep-duration, 1.9s) linear infinite;
		}

		/* 45% of the card wide, so 240% of itself is one full pass and a short beat. */
		@keyframes ft-artifact-sweep {
			from {
				transform: translateX(-110%);
			}
			to {
				transform: translateX(240%);
			}
		}
	}
</style>
