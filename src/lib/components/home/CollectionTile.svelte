<!--
	CollectionTile — one editorial collection: a short stack of its posters,
	the title, the blurb and how many references it holds. The whole tile is
	a single link into the gallery, pre-filtered.
-->
<script lang="ts">
	import { posterFor, type CollectionSummary } from "$lib/inspiration/catalog.js";
	import { COLLECTION_META } from "$lib/inspiration/types.js";

	interface Props {
		collection: CollectionSummary;
	}

	let { collection }: Props = $props();

	const meta = $derived(COLLECTION_META[collection.id]);
	const posters = $derived(
		collection.sample
			.map((entry) => posterFor(entry))
			.filter((poster) => poster !== null)
			.slice(0, 3)
	);
</script>

<a href="/inspiration?collection={collection.id}" class="tile">
	<span class="stack" aria-hidden="true">
		{#each posters as poster, i (poster.src)}
			<img
				src={poster.src}
				width={poster.width}
				height={poster.height}
				alt=""
				loading="lazy"
				decoding="async"
				style:--i={i}
			/>
		{/each}
	</span>
	<span class="text">
		<span class="title">{meta.title}</span>
		<span class="blurb">{meta.blurb}</span>
		<span class="count fx-mono"
			>{collection.count} {collection.count === 1 ? "reference" : "references"}</span
		>
	</span>
</a>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 8px;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		transition: box-shadow 180ms var(--fx-ease);
	}

	.tile:hover {
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.tile:focus-visible {
		outline: 1px solid var(--fx-ink);
		outline-offset: 2px;
	}

	/* Three posters fanned back to front; the front one is the collection's
	   first pick. */
	.stack {
		position: relative;
		display: block;
		height: 168px;
		border-radius: 12px;
		overflow: hidden;
		background: var(--fx-canvas);
	}

	.stack img {
		position: absolute;
		left: calc(18px + var(--i) * 46px);
		top: calc(36px - var(--i) * 12px);
		width: 58%;
		height: auto;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: 8px;
		box-shadow:
			0 0 0 1px var(--fx-hairline-strong),
			0 12px 28px rgb(0 0 0 / 0.55);
		z-index: calc(3 - var(--i));
		transition: transform 260ms var(--fx-ease);
	}

	.tile:hover .stack img {
		transform: translateY(calc(var(--i) * -4px - 2px));
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 6px 6px;
	}

	.title {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
	}

	.blurb {
		font-size: 13px;
		line-height: 18px;
		color: var(--fx-ink-3);
	}

	.count {
		margin-top: 8px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}
</style>
