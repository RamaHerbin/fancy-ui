<script lang="ts" module>
	export interface PlayBadgeProps {
		/** 44 = ProductionRow thumbnails (3px shadow), 60 = the full demo (4px) */
		size?: 44 | 60;
	}
</script>

<script lang="ts">
	let { size = 44 }: PlayBadgeProps = $props();

	const shadow = $derived(size === 60 ? 4 : 3);
	const glyph = $derived(size === 60 ? 20 : 15);
</script>

<!--
	The paper play box that sits dead-centre on a video stage. It is pure
	decoration: the whole stage is the real control (see VideoFrame), so this
	carries no role and is hidden from assistive tech.
-->
<span
	class="r-play"
	aria-hidden="true"
	style="--r-play-size:{size}px;--r-play-shadow:{shadow}px;--r-play-glyph:{glyph}px">▶</span
>

<style>
	.r-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: inline-flex;
		width: var(--r-play-size);
		height: var(--r-play-size);
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		border: 2px solid var(--r-ink);
		background: var(--r-paper);
		box-shadow: var(--r-play-shadow) var(--r-play-shadow) 0 var(--r-ink);
		color: var(--r-ink);
		font-size: var(--r-play-glyph);
		/* nudge the optical centre of ▶ back onto the box centre */
		padding-left: 2px;
	}
</style>
