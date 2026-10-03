<!--
	PreviewCard — the home page's poster card: one reference, its poster, who
	made it, which frameworks ship it and a save toggle. Posters only; the live
	demo belongs to the Inspiration gallery.

	The title link is stretched over the whole card; the save button sits above
	it as a sibling, so nothing interactive is nested in the link.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { RimLight } from "$lib/components/site/materials/index.js";
	import { KNOWN_IDS, posterFor } from "$lib/inspiration/catalog.js";
	import { FRAMEWORK_LABELS, type Framework, type Reference } from "$lib/inspiration/types.js";
	import { createSavedState } from "$lib/stores/saved.svelte.js";

	interface Props {
		entry: Reference;
		/** Frameworks with a port of the reference's library component. */
		frameworks?: readonly Framework[];
		/** Position in the grid: seeds the rim. */
		index?: number;
		paused?: boolean;
		/** Load the poster right away (first row: it is the largest paint). */
		eager?: boolean;
		/** Fetch the poster ahead of other images (the very first card only). */
		priority?: boolean;
	}

	let {
		entry,
		frameworks = [],
		index = 0,
		paused = false,
		eager = false,
		priority = false,
	}: Props = $props();

	const ORDER: Framework[] = ["react", "svelte", "vue"];

	const saved = createSavedState(KNOWN_IDS);
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const poster = $derived(posterFor(entry));
	const origin = $derived(
		entry.origin === "fancyui"
			? "FANCYUI"
			: entry.codeAvailability === "open-source"
				? "COMMUNITY"
				: "EXTERNAL"
	);
	const byline = $derived(
		entry.product && entry.product !== entry.creator
			? `${entry.creator} · ${entry.product}`
			: entry.creator
	);
	const tags = $derived([...entry.styleTags, ...entry.interactionTags].slice(0, 2));
	const shipped = $derived(ORDER.filter((fw) => frameworks.includes(fw)));
	const isSaved = $derived(mounted && saved.ids.has(entry.id));

	let active = $state(false);
	let angle = $state<number | undefined>();

	function pointerAngle(event: PointerEvent): number {
		const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const dx = event.clientX - (r.left + r.width / 2);
		const dy = event.clientY - (r.top + r.height / 2);
		return (Math.atan2(dx, -dy) * 180) / Math.PI;
	}
</script>

<article
	class="card"
	data-preview-card
	onpointerenter={(e) => {
		active = true;
		angle = pointerAngle(e);
	}}
	onpointermove={(e) => (angle = pointerAngle(e))}
	onpointerleave={() => (active = false)}
	onfocusin={() => (active = true)}
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) active = false;
	}}
>
	<div class="stage">
		{#if poster}
			<img
				src={poster.src}
				width={poster.width}
				height={poster.height}
				alt={poster.alt}
				loading={eager ? "eager" : "lazy"}
				fetchpriority={priority ? "high" : undefined}
				decoding="async"
			/>
		{:else}
			<div class="blank"><span>{entry.title}</span></div>
		{/if}
		<span class="origin fx-mono">{origin}</span>
		<button
			type="button"
			class="save"
			aria-pressed={mounted ? isSaved : undefined}
			aria-label="Save {entry.title}"
			onclick={() => saved.toggleSaved(entry.id)}
		>
			<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
				<path
					d="M4 2.5h8v11l-4-2.8-4 2.8z"
					fill={isSaved ? "currentColor" : "none"}
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>
	<div class="meta">
		<h3><a href="/inspiration/{entry.slug}" class="stretched">{entry.title}</a></h3>
		<p class="byline">{byline}</p>
		<div class="badges">
			<span class="fws fx-mono">
				<span class="sr-only"
					>{shipped.length
						? `Ships for ${shipped.map((fw) => FRAMEWORK_LABELS[fw]).join(", ")}`
						: "No library port"}</span
				>
				{#each ORDER as fw (fw)}
					<span class="fw" aria-hidden="true" class:off={!frameworks.includes(fw)}
						>{FRAMEWORK_LABELS[fw][0]}</span
					>
				{/each}
			</span>
			<span class="tags">
				{#each tags as tag (tag)}<span>#{tag}</span>{/each}
			</span>
		</div>
	</div>
	<RimLight tier="card" seed={index} {active} {angle} {paused} />
</article>

<style>
	.card {
		position: relative;
		padding: 8px;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.stage {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		background: var(--fx-canvas);
	}

	.stage img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.blank {
		display: grid;
		place-items: center;
		height: 100%;
		padding: 24px;
		background: var(--fx-card-raised);
		font-size: 15px;
		font-weight: 600;
		text-align: center;
		color: var(--fx-ink-2);
	}

	.origin {
		position: absolute;
		top: 10px;
		left: 10px;
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 7px;
		border-radius: 6px;
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--fx-ink);
		background: rgb(9 9 11 / 0.6);
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.35);
		backdrop-filter: blur(8px);
	}

	.save {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		color: var(--fx-ink);
		background: rgb(9 9 11 / 0.55);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		backdrop-filter: blur(8px);
		cursor: pointer;
		opacity: 0;
		transition: opacity 180ms var(--fx-ease);
	}

	.card:hover .save,
	.card:focus-within .save,
	.save[aria-pressed="true"] {
		opacity: 1;
	}

	@media (hover: none) {
		.save {
			opacity: 1;
		}
	}

	/* A finger needs a 40 px target. */
	@media (pointer: coarse) {
		.save {
			top: 6px;
			right: 6px;
			width: 40px;
			height: 40px;
		}
	}

	.meta {
		padding: 12px 6px 4px;
	}

	h3 {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
	}

	.stretched::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 16px;
	}

	.stretched:focus-visible {
		outline: none;
	}

	.card:has(.stretched:focus-visible) {
		outline: 1px solid var(--fx-ink);
		outline-offset: 2px;
	}

	.byline {
		margin-top: 2px;
		font-size: 13px;
		line-height: 18px;
		color: var(--fx-ink-3);
	}

	.badges {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 10px;
	}

	.fws {
		display: flex;
		gap: 4px;
	}

	.fws .fw {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 5px;
		font-size: 10px;
		color: var(--fx-ink-2);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.fws .fw.off {
		color: var(--fx-ink-3);
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.05);
	}

	.tags {
		display: flex;
		gap: 10px;
		font-size: 12px;
		color: var(--fx-ink-3);
	}
</style>
