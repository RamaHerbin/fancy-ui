<script lang="ts">
	import { Input } from "$lib/fancy-ui/input";
</script>

<div class="flex w-full max-w-sm flex-col gap-3">
	<Input placeholder="Placeholder…" label="Resting" />
	<Input placeholder="Click or tab to me" label="Focus" />
	<Input value="ab" invalid label="Error" />
	<Input value="Disabled" disabled label="Disabled" />
</div>
