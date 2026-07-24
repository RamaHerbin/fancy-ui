<script lang="ts">
	// Retro ← → nav arrows for a horizontal-scroll carousel preview. Docs-only:
	// it scrolls the given container (found by the caller) and never touches the
	// published component. Rendered only under the retro-os skin. Styling lives in
	// docs-skin.css under .retro-carousel-nav.
	interface Props {
		/** Resolves the scrollable carousel track at click time. */
		target: () => HTMLElement | null;
	}

	let { target }: Props = $props();

	function scroll(dir: -1 | 1) {
		const el = target();
		if (!el) return;
		const card = el.querySelector<HTMLElement>(".snap-start");
		const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
		el.scrollBy({ left: dir * step, behavior: "smooth" });
	}
</script>

<div class="retro-carousel-nav">
	<button type="button" aria-label="Previous" onclick={() => scroll(-1)}>←</button>
	<button type="button" aria-label="Next" onclick={() => scroll(1)}>→</button>
</div>
