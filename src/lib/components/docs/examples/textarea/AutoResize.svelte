<script lang="ts">
	import { Textarea } from "$lib/fancy-ui/textarea";

	let notes = $state("");
</script>

<div class="w-full max-w-sm">
	<Textarea bind:value={notes} autoResize rows={2} placeholder="Grows as you type…" label="Notes" />
</div>
