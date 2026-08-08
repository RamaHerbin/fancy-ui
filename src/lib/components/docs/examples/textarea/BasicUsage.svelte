<script lang="ts">
	import { Textarea } from "$lib/fancy-ui/textarea";

	let message = $state("");
</script>

<div class="w-full max-w-sm">
	<Textarea bind:value={message} placeholder="A multi-line message…" label="Message" />
</div>
