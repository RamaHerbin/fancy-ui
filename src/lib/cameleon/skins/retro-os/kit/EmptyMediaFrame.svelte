<script lang="ts" module>
	export interface EmptyMediaFrameProps {
		/** the Silkscreen label */
		label: string;
		/** decorative glyph in the icon box — a prop, never content */
		glyph?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { label, glyph = "⏳", class: className }: EmptyMediaFrameProps = $props();
</script>

<!--
	The "no demo yet" stand-in that takes a VideoFrame's place. Dashed border =
	the retro language's "not real content" marker, same as the NDA badge on
	the home work card.
-->
<div class={cn("r-empty", className)}>
	<span class="r-border r-empty-icon" aria-hidden="true">{glyph}</span>
	<span class="r-pixel r-empty-label">{label}</span>
</div>

<style>
	.r-empty {
		display: flex;
		min-height: 200px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 2px dashed var(--r-ink);
		background: var(--r-tint-gold);
		padding: 16px;
		text-align: center;
	}

	.r-empty-icon {
		display: inline-flex;
		width: 38px;
		height: 38px;
		flex: none;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		background: var(--r-paper);
		font-size: 14px;
	}

	.r-empty-label {
		font-size: 10px;
	}
</style>
