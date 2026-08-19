<script lang="ts">
	import { AlertDialog } from "$lib/fancy-ui/alert-dialog";
	import { Button } from "$lib/fancy-ui/button";
</script>

<!--
	Not every AlertDialog guards a delete — any consequential, hard-to-undo
	action fits: signing out everywhere ends every other session immediately,
	with no confirmation-proof undo once it runs.
-->
{#snippet trigger()}
	<Button variant="outline">Sign out everywhere</Button>
{/snippet}

<AlertDialog
	{trigger}
	title="Sign out of all devices?"
	description="Every other session, on every device, ends immediately."
	confirmLabel="Sign out"
	cancelLabel="Stay signed in"
/>
