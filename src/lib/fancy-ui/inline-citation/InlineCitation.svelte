<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SourceData } from "../_internals/ai-types.js";

	/**
	 * Props for InlineCitation
	 */
	export interface InlineCitationProps {
		/** The document being cited. Its title, domain and snippet fill the preview. */
		source: SourceData;
		/** The reference number shown in the marker, e.g. `3` renders `[3]` */
		index: number;
		/** Link target. Defaults to `source.url`; pass `""` to render an unlinked marker. */
		href?: string;
		/** Replaces the default preview card body. Receives the source. */
		preview?: Snippet<[SourceData]>;
		/** Called each time the preview is shown, once per appearance */
		onOpen?: () => void;
		/** Additional CSS classes */
		class?: string;
		/** Element reference to the marker */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { float } from "../_internals/float.js";
	import { sanitizeHref } from "../_internals/markdown.js";
	import SourceCard from "../sources/SourceCard.svelte";

	let {
		source,
		index,
		href,
		preview,
		onOpen,
		class: className,
		ref = $bindable(null),
	}: InlineCitationProps = $props();

	/** How long the pointer must rest on the marker before the card appears. */
	const OPEN_DELAY_MS = 150;
	/** How long the card survives after the pointer leaves, so it can be walked into. */
	const CLOSE_GRACE_MS = 250;

	const uid = $props.id();
	const previewId = `${uid}-preview`;

	// An explicit `""` is the opt-out, which is why this is `??` and not `||`:
	// only an omitted prop falls through to the source's own URL. Whatever it
	// ends up being clears the same scheme check every link in this family runs
	// through, since a url on a source is as model-supplied as the prose around it.
	const resolvedHref = $derived(sanitizeHref(href ?? source.url ?? "") ?? "");
	const isLink = $derived(resolvedHref !== "");

	let open = $state(false);
	// Plain lets: the timers must not wake anything that writes them.
	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function cancelOpen() {
		if (openTimer === undefined) return;
		clearTimeout(openTimer);
		openTimer = undefined;
	}

	function cancelClose() {
		if (closeTimer === undefined) return;
		clearTimeout(closeTimer);
		closeTimer = undefined;
	}

	function show() {
		cancelOpen();
		cancelClose();
		// `onOpen` reports appearances, not intentions: a card already on screen
		// has nothing new to announce.
		if (open) return;
		open = true;
		onOpen?.();
	}

	function hide() {
		cancelOpen();
		cancelClose();
		open = false;
	}

	function scheduleShow() {
		// A pointer that comes back during the grace window keeps the card it
		// already has rather than starting the open delay over.
		cancelClose();
		if (open || openTimer !== undefined) return;
		openTimer = setTimeout(() => {
			openTimer = undefined;
			show();
		}, OPEN_DELAY_MS);
	}

	function scheduleHide() {
		cancelOpen();
		if (!open || closeTimer !== undefined) return;
		closeTimer = setTimeout(() => {
			closeTimer = undefined;
			hide();
		}, CLOSE_GRACE_MS);
	}

	// Escape is bound to the window rather than the marker so it also dismisses a
	// card that was opened by hover, when nothing on the page holds focus.
	$effect(() => {
		if (!open) return;
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") hide();
		};
		window.addEventListener("keydown", onKeydown);
		return () => window.removeEventListener("keydown", onKeydown);
	});

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	$effect(() => () => {
		cancelOpen();
		cancelClose();
	});

	// The superscript is done in the scoped stylesheet rather than with utilities:
	// its font size, line height and lift are one setting, and splitting them
	// across two files is how a marker ends up taller than the line it sits on.
	const markerClass = $derived(
		cn(
			"ft-citation-marker inline-flex cursor-pointer items-center rounded px-[0.2em] font-medium tabular-nums no-underline transition-colors focus-visible:ring-1 focus-visible:outline-none",
			className
		)
	);

	// The card is a SourceCard, which already carries a border, a surface and its
	// own padding. Wrapping that in a second bordered, padded box would draw a card
	// inside a card, so the chrome here is only put back for a body we do not
	// control.
	const previewClass = $derived(
		cn(
			"ft-citation-preview text-popover-foreground z-50 block rounded-lg text-left text-sm shadow-lg",
			preview && "border p-3"
		)
	);

	// The marker's text is a bare number; on its own it names nothing, so the
	// title rides along as the accessible name and the card stays supplementary.
	const markerLabel = $derived(`Source ${index}: ${source.title}`);
