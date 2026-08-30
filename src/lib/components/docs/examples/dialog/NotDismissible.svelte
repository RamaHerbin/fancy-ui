<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
</script>

{#snippet trigger()}
	<Button variant="outline">Start setup</Button>
{/snippet}

<!--
	dismissible={false} turns off Escape and outside click — for a step that
	should not be lost to a stray click. The ✕ button is unaffected: it is
	an explicit action, not the accidental dismiss this prop guards against,
	so it stays the one deliberate way out.
-->
<Dialog
	sound
	bind:open
	{trigger}
	dismissible={false}
	title="Finish setting up your workspace"
	description="This only takes a moment. Escape and clicking outside are disabled here — use the buttons below or the close icon."
>
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Done</Button>
	{/snippet}
</Dialog>
