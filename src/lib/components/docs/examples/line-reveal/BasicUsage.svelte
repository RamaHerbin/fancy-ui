<script lang="ts">
	import { LineReveal } from "$lib/fancy-ui/line-reveal";
</script>

<div class="resize-x overflow-auto rounded border border-dashed p-4" style="max-width: 100%">
	<LineReveal
		text="Text measurement and layout, without touching the DOM. Every line you see here was computed by pretext and revealed one by one."
		font="700 32px system-ui, sans-serif"
	/>
	<p class="text-muted-foreground mt-3 text-xs">
		Drag the resize handle — lines re-wrap instantly without replaying the animation.
	</p>
</div>
