<script lang="ts">
	// Snippets (`trigger`) and callbacks (`onOpenChange`) are written in the
	// wrapper: .astro can pass the default slot as `children`, nothing else.
	import { Button, Dialog } from "fancy-ui-svelte";
	import { trackLifecycle } from "./lifecycle";

	let open = $state(false);
	let events = $state<boolean[]>([]);

	trackLifecycle("dialog");
</script>

<Dialog
	bind:open
	onOpenChange={(next) => events.push(next)}
	title="Hello from an island"
	description="Trigger snippet and callback live in DialogIsland.svelte."
>
	{#snippet trigger()}
		<Button variant="outline">Open dialog</Button>
	{/snippet}
	<p>Dialog body</p>
</Dialog>
<span data-testid="dialog-events">dialog events: {events.join(",") || "none"}</span>
