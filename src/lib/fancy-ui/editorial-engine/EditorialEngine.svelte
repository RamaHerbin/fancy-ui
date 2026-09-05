<script lang="ts" module>
	/**
	 * Props for EditorialEngine
	 *
	 * Live magazine layout: multi-column text flow with cursor handoff,
	 * auto-fitted headline, drop cap, pullquotes, and body text reflowing in
	 * real time around draggable animated orbs. All line breaking is computed
	 * by @chenglou/pretext — the render loop performs zero DOM reads.
	 *
	 * Inspired by the pretext "editorial engine" demo
	 * (https://chenglou.me/pretext/editorial-engine/).
	 */
	export interface EditorialEngineProps {
		/** Headline, auto-sized to the widest font that breaks no word */
		headline?: string;
		/** Body copy (plain text, paragraphs separated by blank lines) */
		body?: string;
		/** Up to two pullquotes embedded in the columns */
		pullquotes?: string[];
		/** Font family stack used for all text */
		fontFamily?: string;
		/** Additional CSS classes for the stage */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { createEditorialEngine } from "./engine.js";

	const DEFAULT_HEADLINE = "TEXT THAT FLOWS AROUND ANYTHING";

	const DEFAULT_BODY = `Print designers have flowed text around images, illustrations, and odd-shaped figures for more than a century. The web never caught up. CSS gives us float, and more recently shape-outside, but both only push text away from one side of one static box. Flowing text through multiple columns, around several moving obstacles at once, filling the gaps on both sides — the browser has no answer for that.

The reason is not a lack of imagination. It is the cost of asking. Every question about text — how wide is this word, where does this line break, how tall is this paragraph — must go through the browser's layout engine, and the layout engine answers by reflowing the document. Ask too often and the interface stutters. So we learned not to ask, and our text stayed in rigid rectangles.

This page asks hundreds of times per frame. Every line of text you are reading was positioned by arithmetic, not by the browser. The pretext library measured every word once, up front, against a canvas font engine. After that, layout is pure math: given a width, it returns line breaks, line widths, and a cursor pointing at exactly where the text stopped.

That cursor is what makes columns work. The first column consumes text until it runs out of vertical space, then hands its cursor to the second column, which continues mid-sentence without duplication or gaps. Newspapers have done this on paper forever; on the web it has always required hidden elements and fragile content splitting.

The orbs drifting across the page are obstacles, not decoration. Each frame, the engine intersects every text line's vertical band with every orb, subtracts the blocked intervals from the column width, and fills every remaining slot — text flows on both sides of an orb at once, something shape-outside cannot express at all.

Drag an orb and the paragraphs part around it in real time. Click one and it pauses. Resize the window and the headline re-fits itself, searching for the largest font size that breaks no word across lines — a binary search that costs microseconds because each probe is arithmetic, not reflow.

The drop cap at the top of this article is another obstacle: a rectangle carved out of the first column's first three lines. The pullquotes are the same trick at a larger scale. Everything you see is one mechanism — carve the blocked intervals out of each line's band, lay out text in whatever space remains.

When the engine finishes a frame, it writes positions and text content to a pool of absolutely positioned elements, and nothing else. The browser never computes layout for this page's body text, because every coordinate is already known. A full reflow of every line around five moving obstacles typically costs a fraction of a millisecond.

Cheap text measurement changes what interfaces can be. Virtualized lists can know every item's exact height before rendering it. Chat bubbles can shrink-wrap to their tightest width. Labels can dodge chart elements as you zoom. Documents can flow around widgets that other people are dragging in real time.

None of this needs a new browser API or a standards process. It needs cached font metrics, a line breaker, and the willingness to stop asking the DOM questions it answers slowly. The text on this page stopped asking. And so it flows.`;

	const DEFAULT_PULLQUOTES = [
		"“Text flows on both sides of a moving obstacle at once — something shape-outside cannot express at all.”",
		"“Every coordinate is already known. The browser never computes layout for this text.”",
	];

	const DEFAULT_FONT_FAMILY =
		'"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';

	let {
		headline = DEFAULT_HEADLINE,
		body = DEFAULT_BODY,
		pullquotes = DEFAULT_PULLQUOTES,
		fontFamily = DEFAULT_FONT_FAMILY,
		class: className,
	}: EditorialEngineProps = $props();

	// The engine owns this layer exclusively (it calls `replaceChildren()` on
	// teardown), which is why the accessible fallback is a sibling of it and
	// not a child of the element the engine writes into.
	let layerRef: HTMLDivElement;
	let ready = $state(false);

	// Re-created whenever the text props change, so the prepared measurements
	// always match the rendered content. Effects never run during SSR.
	$effect(() => {
		const options = { headline, body, pullquotes, fontFamily };
		let destroy: (() => void) | null = null;
		let cancelled = false;

		// pretext measures against the canvas font engine — fonts must be
		// loaded first or widths come from the fallback font.
		document.fonts.ready.then(() => {
			if (cancelled) return;
			destroy = createEditorialEngine(layerRef, options);
			ready = true;
		});

		return () => {
			cancelled = true;
			destroy?.();
		};
	});
</script>

<div class={cn("ee-stage", className)} style:font-family={fontFamily} class:ready>
	<!--
		The accessible document, and the SSR / pre-engine fallback: visible until
		the engine is ready, then visually hidden but never unmounted. The
		positioned-line layer below is one span per visual line, with no heading
		and no paragraph boundaries, so this stays the only accessible copy.
	-->
	<div class="ee-fallback" class:ee-sr-only={ready}>
		<h2>{headline}</h2>
		<p>{body}</p>
	</div>
	<div bind:this={layerRef} class="ee-layer" aria-hidden="true"></div>
</div>

<style>
	.ee-stage {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: radial-gradient(ellipse at 50% 40%, #0f0f14 0%, #0a0a0c 100%);
		color: #e8e4dc;
		touch-action: none;
	}

	.ee-layer {
		position: absolute;
		inset: 0;
		touch-action: none;
	}

	.ee-fallback {
		position: absolute;
		inset: 0;
		padding: 48px;
		overflow: hidden;
		opacity: 0.4;
		font-size: 14px;
	}

	/* Visually hidden, still exposed to assistive tech. Scoped rather than the
	   Tailwind `sr-only` utility because `.ee-fallback` above outranks it on
	   specificity and would re-inflate the box. */
	.ee-fallback.ee-sr-only {
		inset: auto;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.ee-stage :global(.ee-line) {
		position: absolute;
		white-space: pre;
		z-index: 1;
		color: #e8e4dc;
		user-select: text;
		-webkit-user-select: text;
	}

	.ee-stage :global(.ee-headline-line) {
		position: absolute;
		white-space: pre;
		font-weight: 700;
		color: #fff;
		letter-spacing: -0.5px;
		z-index: 2;
		user-select: text;
		-webkit-user-select: text;
	}

	.ee-stage :global(.ee-drop-cap) {
		position: absolute;
		pointer-events: none;
		z-index: 2;
		font-weight: 700;
		color: #c4a35a;
	}

	.ee-stage :global(.ee-orb) {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 10;
		will-change: transform;
	}

	.ee-stage :global(.ee-pullquote-box) {
		position: absolute;
		pointer-events: none;
		z-index: 3;
		border-left: 3px solid #6b5a3d;
		padding-left: 14px;
	}

	.ee-stage :global(.ee-pullquote-line) {
		position: absolute;
		white-space: pre;
		font-style: italic;
		color: #b8a070;
		user-select: text;
		-webkit-user-select: text;
	}
</style>
