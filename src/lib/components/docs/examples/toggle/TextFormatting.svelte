<script lang="ts">
	import { Toggle } from "$lib/fancy-ui/toggle";

	let bold = $state(false);
	let italic = $state(true);
	let underline = $state(false);
</script>

<div class="flex flex-col gap-3">
	<div class="flex gap-2">
		<Toggle sound bind:pressed={bold} label="Bold">
			<strong>B</strong>
		</Toggle>
		<Toggle sound bind:pressed={italic} label="Italic">
			<em>I</em>
		</Toggle>
		<Toggle sound bind:pressed={underline} label="Underline">
			<span class="underline">U</span>
		</Toggle>
	</div>

	<p class="text-sm" class:font-bold={bold} class:italic class:underline>
		Toggle the marks above to preview how this sentence would look.
	</p>
</div>
