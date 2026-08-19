<script lang="ts">
	import { Textarea } from "$lib/fancy-ui/textarea";

	let message = $state("A multi-line message with resizing…");
</script>

<div class="w-full max-w-sm">
	<Textarea bind:value={message} maxlength={500} showCount label="Message" />
</div>
