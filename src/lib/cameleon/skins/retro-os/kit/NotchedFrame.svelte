<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NotchedFrameProps {
		/** drop-shadow offset in px — 5 = hero (grammar B), 4 = tighter nested use */
		shadow?: 4 | 5;
		/** extra classes for the PAPER layer (the one that wraps `children`) */
		class?: string;
		children: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { shadow = 5, class: className, children }: NotchedFrameProps = $props();
</script>

<!--
	Grammar B — the notched "chamfered pixel corner" frame (hero + case heroes).

	Three nested layers, and all three are load-bearing:

	  1. carrier   `filter: drop-shadow(Npx Npx 0 ink)`. A `box-shadow` here would
	               draw the UNCLIPPED rectangle and the notches would be ghosted by
	               a square shadow, so the hard offset shadow has to be a
	               drop-shadow following the alpha silhouette of the clipped stack.
	  2. ink slab  2.5px of ink showing through as the "border" — a real `border`
	               cannot follow a clip-path, so the border is a painted padding.
	  3. paper     the same polygon again, inset by the slab's padding.

	THE POLYGON IS DECLARED ONCE, here, as `--r-notch` on the carrier, and inherited
	by both clipped layers. It is the single source of truth for the notch shape in
	the whole retro-os kit (copied verbatim from the reference portfolio
	implementation): 8px chamfer with a 4px stair step on every corner. Never
	re-type it elsewhere — import this component instead.
-->
<div class="r-notched" style="--r-notch-shadow: {shadow}px">
	<div class="r-notched-ink">
		<div class={cn("r-notched-paper", className)}>
			{@render children()}
		</div>
	</div>
</div>

<style>
	.r-notched {
		--r-notch: polygon(
			8px 0,
			calc(100% - 8px) 0,
			calc(100% - 8px) 4px,
			calc(100% - 4px) 4px,
			calc(100% - 4px) 8px,
			100% 8px,
			100% calc(100% - 8px),
			calc(100% - 4px) calc(100% - 8px),
			calc(100% - 4px) calc(100% - 4px),
			calc(100% - 8px) calc(100% - 4px),
			calc(100% - 8px) 100%,
			8px 100%,
			8px calc(100% - 4px),
			4px calc(100% - 4px),
			4px calc(100% - 8px),
			0 calc(100% - 8px),
			0 8px,
			4px 8px,
			4px 4px,
			8px 4px
		);
		filter: drop-shadow(var(--r-notch-shadow) var(--r-notch-shadow) 0 var(--r-ink));
	}

	.r-notched-ink {
		background: var(--r-ink);
		padding: 2.5px;
		clip-path: var(--r-notch);
	}

	.r-notched-paper {
		background: var(--r-paper);
		clip-path: var(--r-notch);
	}
</style>
