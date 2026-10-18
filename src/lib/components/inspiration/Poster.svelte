<!--
	A reference's still: the captured or supplied poster with its intrinsic
	size (no layout shift), or a neutral tile when there is none yet — never
	initials or a placeholder logo.
-->
<script lang="ts">
	interface Props {
		poster: { src: string; width: number; height: number; alt: string } | null;
		/** Decorative when the title is already next to it (cards). */
		decorative?: boolean;
		eager?: boolean;
	}

	let { poster, decorative = false, eager = false }: Props = $props();
</script>

{#if poster}
	<img
		class="poster"
		src={poster.src}
		width={poster.width}
		height={poster.height}
		alt={decorative ? "" : poster.alt}
		loading={eager ? "eager" : "lazy"}
		decoding="async"
	/>
{:else}
	<span class="poster tile" aria-hidden="true"></span>
{/if}

<style>
	.poster {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.tile {
		background:
			radial-gradient(120% 90% at 30% 20%, rgb(255 255 255 / 0.035), transparent 60%),
			var(--fx-card-raised, #15151a);
	}
</style>
