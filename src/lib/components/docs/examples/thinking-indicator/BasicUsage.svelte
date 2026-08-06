<script lang="ts">
	import { ThinkingIndicator } from "$lib/fancy-ui/thinking-indicator";

	// Both live rows started when this example mounted, so their timers climb
	// from zero while you read the page.
	const startedAt = Date.now();
</script>

<div class="flex w-full flex-col items-start gap-6">
	<ThinkingIndicator status="Reading files" since={startedAt} />

	<ThinkingIndicator variant="pill" status="Searching the web" since={startedAt - 8000} />

	<!-- Finished: the shimmer stops and the `done` snippet takes over the label. -->
	<ThinkingIndicator status="Reading files" running={false} showElapsed={false}>
		{#snippet done()}
			Thought for 12s
		{/snippet}
	</ThinkingIndicator>
</div>
