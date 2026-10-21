<script lang="ts">
	import { EGG_OVERLAY_Z } from "./types.js";

	let { title }: { title: string } = $props();
</script>

<!-- Static on purpose: this is what reduced motion shows instead of a payload.
     Spoken by the host's live region, so hidden from assistive tech here. -->
<div
	data-egg-note
	aria-hidden="true"
	class="bg-popover text-popover-foreground border-border pointer-events-none fixed bottom-6 left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-lg"
	style="z-index: {EGG_OVERLAY_Z}"
>
	✦ {title} — found. Motion is paused, so that's all you'll see.
</div>