</script>

<!--
	The marker block and the card block below are joined tag-to-tag on purpose. A
	newline between `{/if}` and `{#if open}` compiles to a whitespace text node,
	and that node lands between the marker and whatever the sentence does next —
	which is how `read[3].` becomes `read[3] .` in every sentence ending on a
	citation. The test named for it is the guard; keep them touching.
-->
{#if isLink}
	<a
		bind:this={ref}
		href={resolvedHref}
		target="_blank"
		rel="noopener noreferrer nofollow ugc"
		class={markerClass}
		aria-label={markerLabel}
		aria-describedby={open ? previewId : undefined}
		onmouseenter={scheduleShow}
		onmouseleave={scheduleHide}
		onfocus={show}
		onblur={hide}
	>
		[{index}]
	</a>
{:else}
	<button
		bind:this={ref}
		type="button"
		class={markerClass}
		aria-label={markerLabel}
		aria-describedby={open ? previewId : undefined}
		onmouseenter={scheduleShow}
		onmouseleave={scheduleHide}
		onfocus={show}
		onblur={hide}
		onclick={show}
	>
		[{index}]
	</button>
{/if}{#if open}
	<!--
		Rendered only while it is on screen: a tooltip that lives in the DOM
		permanently is a hidden paragraph every crawler and every screen-reader
		element list has to step over, mid-sentence, once per citation.

		The anchor is read through a getter so the action re-measures the marker on
		every scroll and resize tick instead of holding a stale element rect.
	-->
	<span
		id={previewId}
		role="tooltip"
		class={previewClass}
		use:float={{
			anchor: () => ref?.getBoundingClientRect() ?? null,
			placement: "top",
			offset: 8,
		}}
		onmouseenter={cancelClose}
		onmouseleave={scheduleHide}
	>
		{#if preview}
			{@render preview(source)}
		{:else}
			<!--
				The same card the sources list shows, so a document a reader met in one
				place is recognisable in the other and there is one set of rules for
				deriving its host and its monogram — but in its plain, non-anchor shape:
				this preview is dismissed on blur, so a link inside it is one no keyboard
				can ever reach. The marker itself is already that link. A consumer's own
				`preview` snippet is theirs to compose and is left alone.
			-->
			<SourceCard {source} interactive={false} />
		{/if}
	</span>
{/if}

<style>
	/*
	 * Both surfaces read their variables at the point of use with a fallback
	 * rather than declaring them on a root, so a value set anywhere up the tree —
	 * a wrapper's `style`, a theme class, `:root` — wins without having to
	 * out-specify these scoped rules.
	 */
	/*
	 * A hand-made superscript, because `vertical-align: super` is not one: it lifts
	 * the box without shrinking the line it belongs to, so a marker inheriting the
	 * prose line-height stretches the line box it sits in and leaves the paragraph
	 * with uneven leading — wider gaps under exactly the lines that carry a
	 * citation. Here the box is `0.75em × 1`, comfortably shorter than any line
	 * height it lands in, and the lift is a relative offset, which moves the paint
	 * without touching layout at all.
	 */
	.ft-citation-marker {
		position: relative;
		top: -0.35em;
		vertical-align: baseline;
		font-size: 0.75em;
		line-height: 1;
		color: var(--ft-citation-fg, var(--color-primary, currentColor));
	}

	/*
	 * The pill is mixed from `currentColor`, so retinting the marker retints its
	 * hover state with it and the two can never drift apart.
	 */
	.ft-citation-marker:hover,
	.ft-citation-marker:focus-visible {
		background: var(--ft-citation-bg, color-mix(in oklab, currentColor 14%, transparent));
	}

	.ft-citation-preview {
		width: var(--ft-citation-preview-width, 16rem);
		max-width: calc(100vw - 1rem);
		background: var(--ft-citation-preview-bg, var(--color-popover, canvas));
		border-color: var(--ft-citation-preview-border, var(--color-border, currentColor));
	}

	/*
	 * The entrance lives entirely inside `no-preference`, so reduced motion is not
	 * a degraded variant to keep in sync: the card simply appears, already placed.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-citation-preview {
			animation: ft-citation-in 140ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	@keyframes ft-citation-in {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
