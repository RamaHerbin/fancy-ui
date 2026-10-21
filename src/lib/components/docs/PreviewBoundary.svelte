<script lang="ts">
	import type { Snippet } from "svelte";
	import PreviewError from "./PreviewError.svelte";

	interface Props {
		/** Names the demo in the console message (a slug or an example path). */
		source: string;
		children: Snippet;
	}

	let { source, children }: Props = $props();

	// A demo that throws while rendering must neither take the page down with it nor fail
	// quietly: the frame shows the error state and the real error reaches the console.
	function report(error: unknown) {
		console.error(`[docs] preview "${source}" failed to render`, error);
	}
</script>

<svelte:boundary onerror={report}>
	{@render children()}

	{#snippet failed()}
		<PreviewError kind="render" />
	{/snippet}
</svelte:boundary>
