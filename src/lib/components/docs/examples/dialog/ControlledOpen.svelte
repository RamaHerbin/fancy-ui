<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";

	// `open` is a plain, non-bound value here — the parent owns the state and
	// only ever learns about changes through `onOpenChange`, the same pattern
	// a caller reaches for when open/close is driven by something other than
	// this exact button (a route change, a keyboard shortcut, a wizard step).
	let isOpen = $state(false);
</script>

<Button onclick={() => (isOpen = true)}>Open dialog</Button>

<Dialog
	sound
	open={isOpen}
	onOpenChange={(next) => (isOpen = next)}
	title="Restart required"
	description="Applying this setting restarts the current session."
>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (isOpen = false)}>Not now</Button>
		<Button onclick={() => (isOpen = false)}>Restart</Button>
	{/snippet}
</Dialog>
